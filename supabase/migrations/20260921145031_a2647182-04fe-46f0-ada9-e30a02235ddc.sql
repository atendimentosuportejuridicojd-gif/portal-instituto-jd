CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN _user_id = auth.uid() OR EXISTS (
      SELECT 1
      FROM public.user_roles caller_roles
      WHERE caller_roles.user_id = auth.uid()
        AND caller_roles.role = 'administrador'
        AND (caller_roles.expira_em IS NULL OR caller_roles.expira_em > now())
    ) THEN EXISTS (
      SELECT 1
      FROM public.user_roles target_roles
      WHERE target_roles.user_id = _user_id
        AND target_roles.role = _role
        AND (target_roles.expira_em IS NULL OR target_roles.expira_em > now())
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;