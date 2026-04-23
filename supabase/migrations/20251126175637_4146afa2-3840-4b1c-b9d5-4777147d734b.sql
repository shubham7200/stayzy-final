-- Create rooms table for managing room types within hostels
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  floor INTEGER NOT NULL,
  room_no TEXT NOT NULL,
  sharing_type TEXT NOT NULL, -- e.g., '2-sharing', '3-sharing', 'single'
  beds_total INTEGER NOT NULL CHECK (beds_total > 0),
  beds_available INTEGER NOT NULL CHECK (beds_available >= 0 AND beds_available <= beds_total),
  rent_per_bed INTEGER NOT NULL CHECK (rent_per_bed > 0),
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  advance_months INTEGER NOT NULL DEFAULT 1 CHECK (advance_months >= 0),
  balcony BOOLEAN NOT NULL DEFAULT false,
  attached_bath BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(hostel_id, floor, room_no)
);

-- Add index for faster queries
CREATE INDEX idx_rooms_hostel_id ON public.rooms(hostel_id);
CREATE INDEX idx_rooms_beds_available ON public.rooms(beds_available) WHERE beds_available > 0;

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms table
CREATE POLICY "Anyone can view rooms"
  ON public.rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage their hostel rooms"
  ON public.rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.hostels
      WHERE hostels.id = rooms.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all rooms"
  ON public.rooms
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create bookings table for tracking bed bookings
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  move_in_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  rent_per_bed INTEGER NOT NULL,
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  advance_paid INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for bookings
CREATE INDEX idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_hostel_id ON public.bookings(hostel_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view bookings for their hostels"
  ON public.bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hostels
      WHERE hostels.id = bookings.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all bookings"
  ON public.bookings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on bookings
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to decrement beds_available when booking is confirmed
CREATE OR REPLACE FUNCTION public.handle_booking_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If booking status changed to 'confirmed' and was not 'confirmed' before
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Decrement beds_available
    UPDATE public.rooms
    SET beds_available = beds_available - 1
    WHERE id = NEW.room_id AND beds_available > 0;
    
    -- Check if update was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No beds available in this room';
    END IF;
  END IF;
  
  -- If booking was cancelled or completed, increment beds_available back
  IF (NEW.status = 'cancelled' OR NEW.status = 'completed') AND OLD.status = 'confirmed' THEN
    UPDATE public.rooms
    SET beds_available = beds_available + 1
    WHERE id = NEW.room_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to handle bed availability on booking status change
CREATE TRIGGER on_booking_status_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_confirmation();