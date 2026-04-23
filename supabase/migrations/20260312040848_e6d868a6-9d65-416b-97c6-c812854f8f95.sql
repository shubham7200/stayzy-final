
-- FIX 1: Prevent admin role escalation via signup metadata
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

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  RETURN NEW;
END;
$$;

-- FIX 2: Enable RLS and deny all access on legacy tables
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all" ON public.owners FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.payments FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.students FOR ALL USING (false);
CREATE POLICY "deny_all" ON public.vacations FOR ALL USING (false);
