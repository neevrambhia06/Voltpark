import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import OwnerAnalyticsDashboard from '../components/Analytics/OwnerAnalyticsDashboard';

export default function AdminOwnerAnalysis() {
  const { ownerId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('owner_profiles')
          .select('*')
          .eq('id', ownerId)
          .single();
        
        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching owner profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [ownerId]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading Analytics...</div>;
  }

  if (!profile) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>Owner not found.</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 80px', fontFamily: 'inherit' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button 
          onClick={() => navigate(`/admin/owner/${ownerId}`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Inspection
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Owner Analytics
              <span style={{ fontSize: '12px', background: '#0f172a', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, verticalAlign: 'middle' }}>ADMIN VIEW</span>
            </h1>
            <div style={{ display: 'flex', gap: '16px', color: '#475569', fontSize: '14px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16} /> {profile.name}</span>
              {profile.company_name && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building2 size={16} /> {profile.company_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Component */}
      <OwnerAnalyticsDashboard 
        ownerId={ownerId} 
        isAdmin={true} 
      />
      
    </div>
  );
}
