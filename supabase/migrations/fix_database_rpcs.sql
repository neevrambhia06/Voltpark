-- 1. Function to fetch occupied slots bypassing RLS (Security Definer)
-- This allows anyone to see which slots are taken without seeing personal data.
CREATE OR REPLACE FUNCTION get_occupied_slots(p_location_id UUID)
RETURNS TABLE (selected_slot TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT b.selected_slot
    FROM public.bookings b
    WHERE b.location_id = p_location_id
    AND b.status IN ('Scheduled', 'Started', 'active', 'confirmed');
END;
$$;

-- 2. Atomic Function to Create Booking and Decrement Slots
CREATE OR REPLACE FUNCTION create_booking(
    p_location_id UUID,
    p_user_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_duration NUMERIC,
    p_amount NUMERIC,
    p_status TEXT,
    p_barcode_value TEXT,
    p_selected_slot TEXT,
    p_vehicle_type TEXT
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking public.bookings;
    v_available_field TEXT;
    v_current_available INTEGER;
BEGIN
    -- 1. Insert the booking
    INSERT INTO public.bookings (
        user_id, location_id, start_time, end_time, duration, 
        amount, status, barcode_value, selected_slot, vehicle_type
    ) VALUES (
        p_user_id, p_location_id, p_start_time, p_end_time, p_duration,
        p_amount, p_status, p_barcode_value, p_selected_slot, p_vehicle_type
    ) RETURNING * INTO v_booking;

    -- 2. Determine which slot column to decrement
    IF p_vehicle_type = 'bike' THEN
        v_available_field := 'bike_available_slots';
    ELSIF p_vehicle_type = 'car' THEN
        v_available_field := 'car_available_slots';
    ELSE
        v_available_field := 'available_slots';
    END IF;

    -- 3. Decrement accurately
    EXECUTE format('UPDATE public.locations SET %I = %I - 1 WHERE id = %L AND %I > 0', 
        v_available_field, v_available_field, p_location_id, v_available_field);

    RETURN v_booking;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_occupied_slots(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_booking(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;
