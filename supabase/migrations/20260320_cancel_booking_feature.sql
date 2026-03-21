-- PART 1: SUPABASE MIGRATION
-- Add columns to bookings table and create cancel_booking function

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_status TEXT 
    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC 
    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings;
  v_minutes_since NUMERIC;
  v_refund_eligible BOOLEAN;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  AND user_id = p_user_id
  AND status NOT IN ('cancelled', 'completed');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found or already cancelled'
    );
  END IF;

  v_minutes_since := EXTRACT(EPOCH FROM 
    (NOW() - v_booking.created_at)) / 60;

  v_refund_eligible := v_minutes_since <= 7;

  UPDATE public.bookings SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    refund_status = CASE 
      WHEN v_refund_eligible THEN 'pending'
      ELSE 'not_eligible'
    END,
    refund_amount = CASE
      WHEN v_refund_eligible THEN amount
      ELSE 0
    END
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'refund_eligible', v_refund_eligible,
    'refund_amount', CASE 
      WHEN v_refund_eligible THEN v_booking.amount 
      ELSE 0 
    END,
    'minutes_since_booking', v_minutes_since,
    'razorpay_payment_id', v_booking.razorpay_payment_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_booking(UUID, UUID, TEXT) 
  TO authenticated;
