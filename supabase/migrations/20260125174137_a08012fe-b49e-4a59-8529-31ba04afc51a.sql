-- Fix RLS policies for hostel_images, hostel_facilities, and rooms
-- The "Anyone can view" policies are RESTRICTIVE instead of PERMISSIVE, blocking anonymous users

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Anyone can view images" ON public.hostel_images;
DROP POLICY IF EXISTS "Anyone can view facilities" ON public.hostel_facilities;
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;

-- Recreate as PERMISSIVE policies (default) to allow public read access
CREATE POLICY "Anyone can view images" 
ON public.hostel_images 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view facilities" 
ON public.hostel_facilities 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view rooms" 
ON public.rooms 
FOR SELECT 
USING (true);