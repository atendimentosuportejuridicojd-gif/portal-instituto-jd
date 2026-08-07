ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS expira_em timestamptz;

CREATE OR REPLACE FUNCTION public.tem_acesso_conteudo()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'administrador'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'aluno_teste'
        AND (ur.expira_em IS NULL OR ur.expira_em > now())
    )
    OR public.is_assinatura_ativa(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.bloqueado = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.aluno_teste_ativo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = 'aluno_teste'
      AND (ur.expira_em IS NULL OR ur.expira_em > now())
  );
$function$;

REVOKE ALL ON FUNCTION public.aluno_teste_ativo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aluno_teste_ativo(uuid) TO authenticated, service_role;