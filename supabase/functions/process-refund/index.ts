import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async (req) => {
  const { booking_id, razorpay_payment_id, amount }
    = await req.json()

  const key = 'rzp_live_SIT6nw0rSwlNIJ'
  const secret = 'CR1xRD5sjsZ6ZAQay37dwD14'
  const credentials = btoa(`${key}:${secret}`)

  // Initiate refund via Razorpay API
  const refundRes = await fetch(
    `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refund`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // convert to paise
        notes: { booking_id, reason: 'Cancelled within 7 minutes' }
      })
    }
  )

  const refundData = await refundRes.json()

  // Update booking refund status in Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (refundData.id) {
    await supabase
      .from('bookings')
      .update({
        refund_status: 'processed',
        refund_amount: amount
      })
      .eq('id', booking_id)

    return new Response(
      JSON.stringify({ success: true, refund_id: refundData.id }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: false, error: refundData }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
})
