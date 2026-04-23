-- Add bed_number column to bookings table for tracking which specific bed is booked
ALTER TABLE public.bookings 
ADD COLUMN bed_number integer;

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.bed_number IS 'The specific bed number (1 to beds_total) that the user has selected for booking';