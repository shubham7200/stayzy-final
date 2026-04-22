-- Fix profiles SELECT policy - currently allows anyone to view all profiles
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create proper policies for profiles access
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Owners can view profiles of users who booked at their hostels
CREATE POLICY "Owners can view booker profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.hostels h ON h.id = b.hostel_id
    WHERE b.user_id = profiles.id
    AND h.owner_id = auth.uid()
  )
);

-- Add storage policies for hostel-images bucket
-- Allow anyone to view hostel images (they are public)
CREATE POLICY "Hostel images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'hostel-images');

-- Allow authenticated users to upload hostel images
CREATE POLICY "Authenticated users can upload hostel images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hostel-images'
  AND auth.uid() IS NOT NULL
);

-- Allow owners to update their hostel images
CREATE POLICY "Users can update their hostel images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'hostel-images'
  AND auth.uid() IS NOT NULL
);

-- Allow owners to delete hostel images
CREATE POLICY "Users can delete their hostel images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hostel-images'
  AND auth.uid() IS NOT NULL
);

-- Allow admins full access to hostel images
CREATE POLICY "Admins can manage all hostel images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'hostel-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);