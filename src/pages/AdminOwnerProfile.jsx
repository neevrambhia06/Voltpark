import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Building2, Briefcase, IndianRupee, LayoutGrid, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react'

export default function AdminOwnerProfile() {
  const { ownerId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeSlots: 0,
  })

  useEffect(() => {
    if (ownerId) {
      fetchProfile()
    }
  }, [ownerId])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ownerProfReq, profReq] = await Promise.all([
        supabase.from('owner_profiles').select('*').eq('id', ownerId).single(),
        supabase.from('profiles').select('*').eq('id', ownerId).maybeSingle()
      ])

      if (ownerProfReq.error) throw ownerProfReq.error

      const mergedProfile = {
        ...profReq.data,
        ...ownerProfReq.data,
      }

      setProfile(mergedProfile)
      await fetchStats(ownerId)

    } catch (err) {
      setError('Failed to load owner profile.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (id) => {
    try {
      const { count: propCount } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', id)

      const { data: locations } = await supabase
        .from('locations')
        .select('id, car_available_slots, bike_available_slots, available_slots')
        .eq('owner_id', id)

      const locationIds = locations?.map(l => l.id) || []

      let totalBookings = 0
      let totalRevenue = 0

      if (locationIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('amount')
          .in('location_id', locationIds)

        totalBookings = bookings?.length || 0
        totalRevenue = bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0
      }

      const activeSlots = locations?.reduce(
        (sum, l) => sum + (l.car_available_slots || 0) + (l.bike_available_slots || 0) + (l.available_slots || 0),
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

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTop: '3px solid #00C9C8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '32px', color: '#dc2626' }}>
          <h2 style={{ margin: '0 0 8px' }}>Error</h2>
          <p>{error || 'Owner profile not found.'}</p>
          <button onClick={() => navigate('/admin-portal')} style={{ marginTop: '16px', padding: '8px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back to Admin Portal</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'inherit' }}>
      
      {/* Back Button & Header */}
      <div style={{ marginBottom: '32px' }}>
        <button 
          onClick={() => navigate('/admin-portal')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer', padding: '0', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Owner Inspection
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>
              Detailed overview of owner profile and business activities
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
             <button 
               onClick={() => navigate(`/admin/owner/${ownerId}/analysis`)}
               style={{ padding: '6px 16px', borderRadius: '8px', background: '#00C9C8', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
             >
               <LayoutGrid size={14} /> Analysis Dashboard
             </button>
             <span style={{ padding: '6px 16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
               ID: {ownerId.slice(0, 8)}...
             </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Identity Card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '32px', display: 'flex', gap: '24px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', border: '4px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 800, color: '#00C9C8', flexShrink: 0, overflow: 'hidden' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (profile.name?.[0] || 'O').toUpperCase()
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{profile.name || 'Owner Profile'}</h2>
                {profile.approval_status === 'approved' && <ShieldCheck size={18} className="text-green-500" />}
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> {profile.email}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{profile.approval_status === 'approved' ? 'Verified Owner' : 'Pending Verification'}</span>
                <span style={{ padding: '4px 12px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Partner since {(new Date(profile.created_at)).getFullYear() || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Details Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Business Info */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <DetailItem label="Entity Name" value={profile.company_name} icon={<Building2 size={16} />} />
                <DetailItem label="Service Type" value={profile.business_type} />
                <DetailItem label="GST Number" value={profile.gst_number} />
                <DetailItem label="Role" value={profile.role || 'Owner'} />
                <DetailItem label="Approval Status" value={profile.approval_status} />
              </div>
            </div>

            {/* Direct Contact */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact & Location</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <DetailItem label="Primary Email" value={profile.email} icon={<Mail size={16} />} />
                <DetailItem label="Mobile" value={profile.mobile} icon={<Phone size={16} />} />
                <DetailItem label="Base City" value={profile.city} icon={<MapPin size={16} />} />
                <DetailItem label="Join Date" value={new Date(profile.created_at).toLocaleDateString()} />
              </div>
            </div>

          </div>

          {/* Bio */}
          {profile.bio && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Bio</h3>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>{profile.bio}</p>
            </div>
          )}

        </div>

        {/* Sidebar Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#0f172a', borderRadius: '24px', padding: '28px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', margin: '0 0 24px' }}>Owner Performance</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <StatBlock label="Operational Properties" value={stats.totalProperties} icon={<Building2 size={20} />} />
              <StatBlock label="Successful Bookings" value={stats.totalBookings} icon={<Briefcase size={20} />} />
              <StatBlock label="Total Gross Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<IndianRupee size={20} />} highlight />
              <StatBlock label="Current Active Slots" value={stats.activeSlots} icon={<LayoutGrid size={20} />} />
            </div>
          </div>

          <div style={{ padding: '20px', background: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, margin: 0 }}>Profile data last synced via</p>
            <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800, margin: '2px 0 0' }}>Supabase Real-time Engine</p>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}

function DetailItem({ label, value, icon }) {
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span style={{ color: '#64748b' }}>{icon}</span>}
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{value || 'Not provided'}</p>
      </div>
    </div>
  )
}

function StatBlock({ label, value, icon, highlight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: highlight ? '#00C9C8' : '#fff', flexShrink: 0 }}>
        <div style={{ margin: '0 auto' }}>{icon}</div>
      </div>
      <div>
        <p style={{ fontSize: '20px', fontWeight: 800, color: highlight ? '#00C9C8' : '#fff', margin: 0 }}>{value}</p>
        <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', margin: 0 }}>{label}</p>
      </div>
    </div>
  )
}
