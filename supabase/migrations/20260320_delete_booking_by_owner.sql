-- Delete Booking by Owner RPC Function
-- Allows owners to delete bookings for their own locations
-- Restores slot count if booking was active

CREATE OR REPLACE FUNCTION delete_booking_by_owner(
  p_booking_id UUID,
  p_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings;
  v_location public.locations;
BEGIN
  -- Verify the booking belongs to a location
  -- owned by this owner
  SELECT b.* INTO v_booking
  FROM public.bookings b
  JOIN public.locations l ON l.id = b.location_id
  WHERE b.id = p_booking_id
  AND l.owner_id = p_owner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found or access denied'
    );
  END IF;

  -- Restore slot count if booking was active
  IF v_booking.status IN (
    'Scheduled', 'confirmed', 'active'
  ) THEN
    IF v_booking.vehicle_type = 'bike' THEN
      UPDATE public.locations
        SET bike_available_slots = bike_available_slots + 1
        WHERE id = v_booking.location_id;
    ELSIF v_booking.vehicle_type = 'car' THEN
      UPDATE public.locations
        SET car_available_slots = car_available_slots + 1
        WHERE id = v_booking.location_id;
    ELSE
      UPDATE public.locations
        SET available_slots = available_slots + 1
        WHERE id = v_booking.location_id;
    END IF;
  END IF;

  -- Delete the booking
  DELETE FROM public.bookings
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_booking_id', p_booking_id,
    'slot_restored', v_booking.status IN (
      'Scheduled', 'confirmed', 'active'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION 
  delete_booking_by_owner(UUID, UUID) 
  TO authenticated;
