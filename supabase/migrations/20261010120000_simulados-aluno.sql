-- Simulados do cronograma (serviço avulso). Cada simulado nasce de um bloco 'simulado' do plano do aluno e é
-- montado pela estrutura da prova do concurso, sorteando questões das matérias de cada disciplina.
-- A escrita é feita só pelo servidor (chave de serviço): o aluno apenas lê o que é dele. Assim ele não
-- consegue gravar o próprio resultado nem o gabarito direto pela API.
CREATE TABLE IF NOT EXISTS public.simulados_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cronograma_id uuid NOT NULL REFERENCES public.cronogramas_aluno(id) ON DELETE CASCADE,
  bloco_id uuid NULL REFERENCES public.cronograma_blocos(id) ON DELETE SET NULL,
  numero integer NOT NULL CHECK (numero >= 1),
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido')),
  duracao_min integer NOT NULL CHECK (duracao_min BETWEEN 10 AND 1440),
  iniciado_em timestamp with time zone NOT NULL DEFAULT now(),
  concluido_em timestamp with time zone NULL,
  total_questoes integer NOT NULL DEFAULT 0,
  acertos integer NULL,
  percentual numeric(5, 2) NULL,
  -- Média das disciplinas ponderada pelo peso cadastrado na estrutura da prova.
  nota_ponderada numeric(5, 2) NULL,
  -- Resultado por disciplina: nome, peso, pedidas, total, acertos, percentual.
  por_disciplina jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Um simulado por bloco do plano.
CREATE UNIQUE INDEX IF NOT EXISTS simulados_aluno_bloco_uidx
  ON public.simulados_aluno (bloco_id) WHERE bloco_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS simulados_aluno_user_idx
  ON public.simulados_aluno (user_id, cronograma_id, numero);

CREATE TABLE IF NOT EXISTS public.simulado_aluno_questoes (
  simulado_id uuid NOT NULL REFERENCES public.simulados_aluno(id) ON DELETE CASCADE,
  questao_id uuid NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  disciplina_id uuid NULL REFERENCES public.disciplinas(id) ON DELETE SET NULL,
  ordem integer NOT NULL DEFAULT 0,
  alternativa_id uuid NULL REFERENCES public.questao_alternativas(id) ON DELETE SET NULL,
  -- Só é preenchido ao finalizar o simulado.
  acertou boolean NULL,
  respondida_em timestamp with time zone NULL,
  PRIMARY KEY (simulado_id, questao_id)
);

ALTER TABLE public.simulados_aluno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_aluno_questoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulados_aluno_select_own" ON public.simulados_aluno
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "simulados_aluno_admin_select" ON public.simulados_aluno
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "simulado_aluno_questoes_select_own" ON public.simulado_aluno_questoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.simulados_aluno s WHERE s.id = simulado_id AND s.user_id = auth.uid()));
CREATE POLICY "simulado_aluno_questoes_admin_select" ON public.simulado_aluno_questoes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

GRANT SELECT ON public.simulados_aluno TO authenticated;
GRANT SELECT ON public.simulado_aluno_questoes TO authenticated;
GRANT ALL ON public.simulados_aluno TO service_role;
GRANT ALL ON public.simulado_aluno_questoes TO service_role;
REVOKE ALL ON public.simulados_aluno FROM anon;
REVOKE ALL ON public.simulado_aluno_questoes FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.simulados_aluno FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.simulado_aluno_questoes FROM authenticated;

COMMENT ON TABLE public.simulados_aluno IS 'Simulados do cronograma: um por bloco do plano, montado pela estrutura da prova.';
COMMENT ON TABLE public.simulado_aluno_questoes IS 'Questões sorteadas de cada simulado e as respostas do aluno.';
