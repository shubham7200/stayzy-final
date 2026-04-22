-- Add admin role to enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';

-- Add approved column to hostels (default false, so new hostels need approval)
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Add approved column to reviews (default false, so new reviews need approval)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Add suspended column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

-- Update hostel RLS policies to check approval status
DROP POLICY IF EXISTS "Anyone can view hostels" ON hostels;
CREATE POLICY "Users can view approved hostels or own hostels"
  ON hostels FOR SELECT
  USING (
    approved = true 
    OR auth.uid() = owner_id 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Update review RLS policies to check approval status
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Users can view approved reviews or own reviews"
  ON reviews FOR SELECT
  USING (
    approved = true 
    OR user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Admin policies: Allow admins to do everything on hostels
CREATE POLICY "Admins can manage all hostels"
  ON hostels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies: Allow admins to do everything on reviews
CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies: Allow admins to do everything on profiles
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies: Allow admins to manage user roles
CREATE POLICY "Admins can manage all user_roles"
  ON user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies: Allow admins to manage hostel facilities
CREATE POLICY "Admins can manage all facilities"
  ON hostel_facilities FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies: Allow admins to manage hostel images
CREATE POLICY "Admins can manage all images"
  ON hostel_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));