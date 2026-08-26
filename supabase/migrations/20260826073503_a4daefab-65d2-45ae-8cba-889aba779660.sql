-- 1) Acesso avaliado sem passar pelas políticas das tabelas de apoio
CREATE OR REPLACE FUNCTION public.tem_acesso_conteudo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- 2) Políticas com avaliação única por consulta
DROP POLICY IF EXISTS materiais_read_auth ON public.materiais;
CREATE POLICY materiais_read_auth ON public.materiais FOR SELECT
USING (
  (SELECT public.has_role(auth.uid(), 'administrador'::app_role))
  OR (publicado = true AND (SELECT public.tem_acesso_conteudo()))
);

DROP POLICY IF EXISTS materiais_admin_all ON public.materiais;
CREATE POLICY materiais_admin_all ON public.materiais FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)));

DROP POLICY IF EXISTS questoes_read ON public.questoes;
CREATE POLICY questoes_read ON public.questoes FOR SELECT
USING (
  (SELECT public.has_role(auth.uid(), 'administrador'::app_role))
  OR (publicado = true AND (SELECT public.tem_acesso_conteudo()))
);

DROP POLICY IF EXISTS questoes_admin ON public.questoes;
CREATE POLICY questoes_admin ON public.questoes FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)));

DROP POLICY IF EXISTS alt_read ON public.questao_alternativas;
CREATE POLICY alt_read ON public.questao_alternativas FOR SELECT
USING ((SELECT public.tem_acesso_conteudo()));

DROP POLICY IF EXISTS alt_admin ON public.questao_alternativas;
CREATE POLICY alt_admin ON public.questao_alternativas FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)));

DROP POLICY IF EXISTS trilha_materiais_read ON public.trilha_materiais;
CREATE POLICY trilha_materiais_read ON public.trilha_materiais FOR SELECT
USING ((SELECT public.tem_acesso_conteudo()));

DROP POLICY IF EXISTS trilha_materiais_admin ON public.trilha_materiais;
CREATE POLICY trilha_materiais_admin ON public.trilha_materiais FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)));

DROP POLICY IF EXISTS disciplinas_admin_all ON public.disciplinas;
CREATE POLICY disciplinas_admin_all ON public.disciplinas FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)));

DROP POLICY IF EXISTS trilhas_admin_all ON public.trilhas;
CREATE POLICY trilhas_admin_all ON public.trilhas FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'administrador'::app_role)));

-- 3) Índices de apoio às listagens
CREATE INDEX IF NOT EXISTS idx_questoes_publicado ON public.questoes (publicado);
CREATE INDEX IF NOT EXISTS idx_questao_alternativas_questao ON public.questao_alternativas (questao_id, ordem);
CREATE INDEX IF NOT EXISTS idx_materiais_publicado_disciplina ON public.materiais (publicado, disciplina_id);
CREATE INDEX IF NOT EXISTS idx_trilha_materiais_trilha ON public.trilha_materiais (trilha_id, ordem);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);