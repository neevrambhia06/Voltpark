import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Lock, TrendingUp, IndianRupee, Calendar, MapPin, Clock } from 'lucide-react';

const COLORS = ['#00C9C8', '#f59e0b', '#ef4444', '#10b981'];

const TIER_LEVELS = {
  basic: 1,
  standard: 2,
  advanced: 3,
  pro: 4
};

// Dummy styles for neat locked overlays
const lockedContainerStyle = {
  position: 'relative',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '20px',
  padding: '24px',
  overflow: 'hidden'
};

const overlayStyle = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(255, 255, 255, 0.4)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  zIndex: 10,
  color: '#0f172a',
  gap: '12px'
};

export default function OwnerAnalyticsDashboard({ ownerId, tier = 'basic', isAdmin = false, onUpgradeClick }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    kpis: { revenue: 0, bookings: 0, activeProperties: 0 },
    revenueTrend: [],
    statusDistribution: [],
    topProperties: [],
    timeDistribution: []
  });

  const level = TIER_LEVELS[tier] || 1;
  const isUnlocked = (reqLevel) => isAdmin || level >= reqLevel;

  useEffect(() => {
    if (!ownerId) return;
    
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        // Fetch locations to get owner's properties
        const { data: locations, error: locError } = await supabase
          .from('locations')
          .select('id, name')
          .eq('owner_id', ownerId);

        if (locError) throw locError;

        const locationIds = locations.map(l => l.id);
        const locationMap = locations.reduce((acc, loc) => ({ ...acc, [loc.id]: loc.name }), {});

        // Fetch bookings for these locations
        let bookings = [];
        if (locationIds.length > 0) {
          const { data: bData, error: bError } = await supabase
            .from('bookings')
            .select('*')
            .in('location_id', locationIds);
          
          if (bError) throw bError;
          bookings = bData || [];
        }

        processData(bookings, locations);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [ownerId]);

  const processData = (bookings, locations) => {
    // 1. KPIs - Count Completed, Scheduled, and Active as revenue
    const totalRev = bookings
      .filter(b => b.status === 'completed' || b.status === 'Scheduled' || b.status === 'Active')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const activeProps = locations.length;
    
    // 2. Revenue Trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const trendMap = {};
    const statusMap = { Completed: 0, Pending: 0, Cancelled: 0, Scheduled: 0, Active: 0 };
    const propRevMap = {};
    const timeMap = {};

    bookings.forEach(b => {
      // Status Distribution - Normalize status name
      const statusTitle = b.status?.charAt(0).toUpperCase() + b.status?.slice(1);
      if (statusMap[statusTitle] !== undefined) {
        statusMap[statusTitle]++;
      } else if (b.status) {
        statusMap[statusTitle] = 1;
      }

      // Time Distribution (Hour of start_time)
      if (b.start_time) {
        const hour = new Date(b.start_time).getHours();
        const displayHour = `${hour.toString().padStart(2, '0')}:00`;
        timeMap[displayHour] = (timeMap[displayHour] || 0) + 1;
      }

      // Revenue Trend & Stats - Count Completed and Scheduled as revenue potential
      if (b.status === 'completed' || b.status === 'Scheduled' || b.status === 'Active') {
        const bDate = new Date(b.created_at);
        if (bDate >= thirtyDaysAgo) {
          const dateStr = bDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
          trendMap[dateStr] = (trendMap[dateStr] || 0) + (b.total_amount || 0);
        }

        // Top Properties
        const locName = locations.find(l => l.id === b.location_id)?.name || 'Unknown';
        propRevMap[locName] = (propRevMap[locName] || 0) + (b.total_amount || 0);
      }
    });

    const revenueTrend = Object.entries(trendMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const statusDistribution = Object.entries(statusMap)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .filter(item => item.value > 0);

    const topProperties = Object.entries(propRevMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount).slice(0, 5);

    const timeDistribution = Object.entries(timeMap)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));

    setData({
      kpis: { revenue: totalRev, bookings: bookings.length, activeProperties: activeProps },
      revenueTrend,
      statusDistribution,
      topProperties,
      timeDistribution
    });
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading analytics...</div>;
  }

  const renderLockedOverlay = (reqLevel) => (
    <div style={overlayStyle}>
      <div style={{ background: '#fff', padding: '16px', borderRadius: '50%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <Lock size={28} color="#0f172a" />
      </div>
      <h4 style={{ margin: '8px 0 0', fontWeight: 700, fontSize: '18px' }}>Pro Feature</h4>
      <p style={{ margin: '4px 0 16px', color: '#475569', fontSize: '14px', maxWidth: '250px', textAlign: 'center' }}>
        Unlock this chart by upgrading your analytics tier.
      </p>
      {onUpgradeClick && (
        <button 
          onClick={onUpgradeClick}
          style={{ background: '#00C9C8', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
        >
          View Plans
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tier Badge */}
      {!isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '16px 24px', borderRadius: '16px', color: '#fff' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#fff' }}>Current Plan: <span style={{ color: '#00C9C8', textTransform: 'capitalize' }}>{tier}</span> Analytics</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Unlock higher tiers for deeper insights into your business.</p>
          </div>
          {level < 4 && onUpgradeClick && (
            <button onClick={onUpgradeClick} style={{ background: '#00C9C8', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Upgrade Plan
            </button>
          )}
        </div>
      )}

      {/* KPI Cards (Basic - Level 1) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#f0fdfa', padding: '16px', borderRadius: '16px', color: '#0d9488' }}><IndianRupee size={24} /></div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Total Revenue</p>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>₹{data.kpis.revenue.toLocaleString()}</h3>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '16px', color: '#2563eb' }}><Calendar size={24} /></div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Lifetime Bookings</p>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{data.kpis.bookings}</h3>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '16px', color: '#dc2626' }}><MapPin size={24} /></div>
          <div>
            <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Active Properties</p>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{data.kpis.activeProperties}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'reaprt(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Revenue Trend (Standard - Level 2) */}
        <div style={{ ...lockedContainerStyle, gridColumn: '1 / -1' }}>
          {!isUnlocked(1) && renderLockedOverlay(1)}
          <h3 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#00C9C8" /> 30-Day Revenue Trend
          </h3>
          <div style={{ height: '300px' }}>
            {data.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueTrend}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C9C8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00C9C8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="amount" stroke="#00C9C8" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No revenue data for the last 30 days</div>
            )}
          </div>
        </div>

        {/* Status Distribution (Standard - Level 2) */}
        <div style={lockedContainerStyle}>
          {!isUnlocked(2) && renderLockedOverlay(2)}
          <h3 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 700 }}>Booking Status</h3>
          <div style={{ height: '250px' }}>
            {data.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.statusDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No bookings data</div>
            )}
          </div>
        </div>

        {/* Top Properties (Advanced - Level 3) */}
        <div style={lockedContainerStyle}>
          {!isUnlocked(3) && renderLockedOverlay(3)}
          <h3 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 700 }}>Top Performing Properties</h3>
          <div style={{ height: '250px' }}>
            {data.topProperties.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topProperties} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} width={120} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No revenue data by property</div>
            )}
          </div>
        </div>

        {/* Popular Times (Pro - Level 4) */}
        <div style={{ ...lockedContainerStyle, gridColumn: '1 / -1' }}>
          {!isUnlocked(4) && renderLockedOverlay(4)}
          <h3 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#8b5cf6" /> Demand by Time of Day
          </h3>
          <div style={{ height: '250px' }}>
            {data.timeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No time data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
