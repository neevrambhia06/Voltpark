-- Drop the existing constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS allowed_statuses;

-- Add the new constraint with all used statuses
ALTER TABLE public.bookings 
ADD CONSTRAINT allowed_statuses 
CHECK (status IN (
    'active', 
    'completed', 
    'cancelled', 
    'pending', 
    'confirmed', 
    'Scheduled', 
    'Started', 
    'Completed', 
    'Cancelled', 
    'failed'
));
