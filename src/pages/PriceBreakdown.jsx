import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  calculatePrice,
  formatDuration,
  formatCurrency,
} from '../utils/priceCalculator'

export default function PriceBreakdown() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const bookingData = location.state

  const [paying, setPaying] = useState(false)

  // Redirect if no booking data
  useEffect(() => {
    if (!bookingData) navigate('/locations')
  }, [bookingData])

  if (!bookingData) return null

  const {
    location:  parkingLocation,
    slot,
    startTime,
    endTime,
    durationHours,
    vehicleType,
  } = bookingData

  // Calculate price breakdown
  const breakdown = calculatePrice({
    pricePerHour:  parkingLocation.price_per_hour,
    durationHours,
  })

  // ── Proceed to payment: Razorpay integration ──
  const handleProceedToPayment = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setPaying(true)
    try {
      const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5000'
      const amount = breakdown.total
      const tempBookingId = crypto.randomUUID()

      // 1. Create Razorpay order on backend
      const orderResponse = await fetch(`${API_BASE}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: tempBookingId, amount })
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create Razorpay order')
      }

      const order = await orderResponse.json()

      // 2. Open Razorpay checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'VOLTpark',
        description: `Booking at ${parkingLocation.name}`,
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
            })
            const verifyData = await verifyRes.json()

            if (verifyData.status === 'success') {
              // 4. Save booking to DB
              await saveBooking(
                amount, tempBookingId,
                response.razorpay_order_id,
                response.razorpay_payment_id
              )
            } else {
              alert('Payment verification failed.')
              setPaying(false)
            }
          } catch (verifyError) {
            console.error('Verification error:', verifyError)
            alert('An error occurred while verifying the payment.')
            setPaying(false)
          }
        },
        prefill: {
          name: user.user_metadata?.name || user.email,
          email: user.email,
        },
        theme: { color: '#0f172a' },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        console.error('Payment Failed:', response.error)
        alert(`Payment Failed: ${response.error.description}`)
        setPaying(false)
      })
      rzp.open()

    } catch (error) {
      console.error('Payment initiation failed:', error)
      alert('Payment initiation failed: ' + (error.message || 'Unknown error'))
      setPaying(false)
    }
  }

  // ── Save booking after successful payment ──
  const saveBooking = async (amount, tempBookingId, razorpayOrderId, razorpayPaymentId) => {
    try {
      const startDateTime = new Date(startTime)
      const endDateTime = new Date(endTime)

      // Try RPC first
      const { error } = await supabase.rpc('create_booking', {
        p_location_id: parkingLocation.id,
        p_user_id: user.id,
        p_start_time: startDateTime.toISOString(),
        p_end_time: endDateTime.toISOString(),
        p_duration: durationHours,
        p_amount: amount,
        p_status: 'Scheduled',
        p_barcode_value: tempBookingId,
        p_selected_slot: slot,
        p_vehicle_type: vehicleType,
      })

      if (error) {
        console.error('RPC Error (falling back to direct insert):', error)
        const { error: bookingError } = await supabase.from('bookings').insert([{
          id: tempBookingId,
          user_id: user.id,
          location_id: parkingLocation.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration: durationHours,
          amount,
          status: 'Scheduled',
          barcode_value: tempBookingId,
          selected_slot: slot,
          vehicle_type: vehicleType,
          base_amount: breakdown.baseAmount,
          platform_fee: breakdown.platformFee,
          gst_amount: breakdown.gstAmount,
          total_amount: breakdown.total,
          price_per_hour: breakdown.pricePerHour,
          duration_hours: breakdown.durationHours,
        }])

        if (bookingError) throw bookingError
      }

      // Insert payment record
      await supabase.from('payments').insert([{
        booking_id: tempBookingId,
        user_id: user.id,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        amount,
        status: 'success'
      }]).then(({ error: paymentError }) => {
        if (paymentError) console.error('Payment record insert failed (non-critical):', paymentError)
      })

      alert('Booking Confirmed Successfully!')
      navigate('/user-dashboard')

    } catch (dbError) {
      console.error('Database error during booking:', dbError)
      alert('Booking saved but encountered an issue: ' + dbError.message)
      navigate('/user-dashboard')
    } finally {
      setPaying(false)
    }
  }


  // ── RENDER ──
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'inherit',
    }}>

      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#0f172a',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          &larr;
        </button>
        <div>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
          }}>
            Order Summary
          </h1>
          <p style={{
            fontSize: '12px',
            color: '#64748b',
            margin: 0,
          }}>
            Review your booking details
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '520px',
        margin: '0 auto',
        padding: '20px 16px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>

        {/* ── LOCATION CARD ── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {parkingLocation.image_url && (
            <img
              src={parkingLocation.image_url}
              alt={parkingLocation.name}
              style={{
                width: '100%',
                height: '140px',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}

          <div style={{ padding: '16px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '9999px',
              background: parkingLocation.type === 'ev_charging'
                ? 'rgba(255,107,0,0.10)' : 'rgba(0,201,200,0.10)',
              color: parkingLocation.type === 'ev_charging'
                ? '#FF6B00' : '#00C9C8',
              border: `1px solid ${
                parkingLocation.type === 'ev_charging'
                  ? 'rgba(255,107,0,0.25)' : 'rgba(0,201,200,0.25)'
              }`,
            }}>
              {parkingLocation.type === 'ev_charging' ? 'EV CHARGING' : 'PARKING'}
            </span>

            <h2 style={{
              fontSize: '16px', fontWeight: 700,
              color: '#0f172a', margin: '8px 0 4px',
            }}>
              {parkingLocation.name}
            </h2>

            <p style={{
              fontSize: '13px', color: '#64748b', margin: 0,
            }}>
              {parkingLocation.address}
            </p>
          </div>
        </div>

        {/* ── BOOKING DETAILS CARD ── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '13px', fontWeight: 700, color: '#0f172a',
            margin: '0 0 14px', textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Booking Details
          </h3>

          {[
            { label: 'Slot', value: slot?.slot_number || slot },
            { label: 'Vehicle Type', value: vehicleType === 'car' ? 'Car' : 'Bike' },
            { label: 'Check In', value: new Date(startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
            { label: 'Check Out', value: new Date(endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
            { label: 'Duration', value: formatDuration(durationHours) },
            { label: 'Rate', value: `${formatCurrency(parkingLocation.price_per_hour)} / hr` },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '8px 0',
              borderBottom: '1px dashed #f1f5f9',
            }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{item.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.value}</span>
            </div>
          ))}
        </div>



        {/* ── PRICE BREAKDOWN CARD ── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px',
        }}>
          <h3 style={{
            fontSize: '13px', fontWeight: 700, color: '#0f172a',
            margin: '0 0 14px', textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Price Breakdown
          </h3>

          {[
            {
              label: `Base Fare (${formatCurrency(breakdown.pricePerHour)} x ${formatDuration(breakdown.durationHours)})`,
              value: formatCurrency(breakdown.baseAmount),
              color: '#0f172a',
            },
            {
              label: 'Platform Fee (5%)',
              value: formatCurrency(breakdown.platformFee),
              color: '#0f172a',
            },
            {
              label: 'GST (18%)',
              value: formatCurrency(breakdown.gstAmount),
              color: '#0f172a',
            },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '8px 0',
              borderBottom: '1px solid #f8fafc',
            }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{item.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: item.color }}>{item.value}</span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ borderTop: '2px solid #0f172a', margin: '12px 0 8px' }} />

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Total Payable
            </span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              {formatCurrency(breakdown.total)}
            </span>
          </div>


        </div>

        {/* ── CANCELLATION POLICY ── */}
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: '12px', padding: '14px 16px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', margin: '0 0 6px' }}>
            Cancellation Policy
          </p>
          <p style={{ fontSize: '12px', color: '#78350f', margin: 0, lineHeight: 1.6 }}>
            Cancel within 7 minutes of booking for a full refund. No refund after the window expires.
          </p>
        </div>



      </div>

      {/* ── STICKY BOTTOM CTA ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#ffffff', borderTop: '1px solid #e2e8f0',
        padding: '16px 24px', zIndex: 100,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          maxWidth: '520px', margin: '0 auto',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '16px',
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Total Payable
            </p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {formatCurrency(breakdown.total)}
            </p>
          </div>

          <button
            onClick={handleProceedToPayment}
            disabled={paying}
            style={{
              flex: 1, maxWidth: '240px',
              padding: '14px 24px', borderRadius: '12px',
              border: 'none',
              background: paying ? '#e2e8f0' : '#0f172a',
              color: paying ? '#94a3b8' : '#ffffff',
              fontSize: '15px', fontWeight: 700,
              cursor: paying ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            {paying ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>
      </div>

    </div>
  )
}
