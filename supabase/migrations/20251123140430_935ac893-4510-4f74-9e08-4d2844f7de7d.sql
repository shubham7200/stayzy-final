-- Assign admin role to the admin user (stayzy4u@gmail.com)
-- First, we need to get the user_id for stayzy4u@gmail.com from auth.users
-- Then insert the admin role for that user

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user_id for stayzy4u@gmail.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'stayzy4u@gmail.com'
  LIMIT 1;
  
  -- If the user exists, insert/update their role to admin
  IF admin_user_id IS NOT NULL THEN
    -- Delete any existing role for this user to avoid conflicts
    DELETE FROM public.user_roles WHERE user_id = admin_user_id;
    
    -- Insert the admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role);
    
    RAISE NOTICE 'Admin role assigned to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User stayzy4u@gmail.com not found. Please sign up first.';
  END IF;
END $$;