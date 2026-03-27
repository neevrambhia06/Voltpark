import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import OwnerAnalyticsDashboard from '../../components/Analytics/OwnerAnalyticsDashboard';
import AnalyticsPricingModal from '../../components/Analytics/AnalyticsPricingModal';
import { BarChart2, ArrowLeft } from 'lucide-react';

export default function OwnerAnalysisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('owner_profiles')
          .select('*')
          .eq('id', user.id)
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
  }, [user]);

  const handleUpgrade = async (newTier) => {
    if (!profile) return;
    try {
      // Optimistic UI update
      setProfile({ ...profile, analytics_tier: newTier });
      
      const { error } = await supabase
        .from('owner_profiles')
        .update({ analytics_tier: newTier })
        .eq('id', profile.id);

      if (error) {
        console.error('Failed to upgrade tier:', error);
        // Revert on failure (in a real app you'd notify them)
      }
    } catch (err) {
      console.error('Error upgrading:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading your analytics...
      </div>
    );
  }

  if (!profile) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>Profile not found.</div>;
  }

  const currentTier = profile.analytics_tier || 'basic';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 80px', fontFamily: 'inherit' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart2 size={32} color="#00C9C8" /> Analytics Dashboard
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Track your properties, revenue, and bookings in real time.</p>
        </div>
        <button 
          onClick={() => navigate('/owner-portal')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', 
            border: '1px solid #e2e8f0', padding: '10px 18px', borderRadius: '12px', 
            color: '#0f172a', fontWeight: 600, cursor: 'pointer', transition: '0.2s',
            fontSize: '14px' 
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      <OwnerAnalyticsDashboard 
        ownerId={profile.id}
        tier={currentTier}
        isAdmin={false}
        onUpgradeClick={() => setIsModalOpen(true)}
      />

      <AnalyticsPricingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentTier={currentTier}
        onUpgrade={handleUpgrade}
        user={user}
      />
      
    </div>
  );
}
