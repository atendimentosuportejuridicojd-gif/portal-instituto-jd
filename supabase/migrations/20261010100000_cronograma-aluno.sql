-- Cronograma J&D do aluno: parâmetros do plano e os blocos gerados pelo motor (src/lib/cronograma-motor.ts).
-- status: 'rascunho' (aguardando o pagamento dos simulados), 'ativo' (em uso) ou 'arquivado' (substituído).
CREATE TABLE IF NOT EXISTS public.cronogramas_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concurso_id uuid NULL REFERENCES public.concursos(id) ON DELETE SET NULL,
  concurso_nome text NOT NULL,
  data_inicio date NOT NULL,
  data_prova date NOT NULL,
  -- Minutos por dia da semana: posição 1 = domingo ... 7 = sábado.
  minutos_por_dia integer[] NOT NULL CHECK (array_length(minutos_por_dia, 1) = 7),
  minutos_por_questao integer NOT NULL DEFAULT 3 CHECK (minutos_por_questao BETWEEN 1 AND 60),
  usa_simulado boolean NOT NULL DEFAULT false,
  -- Duração da prova no edital (informada pelo aluno ao contratar os simulados).
  duracao_prova_min integer NULL CHECK (duracao_prova_min IS NULL OR duracao_prova_min BETWEEN 10 AND 1440),
  -- Disciplinas na ordem escolhida pelo aluno.
  ordem_disciplinas uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'arquivado')),
  -- Resumo do cálculo (cabe, faltam, fim do estudo, fase final, dias de sobra...).
  resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (data_prova > data_inicio)
);

-- No máximo um cronograma ativo e um rascunho por aluno.
CREATE UNIQUE INDEX IF NOT EXISTS cronogramas_aluno_ativo_uidx
  ON public.cronogramas_aluno (user_id) WHERE status = 'ativo';
CREATE UNIQUE INDEX IF NOT EXISTS cronogramas_aluno_rascunho_uidx
  ON public.cronogramas_aluno (user_id) WHERE status = 'rascunho';

CREATE TABLE IF NOT EXISTS public.cronograma_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id uuid NOT NULL REFERENCES public.cronogramas_aluno(id) ON DELETE CASCADE,
  data date NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('estudo', 'questoes', 'revisao', 'fase_final', 'simulado')),
  disciplina_id uuid NULL REFERENCES public.disciplinas(id) ON DELETE SET NULL,
  material_id uuid NULL REFERENCES public.materiais(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  minutos integer NOT NULL CHECK (minutos >= 0),
  continuacao boolean NOT NULL DEFAULT false,
  concluido boolean NOT NULL DEFAULT false,
  concluido_em timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cronograma_blocos_cronograma_data_idx
  ON public.cronograma_blocos (cronograma_id, data, ordem);

CREATE TRIGGER cronogramas_aluno_touch BEFORE UPDATE ON public.cronogramas_aluno
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cronogramas_aluno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_blocos ENABLE ROW LEVEL SECURITY;

-- O aluno enxerga e altera só o que é dele; o administrador pode ler tudo (suporte).
CREATE POLICY "cronogramas_aluno_own" ON public.cronogramas_aluno
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "cronogramas_aluno_admin_select" ON public.cronogramas_aluno
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "cronograma_blocos_own" ON public.cronograma_blocos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cronogramas_aluno c WHERE c.id = cronograma_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cronogramas_aluno c WHERE c.id = cronograma_id AND c.user_id = auth.uid()));
CREATE POLICY "cronograma_blocos_admin_select" ON public.cronograma_blocos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronogramas_aluno TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_blocos TO authenticated;
GRANT ALL ON public.cronogramas_aluno TO service_role;
GRANT ALL ON public.cronograma_blocos TO service_role;
REVOKE ALL ON public.cronogramas_aluno FROM anon;
REVOKE ALL ON public.cronograma_blocos FROM anon;

COMMENT ON TABLE public.cronogramas_aluno IS 'Cronograma J&D de cada aluno (parâmetros do plano).';
COMMENT ON TABLE public.cronograma_blocos IS 'Blocos diários gerados pelo motor do cronograma.';
