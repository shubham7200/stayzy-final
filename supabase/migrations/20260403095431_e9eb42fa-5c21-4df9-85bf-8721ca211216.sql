
-- 1. Fix validate_and_book_bed: enforce caller identity
CREATE OR REPLACE FUNCTION public.validate_and_book_bed(
  _room_id uuid, _user_id uuid, _hostel_id uuid, _bed_number integer,
  _move_in_date date, _rent_per_bed integer, _notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking_id uuid;
  _beds_available integer;
  _beds_total integer;
  _owner_occupied_beds integer[] := '{}'::integer[];
  _bed_already_taken boolean;
BEGIN
  -- Enforce caller identity to prevent impersonation
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot create booking for another user';
  END IF;

  -- Lock the room row to prevent race conditions
  SELECT beds_available, beds_total, COALESCE(occupied_bed_numbers, '{}'::integer[])
    INTO _beds_available, _beds_total, _owner_occupied_beds
  FROM public.rooms
  WHERE id = _room_id
  FOR UPDATE;

  IF _beds_available IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF _beds_available <= 0 THEN
    RAISE EXCEPTION 'No beds available in this room. Please select another room.';
  END IF;

  IF _bed_number < 1 OR _bed_number > _beds_total THEN
    RAISE EXCEPTION 'Selected bed is invalid.';
  END IF;

  -- Block owner-marked occupied beds
  IF _owner_occupied_beds @> ARRAY[_bed_number] THEN
    RAISE EXCEPTION 'This bed is already occupied. Please select another available bed.';
  END IF;

  -- Check if the specific bed is already taken by another booking
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE room_id = _room_id
      AND bed_number = _bed_number
      AND status IN ('pending', 'confirmed')
  ) INTO _bed_already_taken;

  IF _bed_already_taken THEN
    RAISE EXCEPTION 'This bed is already occupied. Please select another available bed.';
  END IF;

  -- Insert the booking
  INSERT INTO public.bookings (
    room_id, user_id, hostel_id, bed_number, move_in_date,
    rent_per_bed, deposit_paid, advance_paid, status, notes
  ) VALUES (
    _room_id, _user_id, _hostel_id, _bed_number, _move_in_date,
    _rent_per_bed, 0, 0, 'pending', _notes
  )
  RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;

-- 2. Fix user_roles INSERT policy: restrict to student/owner only
DROP POLICY IF EXISTS "Users can insert own role during signup" ON public.user_roles;

CREATE POLICY "Users can insert own role during signup"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('student'::app_role, 'owner'::app_role)
);

-- 3. Fix overly permissive storage policies on hostel-images
DROP POLICY IF EXISTS "Owners can delete their hostel images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their hostel images" ON storage.objects;
