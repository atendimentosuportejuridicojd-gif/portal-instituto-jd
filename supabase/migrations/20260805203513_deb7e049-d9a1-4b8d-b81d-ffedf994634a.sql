ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'aluno_teste';

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
        AND ur.role::text IN ('administrador', 'aluno_teste')
    )
    OR public.is_assinatura_ativa(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.bloqueado = true
  );
$function$;

DROP POLICY IF EXISTS "Admins gerenciam funcoes" ON public.user_roles;
CREATE POLICY "Admins gerenciam funcoes"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;