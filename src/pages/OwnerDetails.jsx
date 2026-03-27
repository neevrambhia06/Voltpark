import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { uploadAvatar } from '../utils/uploadAvatar'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import {
  Mail, Lock, Shield, User, Briefcase, MapPin,
  Camera, Edit3, Save, X, ChevronRight, Building2,
  Calendar, DollarSign, Bookmark, Layers, ArrowLeft
} from 'lucide-react'

/* ================================================================
   DESIGN TOKENS -- light glassmorphic palette
   ================================================================ */
const T = {
  bg:        '#F4F6FA',
  surface:   'rgba(255,255,255,0.70)',
  glass:     'rgba(255,255,255,0.82)',
  glassBdr:  'rgba(20,184,166,0.12)',
  text:      '#0f172a',
  textMuted: '#64748b',
  textDim:   '#94a3b8',
  accent:    '#14b8a6',
  accentDim: 'rgba(20,184,166,0.10)',
  danger:    '#ef4444',
  success:   '#16a34a',
  amber:     '#f59e0b',
  inputBg:   '#ffffff',
  inputBdr:  '#e2e8f0',
  inputFocus:'rgba(20,184,166,0.30)',
}

const cardStyle = {
  background: T.glass,
  border: `1px solid ${T.glassBdr}`,
  borderRadius: '20px',
  padding: '28px',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: T.textMuted,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: `1.5px solid ${T.inputBdr}`,
  borderRadius: '10px',
  fontSize: '14px',
  color: T.text,
  background: T.inputBg,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.25s, box-shadow 0.25s',
}

const sectionHeading = {
  fontSize: '13px',
  fontWeight: 800,
  color: T.accent,
  margin: '0 0 22px',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontFamily: "'Ferron', sans-serif",
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

/* stagger children animation */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}


/* ================================================================
   COMPONENT
   ================================================================ */
export default function OwnerDetails() {
  const navigate   = useNavigate()
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [editing, setEditing]       = useState(false)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeSlots: 0,
  })

  // Auth/Account states
  const { logout } = useAuth && typeof useAuth === 'function' ? useAuth() : { logout: () => {} }
  const [emailForm, setEmailForm] = useState({ email: '', confirmEmail: '' })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' })
  const [authMessage, setAuthMessage] = useState({ type: '', text: '' })

  const [form, setForm] = useState({
    full_name:     '',
    mobile:        '',
    business_name: '',
    business_type: '',
    city:          '',
    state:         '',
    pincode:       '',
    gst_number:    '',
    bio:           '',
  })

  /* ── Fetch owner profile ── */
  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/owner/login'); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setProfile(data)
        setAvatarPreview(data.avatar_url || null)
        setForm({
          full_name:     data.full_name     || '',
          mobile:        data.mobile        || '',
          business_name: data.business_name || '',
          business_type: data.business_type || '',
          city:          data.city          || '',
          state:         data.state         || '',
          pincode:       data.pincode       || '',
          gst_number:    data.gst_number    || '',
          bio:           data.bio           || '',
        })
      } else {
        setForm(prev => ({
          ...prev,
          full_name: session.user.user_metadata?.full_name ||
                     session.user.user_metadata?.name || '',
          email: session.user.email
        }))
      }

      await fetchStats(session.user.id)
    } catch (err) {
      setError('Failed to load profile.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (ownerId) => {
    try {
      const { count: propCount } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)

      const { data: locations } = await supabase
        .from('locations')
        .select('id, car_available_slots, bike_available_slots, available_slots')
        .eq('owner_id', ownerId)

      const locationIds = locations?.map(l => l.id) || []
      let totalBookings = 0
      let totalRevenue  = 0

      if (locationIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('amount, status')
          .in('location_id', locationIds)

        totalBookings = bookings?.length || 0
        totalRevenue  = bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0
      }

      const activeSlots = locations?.reduce(
        (sum, l) =>
          sum +
          (l.car_available_slots  || 0) +
          (l.bike_available_slots || 0) +
          (l.available_slots      || 0),
        0
      ) || 0

      setStats({ totalProperties: propCount || 0, totalBookings, totalRevenue, activeSlots })
    } catch (err) {
      console.error('Stats error:', err)
    }
  }

  /* ── Handlers ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleEmailChange = (e) => {
    setEmailForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePasswordChange = (e) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleUpdateEmail = async (e) => {
    e.preventDefault()
    if (emailForm.email !== emailForm.confirmEmail) {
      setAuthMessage({ type: 'error', text: 'Emails do not match.' }); return
    }
    setSaving(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ email: emailForm.email })
      if (authError) throw authError
      setAuthMessage({ type: 'success', text: `Confirmation link sent to ${emailForm.email}.` })
      setEmailForm({ email: '', confirmEmail: '' })
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message })
    } finally { setSaving(false) }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setAuthMessage({ type: 'error', text: 'Passwords do not match.' }); return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password })
      if (error) throw error
      setAuthMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordForm({ password: '', confirmPassword: '' })
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message })
    } finally { setSaving(false) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      let avatarUrl = profile?.avatar_url || null
      if (avatarFile) {
        setUploadingAvatar(true)
        avatarUrl = await uploadAvatar(avatarFile, session.user.id)
        setUploadingAvatar(false)
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          role: 'owner',
          joined_at: profile?.joined_at || new Date().toISOString(),
          ...form,
          avatar_url: avatarUrl,
        })
        .eq('id', session.user.id)

      if (error) throw error
      setSuccess('Profile updated successfully.')
      setEditing(false); setAvatarFile(null); fetchProfile()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally { setSaving(false); setUploadingAvatar(false) }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: T.bg,
      }}>
        <div style={{
          width: '36px', height: '36px',
          border: `3px solid ${T.glassBdr}`,
          borderTop: `3px solid ${T.accent}`,
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse 80% 60% at 50% -20%, rgba(20,184,166,0.06), transparent),
        radial-gradient(ellipse 60% 50% at 80% 100%, rgba(20,184,166,0.04), transparent),
        ${T.bg}
      `,
      fontFamily: "'Inter', sans-serif",
    }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '40px 24px 80px',
        }}
      >

        {/* ── PAGE HEADER ── */}
        <motion.div variants={fadeUp} style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '32px',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h1 style={{
              fontSize: '28px', fontWeight: 800,
              color: T.text, margin: 0,
              fontFamily: "'Ferron', sans-serif",
              letterSpacing: '-0.02em',
            }}>
              Owner Profile
            </h1>
            <p style={{ fontSize: '14px', color: T.textMuted, margin: '6px 0 0' }}>
              Manage your personal and business details
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/owner-portal')}
              style={{
                padding: '10px 18px', borderRadius: '12px',
                border: `1.5px solid ${T.glassBdr}`,
                background: 'transparent',
                color: T.textMuted,
                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.25s',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <button
              onClick={() => setEditing(prev => !prev)}
              style={{
                padding: '10px 24px', borderRadius: '12px',
                border: editing ? `1.5px solid ${T.glassBdr}` : 'none',
                background: editing ? 'transparent' : T.accent,
                color: editing ? T.textMuted : '#ffffff',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.25s',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {editing ? <><X size={14} /> Cancel</> : <><Edit3 size={14} /> Edit Profile</>}
            </button>
          </div>
        </motion.div>

        {/* Banners */}
        {success && (
          <motion.div variants={fadeUp} style={{
            padding: '12px 16px', background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px',
            color: T.success, fontSize: '13px', marginBottom: '20px',
          }}>
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div variants={fadeUp} style={{
            padding: '12px 16px', background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px',
            color: T.danger, fontSize: '13px', marginBottom: '20px',
          }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

            {/* ── AVATAR + NAME CARD ── */}
            <motion.div variants={fadeUp} style={cardStyle}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '24px',
                flexWrap: 'wrap',
              }}>
                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    overflow: 'hidden', border: `3px solid ${T.accent}`,
                    background: T.surface,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '34px', fontWeight: 800, color: T.accent,
                    fontFamily: "'Ferron', sans-serif",
                    boxShadow: `0 0 28px rgba(20,184,166,0.18)`,
                  }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                      }} />
                    ) : (
                      (form.full_name?.[0] || profile?.email?.[0] || 'O').toUpperCase()
                    )}
                  </div>
                  {editing && (
                    <button type="button"
                      onClick={() => document.getElementById('avatar-input').click()}
                      style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: T.accent, border: `2px solid ${T.bg}`,
                        color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Camera size={13} />
                    </button>
                  )}
                  <input id="avatar-input" type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange} style={{ display: 'none' }}
                  />
                </div>

                {/* Name + badges */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    flexWrap: 'wrap',
                  }}>
                    <h2 style={{
                      fontSize: '22px', fontWeight: 800, color: T.text,
                      margin: 0, fontFamily: "'Ferron', sans-serif",
                    }}>
                      {profile?.full_name || 'Owner'}
                    </h2>
                    {profile?.is_verified && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '3px 12px',
                        borderRadius: '9999px', background: 'rgba(34,197,94,0.12)',
                        color: T.success, border: '1px solid rgba(34,197,94,0.25)',
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        Verified
                      </span>
                    )}
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 12px',
                      borderRadius: '9999px', background: T.accentDim,
                      color: T.accent, border: `1px solid rgba(20,184,166,0.25)`,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      Owner
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: T.textMuted, margin: '6px 0 0' }}>
                    {profile?.email}
                  </p>
                  <p style={{ fontSize: '11px', color: T.textDim, margin: '4px 0 0' }}>
                    Member since{' '}
                    {profile?.joined_at
                      ? new Date(profile.joined_at).toLocaleDateString('en-IN', {
                          month: 'long', year: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── STATS ROW ── */}
            <motion.div variants={fadeUp} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
            }}>
              {[
                { label: 'Properties', value: stats.totalProperties, icon: Building2, color: T.text },
                { label: 'Total Bookings', value: stats.totalBookings, icon: Bookmark, color: T.accent },
                { label: 'Total Revenue', value: `Rs.${stats.totalRevenue.toLocaleString('en-IN')}`, icon: DollarSign, color: T.success },
                { label: 'Active Slots', value: stats.activeSlots, icon: Layers, color: T.amber },
              ].map(stat => (
                <div key={stat.label} style={{
                  ...cardStyle,
                  padding: '20px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '14px',
                    background: `${stat.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <stat.icon size={18} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p style={{
                      fontSize: '20px', fontWeight: 800, color: T.text,
                      margin: 0, fontFamily: "'Ferron', sans-serif",
                    }}>
                      {stat.value}
                    </p>
                    <p style={{ fontSize: '11px', color: T.textMuted, margin: '2px 0 0', fontWeight: 600 }}>
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── PERSONAL DETAILS ── */}
            <motion.div variants={fadeUp} style={cardStyle}>
              <h3 style={sectionHeading}>
                <User size={15} /> Personal Details
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
              }}>
                {[
                  { label: 'Full Name', name: 'full_name', type: 'text', placeholder: 'Enter your full name' },
                  { label: 'Mobile Number', name: 'mobile', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                  { label: 'City', name: 'city', type: 'text', placeholder: 'e.g. Mumbai' },
                  { label: 'State', name: 'state', type: 'text', placeholder: 'e.g. Maharashtra' },
                  { label: 'Pincode', name: 'pincode', type: 'text', placeholder: 'e.g. 400001' },
                ].map(field => (
                  <div key={field.name}>
                    <label style={labelStyle}>{field.label}</label>
                    {editing ? (
                      <input
                        type={field.type} name={field.name}
                        value={form[field.name]} onChange={handleChange}
                        placeholder={field.placeholder}
                        style={inputStyle}
                        onFocus={e => {
                          e.target.style.borderColor = T.accent
                          e.target.style.boxShadow = `0 0 0 3px ${T.inputFocus}`
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = T.inputBdr
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    ) : (
                      <p style={{
                        fontSize: '14px',
                        color: form[field.name] ? T.text : T.textDim,
                        margin: 0, padding: '11px 0',
                        borderBottom: `1px solid ${T.glassBdr}`,
                      }}>
                        {form[field.name] || 'Not provided'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── BUSINESS DETAILS ── */}
            <motion.div variants={fadeUp} style={cardStyle}>
              <h3 style={sectionHeading}>
                <Briefcase size={15} /> Business Details
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
              }}>
                {[
                  { label: 'Business Name', name: 'business_name', type: 'text', placeholder: 'e.g. Sharma Parking Services' },
                  { label: 'Business Type', name: 'business_type', type: 'text', placeholder: 'e.g. Parking Lot, EV Station' },
                  { label: 'GST Number', name: 'gst_number', type: 'text', placeholder: 'e.g. 27AAAAA0000A1Z5' },
                ].map(field => (
                  <div key={field.name}>
                    <label style={labelStyle}>{field.label}</label>
                    {editing ? (
                      <input
                        type={field.type} name={field.name}
                        value={form[field.name]} onChange={handleChange}
                        placeholder={field.placeholder}
                        style={inputStyle}
                        onFocus={e => {
                          e.target.style.borderColor = T.accent
                          e.target.style.boxShadow = `0 0 0 3px ${T.inputFocus}`
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = T.inputBdr
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    ) : (
                      <p style={{
                        fontSize: '14px',
                        color: form[field.name] ? T.text : T.textDim,
                        margin: 0, padding: '11px 0',
                        borderBottom: `1px solid ${T.glassBdr}`,
                      }}>
                        {form[field.name] || 'Not provided'}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Bio */}
              <div style={{ marginTop: '16px' }}>
                <label style={labelStyle}>Bio / About</label>
                {editing ? (
                  <textarea
                    name="bio" value={form.bio} onChange={handleChange}
                    placeholder="Tell users about your parking facility and services..."
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = T.accent
                      e.target.style.boxShadow = `0 0 0 3px ${T.inputFocus}`
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = T.inputBdr
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                ) : (
                  <p style={{
                    fontSize: '14px',
                    color: form.bio ? T.text : T.textDim,
                    margin: 0, lineHeight: 1.6,
                  }}>
                    {form.bio || 'Not provided'}
                  </p>
                )}
              </div>
            </motion.div>

            {/* ── ACCOUNT SECURITY ── */}
            <motion.div variants={fadeUp} style={cardStyle}>
              <h3 style={sectionHeading}>
                <Shield size={15} /> Account Security
              </h3>

              {authMessage.text && (
                <div style={{
                  padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                  marginBottom: '16px',
                  background: authMessage.type === 'success'
                    ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                  color: authMessage.type === 'success' ? T.success : T.danger,
                  border: `1px solid ${authMessage.type === 'success'
                    ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  {authMessage.text}
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {/* Email */}
                <div style={{
                  padding: '20px', borderRadius: '14px',
                  background: T.surface, border: `1px solid ${T.glassBdr}`,
                }}>
                  <h4 style={{
                    fontSize: '13px', fontWeight: 700, marginBottom: '16px',
                    display: 'flex', alignItems: 'center', gap: '8px', color: T.text,
                  }}>
                    <Mail size={14} style={{ color: T.accent }} /> Update Email
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>New Email</label>
                      <input type="email" name="email" value={emailForm.email}
                        onChange={handleEmailChange} disabled={!editing}
                        placeholder="new-email@example.com"
                        style={{ ...inputStyle, opacity: editing ? 1 : 0.4 }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm Email</label>
                      <input type="email" name="confirmEmail" value={emailForm.confirmEmail}
                        onChange={handleEmailChange} disabled={!editing}
                        placeholder="confirm new email"
                        style={{ ...inputStyle, opacity: editing ? 1 : 0.4 }}
                      />
                    </div>
                    {editing && (
                      <button type="button" onClick={handleUpdateEmail} disabled={saving}
                        style={{
                          padding: '10px', background: T.accent, color: '#fff',
                          border: 'none', borderRadius: '10px', fontSize: '13px',
                          fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Update Email
                      </button>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div style={{
                  padding: '20px', borderRadius: '14px',
                  background: T.surface, border: `1px solid ${T.glassBdr}`,
                }}>
                  <h4 style={{
                    fontSize: '13px', fontWeight: 700, marginBottom: '16px',
                    display: 'flex', alignItems: 'center', gap: '8px', color: T.text,
                  }}>
                    <Lock size={14} style={{ color: T.accent }} /> Update Password
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>New Password</label>
                      <input type="password" name="password" value={passwordForm.password}
                        onChange={handlePasswordChange} disabled={!editing}
                        placeholder="--------"
                        style={{ ...inputStyle, opacity: editing ? 1 : 0.4 }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm Password</label>
                      <input type="password" name="confirmPassword" value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange} disabled={!editing}
                        placeholder="confirm password"
                        style={{ ...inputStyle, opacity: editing ? 1 : 0.4 }}
                      />
                    </div>
                    {editing && (
                      <button type="button" onClick={handleUpdatePassword} disabled={saving}
                        style={{
                          padding: '10px', background: T.accent, color: '#fff',
                          border: 'none', borderRadius: '10px', fontSize: '13px',
                          fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Update Password
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── ACCOUNT DETAILS (read-only) ── */}
            <motion.div variants={fadeUp} style={{
              ...cardStyle,
              background: T.surface,
            }}>
              <h3 style={sectionHeading}>
                <ChevronRight size={15} /> Account Details
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
              }}>
                {[
                  { label: 'Email Address', value: profile?.email },
                  { label: 'Account Role', value: 'Owner' },
                  { label: 'Account Status', value: profile?.is_verified ? 'Verified' : 'Pending Verification' },
                  { label: 'Member Since', value: profile?.joined_at
                    ? new Date(profile.joined_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : 'N/A' },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{
                      fontSize: '11px', color: T.textMuted, margin: '0 0 4px',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: '14px', color: T.text, margin: 0, fontWeight: 500 }}>
                      {item.value || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── SAVE BUTTON ── */}
            {editing && (
              <motion.div variants={fadeUp} style={{
                display: 'flex', justifyContent: 'flex-end', gap: '12px',
              }}>
                <button type="button" onClick={() => setEditing(false)}
                  style={{
                    padding: '12px 28px', borderRadius: '12px',
                    border: `1.5px solid ${T.glassBdr}`,
                    background: 'transparent', color: T.textMuted,
                    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving || uploadingAvatar}
                  style={{
                    padding: '12px 32px', borderRadius: '12px', border: 'none',
                    background: saving || uploadingAvatar ? T.textDim : T.accent,
                    color: '#ffffff', fontSize: '14px', fontWeight: 800,
                    cursor: saving || uploadingAvatar ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', minWidth: '140px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: `0 4px 20px rgba(20,184,166,0.25)`,
                    transition: 'all 0.25s',
                  }}
                >
                  <Save size={15} />
                  {uploadingAvatar ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
                </button>
              </motion.div>
            )}

          </div>
        </form>
      </motion.div>
    </div>
  )
}
