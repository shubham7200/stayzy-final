
-- Allow students to delete their own bookings
CREATE POLICY "Users can delete their own bookings"
ON public.bookings
FOR DELETE
USING (auth.uid() = user_id);

-- Allow owners to delete bookings for their hostels
CREATE POLICY "Owners can delete bookings for their hostels"
ON public.bookings
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM hostels
  WHERE hostels.id = bookings.hostel_id
  AND hostels.owner_id = auth.uid()
));
