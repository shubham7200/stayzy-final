-- Fix storage policies - drop ALL existing hostel-images policies first
DROP POLICY IF EXISTS "Owners can upload hostel images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update hostel images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete hostel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload hostel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their hostel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their hostel images" ON storage.objects;

-- Upload: Only owners can upload images for their hostels (or admins)
CREATE POLICY "Owners can upload hostel images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hostel-images'
  AND auth.uid() IS NOT NULL
  AND (
    -- Extract hostel_id from path (format: hostel_id/filename)
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.hostels WHERE owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Update: Only owners of the hostel can modify its images (or admins)
CREATE POLICY "Owners can update hostel images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'hostel-images'
  AND (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.hostels WHERE owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Delete: Only owners of the hostel can delete its images (or admins)
CREATE POLICY "Owners can delete hostel images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hostel-images'
  AND (
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.hostels WHERE owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);