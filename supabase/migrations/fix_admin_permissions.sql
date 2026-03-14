-- 1. Allow Admins to update any user in public.users (to set role = 'owner')
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" 
ON public.users 
FOR UPDATE 
USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- 2. Allow Admins to update owner_profiles (to set approval_status = 'approved')
DROP POLICY IF EXISTS "Admins can update owner profiles" ON public.owner_profiles;
CREATE POLICY "Admins can update owner profiles" 
ON public.owner_profiles 
FOR UPDATE 
USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- 3. Allow Admins to delete owner_profiles (for rejection/deletion)
DROP POLICY IF EXISTS "Admins can delete owner profiles" ON public.owner_profiles;
CREATE POLICY "Admins can delete owner profiles" 
ON public.owner_profiles 
FOR DELETE 
USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- 4. Allow Admins to select owner_profiles
DROP POLICY IF EXISTS "Admins can view all owner profiles" ON public.owner_profiles;
CREATE POLICY "Admins can view all owner profiles" 
ON public.owner_profiles 
FOR SELECT 
USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
