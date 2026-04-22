
CREATE OR REPLACE FUNCTION public.validate_and_book_bed(
  _room_id uuid,
  _user_id uuid,
  _hostel_id uuid,
  _bed_number integer,
  _move_in_date date,
  _rent_per_bed integer,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking_id uuid;
  _beds_available integer;
  _bed_already_taken boolean;
BEGIN
  -- Lock the room row to prevent race conditions
  SELECT beds_available INTO _beds_available
  FROM public.rooms
  WHERE id = _room_id
  FOR UPDATE;

  IF _beds_available IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF _beds_available <= 0 THEN
    RAISE EXCEPTION 'No beds available in this room. Please select another room.';
  END IF;

  -- Check if the specific bed is already taken
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
