-- Add security documentation to SECURITY DEFINER functions
-- This documents their intended use to prevent misuse

COMMENT ON FUNCTION public.handle_new_user_role() IS 
'SECURITY DEFINER - Only call via auth.users trigger. Creates profile and assigns role on user signup. Do not invoke directly.';

COMMENT ON FUNCTION public.handle_booking_confirmation() IS
'SECURITY DEFINER - Only call via bookings trigger. Updates bed availability based on booking status changes. Do not invoke directly.';

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS
'SECURITY DEFINER - Used by RLS policies to check user roles. Bypasses RLS to prevent recursive checks. Safe for RLS policy use only.';