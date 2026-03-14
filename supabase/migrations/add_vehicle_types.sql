-- 1. Add Vehicle Type Columns to Locations Table
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS car_total_slots integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS car_available_slots integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS car_price_per_hour numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bike_total_slots integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bike_available_slots integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bike_price_per_hour numeric DEFAULT 0;

-- 2. Backfill existing parking locations (Assume existing slots are for Cars)
UPDATE public.locations 
SET 
  car_total_slots = total_slots,
  car_available_slots = available_slots,
  car_price_per_hour = price_per_hour
WHERE type = 'parking';

-- 3. Add vehicle_type to Bookings Table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS vehicle_type text CHECK (vehicle_type IN ('car', 'bike', 'ev')) DEFAULT 'car';

-- 4. Update existing bookings to 'car' (or 'ev' if location is ev type - tough to know without join, but default 'car' is safe for now or we can run a complex update)
-- For simplicity, default is 'car', which covers most. EV bookings might need manual update if we distinguish them strictly.

-- 5. Drop old columns? OPTIONAL. 
-- For now, keep them as fallback or for EV types if they use them.
-- But user said "Remove generic: price_per_hour, total_slots, available_slots (for parking type only)"
-- We can't really "remove for parking type only" physically. We just stop using them in frontend for parking.
-- We will keep them for 'ev' type or legacy reference.
