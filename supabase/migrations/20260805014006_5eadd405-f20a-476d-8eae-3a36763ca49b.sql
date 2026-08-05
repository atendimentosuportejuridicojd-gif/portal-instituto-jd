
-- Helper: acesso ao conteúdo pago (invoker: respeita RLS de assinaturas/profiles)
CREATE OR REPLACE FUNCTION public.tem_acesso_conteudo()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'administrador')
    OR (
      public.is_assinatura_ativa(auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.bloqueado = true
      )
    );
$$;

REVOKE ALL ON FUNCTION public.tem_acesso_conteudo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tem_acesso_conteudo() TO authenticated, service_role;

-- materiais
DROP POLICY IF EXISTS materiais_read_auth ON public.materiais;
CREATE POLICY materiais_read_auth ON public.materiais
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'administrador')
    OR (publicado = true AND public.tem_acesso_conteudo())
  );

-- material_versoes
DROP POLICY IF EXISTS material_versoes_select ON public.material_versoes;
CREATE POLICY material_versoes_select ON public.material_versoes
  FOR SELECT TO authenticated
  USING (public.tem_acesso_conteudo());

-- questoes
DROP POLICY IF EXISTS questoes_read ON public.questoes;
CREATE POLICY questoes_read ON public.questoes
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'administrador')
    OR (publicado = true AND public.tem_acesso_conteudo())
  );

-- questao_alternativas
DROP POLICY IF EXISTS alt_read ON public.questao_alternativas;
CREATE POLICY alt_read ON public.questao_alternativas
  FOR SELECT TO authenticated
  USING (public.tem_acesso_conteudo());

-- cronogramas
DROP POLICY IF EXISTS cron_read ON public.cronogramas;
CREATE POLICY cron_read ON public.cronogramas
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'administrador')
    OR (publicado = true AND public.tem_acesso_conteudo())
  );

-- trilha_materiais
DROP POLICY IF EXISTS trilha_materiais_read ON public.trilha_materiais;
CREATE POLICY trilha_materiais_read ON public.trilha_materiais
  FOR SELECT TO authenticated
  USING (public.tem_acesso_conteudo());

-- concurso_materiais
DROP POLICY IF EXISTS concurso_materiais_read ON public.concurso_materiais;
CREATE POLICY concurso_materiais_read ON public.concurso_materiais
  FOR SELECT TO authenticated
  USING (public.tem_acesso_conteudo());
