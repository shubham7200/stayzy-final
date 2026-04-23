
-- Remove the INSERT policy - the handle_new_user_role trigger (SECURITY DEFINER) 
-- already handles role assignment during signup, so no public INSERT policy is needed
DROP POLICY IF EXISTS "Users can insert own role during signup" ON public.user_roles;
