import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { uploadAvatar } from '../utils/uploadAvatar'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react'

export default function OwnerDetails() {
  const navigate   = useNavigate()
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [editing, setEditing]       = useState(false)
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] =
    useState(null)
  const [uploadingAvatar, setUploadingAvatar] =
    useState(false)
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeSlots: 0,
  })

  // Auth/Account states
  const { logout } = useAuth && typeof useAuth === 'function' ? useAuth() : { logout: () => {} }
  const [emailForm, setEmailForm] = useState({
    email: '',
    confirmEmail: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  })
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

  // ── Fetch owner profile ──
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const { data: { session } } =
        await supabase.auth.getSession()

      if (!session) {
        navigate('/owner/login')
        return
      }

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
        // First time initialization for new profile
        setForm(prev => ({
          ...prev,
          full_name: session.user.user_metadata?.full_name || 
                     session.user.user_metadata?.name || '',
          email: session.user.email
        }))
      }

      // Fetch owner stats
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
      // Total properties
      const { count: propCount } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)

      // Get location IDs for this owner
      const { data: locations } = await supabase
        .from('locations')
        .select('id, car_available_slots, bike_available_slots, available_slots')
        .eq('owner_id', ownerId)

      const locationIds =
        locations?.map(l => l.id) || []

      // Total bookings + revenue
      let totalBookings = 0
      let totalRevenue  = 0

      if (locationIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('amount, status')
          .in('location_id', locationIds)

        totalBookings = bookings?.length || 0
        totalRevenue  = bookings?.reduce(
          (sum, b) => sum + (b.amount || 0), 0
        ) || 0
      }

      // Active slots
      const activeSlots = locations?.reduce(
        (sum, l) =>
          sum +
          (l.car_available_slots  || 0) +
          (l.bike_available_slots || 0) +
          (l.available_slots      || 0),
        0
      ) || 0

      setStats({
        totalProperties: propCount || 0,
        totalBookings,
        totalRevenue,
        activeSlots,
      })
    } catch (err) {
      console.error('Stats error:', err)
    }
  }

  // ── Handle avatar change ──
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // ── Handle form field change ──
  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleEmailChange = (e) => {
    setEmailForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePasswordChange = (e) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // ── Auth Update Handlers ──
  const handleUpdateEmail = async (e) => {
    e.preventDefault()
    if (emailForm.email !== emailForm.confirmEmail) {
      setAuthMessage({ type: 'error', text: 'Emails do not match.' })
      return
    }
    setSaving(true)
    try {
      const { data, error: authError } = await supabase.auth.updateUser({ 
        email: emailForm.email 
      })
      if (authError) throw authError

      setAuthMessage({ 
        type: 'success', 
        text: `Confirmation link sent to ${emailForm.email}. Please verify to complete the change.` 
      })
      setEmailForm({ email: '', confirmEmail: '' })
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setAuthMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: passwordForm.password 
      })
      if (error) throw error
      setAuthMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordForm({ password: '', confirmPassword: '' })
    } catch (err) {
      setAuthMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ── Save profile ──
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { session } } =
        await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      let avatarUrl = profile?.avatar_url || null

      // Upload new avatar if selected
      if (avatarFile) {
        setUploadingAvatar(true)
        avatarUrl = await uploadAvatar(
          avatarFile,
          session.user.id
        )
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
      setEditing(false)
      setAvatarFile(null)
      fetchProfile()

      setTimeout(() => setSuccess(null), 3000)

    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
      setUploadingAvatar(false)
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #00C9C8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    )
  }

  // ── RENDER ──
  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '32px 24px 64px',
      fontFamily: 'inherit',
    }}>

      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
          }}>
            Owner Profile
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: '4px 0 0',
          }}>
            Manage your personal and business details
          </p>
        </div>
        <button
          onClick={() => setEditing(prev => !prev)}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: editing
              ? '1.5px solid #e2e8f0'
              : 'none',
            background: editing
              ? 'transparent' : '#0f172a',
            color: editing ? '#64748b' : '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Success / Error banners */}
      {success && (
        <div style={{
          padding: '12px 16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#16a34a',
          fontSize: '13px',
          marginBottom: '20px',
          fontFamily: 'inherit',
        }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '13px',
          marginBottom: '20px',
          fontFamily: 'inherit',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '20px',
        }}>

          {/* ── AVATAR + NAME CARD ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}>

            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #e2e8f0',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 700,
                color: '#00C9C8',
              }}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  (form.full_name?.[0] ||
                   profile?.email?.[0] ||
                   'O').toUpperCase()
                )}
              </div>

              {/* Upload overlay */}
              {editing && (
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('avatar-input')
                      .click()
                  }
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#0f172a',
                    border: '2px solid #ffffff',
                    color: '#ffffff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +
                </button>
              )}
              <input
                id="avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Name + role + verified badge */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                }}>
                  {profile?.full_name || 'Owner'}
                </h2>
                {profile?.is_verified && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                  }}>
                    Verified
                  </span>
                )}
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                }}>
                  Owner
                </span>
              </div>
              <p style={{
                fontSize: '13px',
                color: '#64748b',
                margin: '4px 0 0',
              }}>
                {profile?.email}
              </p>
              <p style={{
                fontSize: '12px',
                color: '#94a3b8',
                margin: '2px 0 0',
              }}>
                Member since{' '}
                {profile?.joined_at
                  ? new Date(profile.joined_at)
                      .toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                      })
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* ── STATS ROW ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
          }}>
            {[
              {
                label: 'Properties',
                value: stats.totalProperties,
                color: '#0f172a',
              },
              {
                label: 'Total Bookings',
                value: stats.totalBookings,
                color: '#0f172a',
              },
              {
                label: 'Total Revenue',
                value: `Rs.${
                  stats.totalRevenue.toLocaleString(
                    'en-IN'
                  )
                }`,
                color: '#16a34a',
              },
              {
                label: 'Active Slots',
                value: stats.activeSlots,
                color: '#00C9C8',
              },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <p style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: stat.color,
                  margin: 0,
                }}>
                  {stat.value}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#64748b',
                  margin: '4px 0 0',
                }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* ── PERSONAL DETAILS ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Personal Details
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}>
              {[
                {
                  label: 'Full Name',
                  name: 'full_name',
                  type: 'text',
                  placeholder: 'Enter your full name',
                },
                {
                  label: 'Mobile Number',
                  name: 'mobile',
                  type: 'tel',
                  placeholder: '+91 XXXXX XXXXX',
                },
                {
                  label: 'City',
                  name: 'city',
                  type: 'text',
                  placeholder: 'e.g. Mumbai',
                },
                {
                  label: 'State',
                  name: 'state',
                  type: 'text',
                  placeholder: 'e.g. Maharashtra',
                },
                {
                  label: 'Pincode',
                  name: 'pincode',
                  type: 'text',
                  placeholder: 'e.g. 400001',
                },
              ].map(field => (
                <div key={field.name}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '6px',
                  }}>
                    {field.label}
                  </label>
                  {editing ? (
                    <input
                      type={field.type}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#0f172a',
                        background: '#f8fafc',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e =>
                        e.target.style.borderColor =
                          '#00C9C8'
                      }
                      onBlur={e =>
                        e.target.style.borderColor =
                          '#e2e8f0'
                      }
                    />
                  ) : (
                    <p style={{
                      fontSize: '14px',
                      color: form[field.name]
                        ? '#0f172a' : '#94a3b8',
                      margin: 0,
                      padding: '10px 0',
                      borderBottom:
                        '1px solid #f1f5f9',
                    }}>
                      {form[field.name] ||
                       'Not provided'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── BUSINESS DETAILS ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Business Details
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}>
              {[
                {
                  label: 'Business Name',
                  name: 'business_name',
                  type: 'text',
                  placeholder:
                    'e.g. Sharma Parking Services',
                },
                {
                  label: 'Business Type',
                  name: 'business_type',
                  type: 'text',
                  placeholder:
                    'e.g. Parking Lot, EV Station',
                },
                {
                  label: 'GST Number',
                  name: 'gst_number',
                  type: 'text',
                  placeholder:
                    'e.g. 27AAAAA0000A1Z5',
                },
              ].map(field => (
                <div key={field.name}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '6px',
                  }}>
                    {field.label}
                  </label>
                  {editing ? (
                    <input
                      type={field.type}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#0f172a',
                        background: '#f8fafc',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e =>
                        e.target.style.borderColor =
                          '#00C9C8'
                      }
                      onBlur={e =>
                        e.target.style.borderColor =
                          '#e2e8f0'
                      }
                    />
                  ) : (
                    <p style={{
                      fontSize: '14px',
                      color: form[field.name]
                        ? '#0f172a' : '#94a3b8',
                      margin: 0,
                      padding: '10px 0',
                      borderBottom:
                        '1px solid #f1f5f9',
                    }}>
                      {form[field.name] ||
                       'Not provided'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Bio */}
            <div style={{ marginTop: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px',
              }}>
                Bio / About
              </label>
              {editing ? (
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  placeholder=
                    "Tell users about your parking facility and services..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#f8fafc',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e =>
                    e.target.style.borderColor =
                      '#00C9C8'
                  }
                  onBlur={e =>
                    e.target.style.borderColor =
                      '#e2e8f0'
                  }
                />
              ) : (
                <p style={{
                  fontSize: '14px',
                  color: form.bio
                    ? '#0f172a' : '#94a3b8',
                  margin: 0,
                  lineHeight: 1.6,
                }}>
                  {form.bio || 'Not provided'}
                </p>
              )}
            </div>
          </div>

          {/* ── ACCOUNT SECURITY ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            marginTop: editing ? '0' : '20px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Shield size={16} />
              Account Security
            </h3>

            {authMessage.text && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                background: authMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: authMessage.type === 'success' ? '#16a34a' : '#dc2626',
                border: `1px solid ${authMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}>
                {authMessage.text}
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {/* Email section */}
              <div style={{
                padding: '20px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} /> Update Email
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>New Email</label>
                    <input
                      type="email"
                      name="email"
                      value={emailForm.email}
                      onChange={handleEmailChange}
                      disabled={!editing}
                      placeholder="new-email@example.com"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Confirm Email</label>
                    <input
                      type="email"
                      name="confirmEmail"
                      value={emailForm.confirmEmail}
                      onChange={handleEmailChange}
                      disabled={!editing}
                      placeholder="confirm new email"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  {editing && (
                    <button
                      type="button"
                      onClick={handleUpdateEmail}
                      disabled={saving}
                      style={{
                        padding: '8px',
                        background: '#0f172a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Update Email
                    </button>
                  )}
                </div>
              </div>

              {/* Password section */}
              <div style={{
                padding: '20px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={14} /> Update Password
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>New Password</label>
                    <input
                      type="password"
                      name="password"
                      value={passwordForm.password}
                      onChange={handlePasswordChange}
                      disabled={!editing}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      disabled={!editing}
                      placeholder="confirm password"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  {editing && (
                    <button
                      type="button"
                      onClick={handleUpdatePassword}
                      disabled={saving}
                      style={{
                        padding: '8px',
                        background: '#0f172a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Update Password
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── ACCOUNT DETAILS (read only) ── */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Account Details
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              {[
                {
                  label: 'Email Address',
                  value: profile?.email,
                },
                {
                  label: 'Account Role',
                  value: 'Owner',
                },
                {
                  label: 'Account Status',
                  value: profile?.is_verified
                    ? 'Verified' : 'Pending Verification',
                },
                {
                  label: 'Member Since',
                  value: profile?.joined_at
                    ? new Date(profile.joined_at)
                        .toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                    : 'N/A',
                },
              ].map(item => (
                <div key={item.label}>
                  <p style={{
                    fontSize: '12px',
                    color: '#64748b',
                    margin: '0 0 4px',
                    fontWeight: 600,
                  }}>
                    {item.label}
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#0f172a',
                    margin: 0,
                    fontWeight: 500,
                  }}>
                    {item.value || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── SAVE BUTTON ── */}
          {editing && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{
                  padding: '12px 28px',
                  borderRadius: '8px',
                  border: '1.5px solid #e2e8f0',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                style={{
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  background:
                    saving || uploadingAvatar
                      ? '#94a3b8' : '#0f172a',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: saving || uploadingAvatar
                    ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  minWidth: '140px',
                }}
              >
                {uploadingAvatar
                  ? 'Uploading...'
                  : saving
                    ? 'Saving...'
                    : 'Save Changes'}
              </button>
            </div>
          )}

        </div>
      </form>
    </div>
  )
}
