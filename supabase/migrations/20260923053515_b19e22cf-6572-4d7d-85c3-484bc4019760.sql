DROP POLICY IF EXISTS "trilhas_read_auth" ON public.trilhas;
CREATE POLICY "trilhas_read_auth"
ON public.trilhas
FOR SELECT
TO authenticated
USING (public.tem_acesso_conteudo());

DROP POLICY IF EXISTS "config_read_authenticated" ON public.configuracoes_plataforma;
CREATE POLICY "config_read_authenticated"
ON public.configuracoes_plataforma
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "alt_simulado_leitura_logados" ON public.simulado_alternativas;
CREATE POLICY "alt_simulado_leitura_logados"
ON public.simulado_alternativas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.simulado_questoes sq
    WHERE sq.id = simulado_alternativas.questao_id
      AND sq.publicado = true
  )
  AND (
    public.tem_acesso_conteudo()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.origem = 'simulado'
        AND p.simulado_status IN ('pendente', 'concluido')
    )
  )
);

DROP POLICY IF EXISTS "modulos_read_auth" ON public.modulos;
CREATE POLICY "modulos_read_auth"
ON public.modulos
FOR SELECT
TO authenticated
USING (public.tem_acesso_conteudo());

DROP POLICY IF EXISTS "disciplinas_read_all_auth" ON public.disciplinas;
CREATE POLICY "disciplinas_read_all_auth"
ON public.disciplinas
FOR SELECT
TO authenticated
USING (public.tem_acesso_conteudo());