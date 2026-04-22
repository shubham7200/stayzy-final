-- Fix user_roles enumeration vulnerability
-- Drop overly permissive policy that allows anyone to view all roles
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;

-- Users can view only their own role
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all roles (already covered by existing admin policy)
-- Note: "Admins can manage all user_roles" policy already handles admin SELECT access