
-- Create Payments Table
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings not null,
  user_id uuid references public.users not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric,
  status text check (status in ('pending', 'success', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.payments enable row level security;

-- Policies
create policy "Users can view their own payments."
  on payments for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own payments."
  on payments for insert
  with check ( auth.uid() = user_id );

create policy "Admins can view all payments"
    on payments for select
    using ( exists (select 1 from users where id = auth.uid() and role = 'admin') );

-- Verify logic for owners to view payments related to their locations
create policy "Owners can view payments for their bookings"
  on payments for select
  using ( exists (
    select 1 from bookings
    join locations on bookings.location_id = locations.id
    where bookings.id = payments.booking_id
    and locations.owner_id = auth.uid()
  ));
