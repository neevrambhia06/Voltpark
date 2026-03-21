-- Part 1: Supabase Migration for EV Charging Options

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS charging_type TEXT
    CHECK (charging_type IN ('fast', 'slow', NULL)),
  ADD COLUMN IF NOT EXISTS charging_speed_kw NUMERIC;
