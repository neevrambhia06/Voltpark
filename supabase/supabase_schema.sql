
-- Users Table
create table public.users (
  id uuid references auth.users not null primary key,
  name text,
  email text,
  role text check (role in ('user', 'owner', 'admin')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;

create policy "Public profiles are viewable by everyone."
  on users for select
  using ( true );

create policy "Users can update own profile."
  on users for update
  using ( auth.uid() = id );

-- Locations Table
create table public.locations (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.users not null,
  type text check (type in ('parking', 'ev')),
  name text not null,
  address text not null,
  city text,
  price_per_hour numeric,
  total_slots integer,
  available_slots integer,
  ev_chargers integer default 0,
  image_url text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.locations enable row level security;

create policy "Locations are viewable by everyone."
  on locations for select
  using ( true );

create policy "Owners can insert their own locations."
  on locations for insert
  with check ( auth.uid() = owner_id );

create policy "Owners can update their own locations."
  on locations for update
  using ( auth.uid() = owner_id );

create policy "Owners can delete their own locations."
  on locations for delete
  using ( auth.uid() = owner_id );

-- Bookings Table
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users not null,
  location_id uuid references public.locations not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  duration numeric,
  amount numeric,
  status text check (status in ('active', 'completed', 'cancelled')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.bookings enable row level security;

create policy "Users can view their own bookings."
  on bookings for select
  using ( auth.uid() = user_id );

create policy "Owners can view bookings for their locations."
  on bookings for select
  using ( exists (
    select 1 from locations
    where locations.id = bookings.location_id
    and locations.owner_id = auth.uid()
  ));

create policy "Users can insert their own bookings."
  on bookings for insert
  with check ( auth.uid() = user_id );

-- Admin policies (Admins can view all)
-- In a real prod app, you'd have a stronger admin check function.
-- For now, if role is admin, they can bypass RLS or add specific policies.
-- Ideally use service role key for admin tasks or:
create policy "Admins can view all users"
    on users for select
    using ( exists (select 1 from users where id = auth.uid() and role = 'admin') );

create policy "Admins can view all bookings"
    on bookings for select
    using ( exists (select 1 from users where id = auth.uid() and role = 'admin') );
