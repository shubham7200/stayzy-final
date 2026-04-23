
-- Add gender column to profiles
ALTER TABLE public.profiles 
ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'other'));

-- Update the trigger to store gender from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN (NEW.raw_user_meta_data->>'role') = 'owner'
        THEN 'owner'::app_role
      ELSE 'student'::app_role
    END
  );

  INSERT INTO public.profiles (id, full_name, phone, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'gender'
  );

  RETURN NEW;
END;
$$;
