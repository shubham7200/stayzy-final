-- Update app_role enum to have student and owner roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('student', 'owner');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update the handle_new_user function to assign roles during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Assign role based on metadata (default to student)
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Enable realtime replication for hostels and reviews tables
ALTER TABLE public.hostels REPLICA IDENTITY FULL;
ALTER TABLE public.reviews REPLICA IDENTITY FULL;