import React, { useState } from 'react';
import { Check, X, CreditCard } from 'lucide-react';

const TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    features: ['Total Bookings Counter', 'Total Revenue Tracking', 'Active Properties Summary', '30-Day Revenue Trend Chart'],
    missing: ['Booking Status Breakdown', 'Top Properties Comparison', 'Demand / Time Analysis']
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '₹799/mo',
    features: ['Everything in Basic', 'Booking Status Breakdown (Pie)'],
    missing: ['Top Properties Comparison', 'Demand / Time Analysis'],
    popular: true
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price: '₹1499/mo',
    features: ['Everything in Standard', 'Top Properties Comparison (Bar)', 'Up to 90 Days History'],
    missing: ['Demand / Time Analysis']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹2499/mo',
    features: ['Everything in Advanced', 'Busiest Time of Day Analysis', 'Export Data to CSV', 'Custom Date Filtering'],
    missing: []
  }
];

export default function AnalyticsPricingModal({ isOpen, onClose, currentTier = 'basic', onUpgrade, user }) {
  const [loadingTier, setLoadingTier] = useState(null); // Tracks which tier is being upgraded

  if (!isOpen) return null;

  const handleSubscribe = async (tierId) => {
    if (!user) {
      alert('Please log in to upgrade your tier.');
      return;
    }

    setLoadingTier(tierId);
    
    // Tier pricing (in INR)
    const tierPrices = {
      standard: 799,
      advanced: 1499,
      pro: 2499
    };

    const amount = tierPrices[tierId.toLowerCase()];
    if (!amount) {
      setLoadingTier(null);
      return;
    }

    try {
      const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5000';
      // Razorpay receipt ID has a 40-character limit. Using a shorter ID.
      const upgradeId = `anlytics_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // 1. Create Razorpay order on backend
      const orderResponse = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          booking_id: upgradeId, // using as receipt
          amount 
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to create order');
      }

      const order = await orderResponse.json();

      // 2. Open Razorpay checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'VOLTpark Analytics',
        description: `Upgrade to ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} Tier`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. Verify payment
            const verifyRes = await fetch(`${API_BASE}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();

            if (verifyData.status === 'success') {
              // 4. Update tier in database via parent callback
              await onUpgrade(tierId.toLowerCase());
              onClose();
            } else {
              alert('Payment verification failed.');
              setLoadingTier(null);
            }
          } catch (verifyError) {
            console.error('Verification error:', verifyError);
            alert('An error occurred while verifying the payment.');
            setLoadingTier(null);
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
        },
        theme: { color: '#0f172a' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment Failed:', response.error);
        alert(`Payment Failed: ${response.error.description}`);
        setLoadingTier(null);
      });
      rzp.open();

    } catch (error) {
      console.error('Payment initiation failed:', error);
      if (error.message === 'Failed to fetch') {
        alert('Could not connect to the payment server. Make sure the backend server (at /server) is running on port 5000.');
      } else {
        alert('Payment initiation failed: ' + (error.message || 'Unknown error'));
      }
      setLoadingTier(null);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '1100px',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '40px'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Unlock Deeper Insights</h2>
          <p style={{ fontSize: '16px', color: '#64748b', margin: 0, maxWidth: '600px', marginInline: 'auto' }}>
            Choose the analytics tier that fits your business needs. Upgrade at any time to unlock powerful new charts and data exports.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            
            return (
              <div key={tier.id} style={{
                background: tier.popular ? '#f8fafc' : '#fff',
                border: `2px solid ${tier.popular ? '#00C9C8' : '#e2e8f0'}`,
                borderRadius: '20px', padding: '32px 24px',
                position: 'relative', display: 'flex', flexDirection: 'column'
              }}>
                {tier.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#00C9C8', color: '#fff', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Most Popular
                  </div>
                )}
                
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>{tier.name}</h3>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px' }}>{tier.price}</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, marginBottom: '32px' }}>
                  {tier.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', color: '#334155', fontSize: '14px', alignItems: 'flex-start' }}>
                      <Check size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                  {tier.missing.map((feat, i) => (
                    <div key={`m-${i}`} style={{ display: 'flex', gap: '12px', color: '#94a3b8', fontSize: '14px', alignItems: 'flex-start' }}>
                      <X size={16} color="#cbd5e1" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ textDecoration: 'line-through' }}>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrent && handleSubscribe(tier.id)}
                  disabled={isCurrent || (loadingTier !== null)}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    fontWeight: 600, fontSize: '15px', cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? '#f1f5f9' : (tier.popular ? '#0f172a' : '#fff'),
                    color: isCurrent ? '#94a3b8' : (tier.popular ? '#fff' : '#0f172a'),
                    border: isCurrent ? 'none' : `1px solid ${tier.popular ? '#0f172a' : '#cbd5e1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: '0.2s', opacity: (loadingTier !== null) && (loadingTier !== tier.id) ? 0.6 : 1
                  }}
                >
                  {isCurrent ? 'Current Plan' : (loadingTier === tier.id ? 'Processing...' : 'Subscribe')}
                  {!isCurrent && (loadingTier !== tier.id) && <CreditCard size={18} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
