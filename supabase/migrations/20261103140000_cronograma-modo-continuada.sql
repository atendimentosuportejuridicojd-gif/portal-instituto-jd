-- Cronograma com duas direções:
--  * pos_edital  (Método J&D aplicado no Pós-edital): o que já existia; tem concurso e data da prova, com simulados.
--  * continuada  (Preparação continuada): antes do edital; o aluno escolhe uma trilha (cargo), não há data de
--    prova nem simulados. Os cronogramas existentes continuam valendo como pos_edital.
ALTER TABLE public.cronogramas_aluno
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'pos_edital',
  ADD COLUMN IF NOT EXISTS trilha_id uuid REFERENCES public.trilhas(id) ON DELETE SET NULL;

ALTER TABLE public.cronogramas_aluno ALTER COLUMN data_prova DROP NOT NULL;
ALTER TABLE public.cronogramas_aluno DROP CONSTRAINT IF EXISTS cronogramas_aluno_check;
ALTER TABLE public.cronogramas_aluno DROP CONSTRAINT IF EXISTS cronogramas_aluno_modo_check;
ALTER TABLE public.cronogramas_aluno ADD CONSTRAINT cronogramas_aluno_modo_check CHECK (
  (modo = 'pos_edital' AND data_prova IS NOT NULL AND data_prova > data_inicio)
  OR (modo = 'continuada' AND data_prova IS NULL AND usa_simulado = false)
);

CREATE INDEX IF NOT EXISTS cronogramas_aluno_trilha_idx ON public.cronogramas_aluno (trilha_id);
COMMENT ON COLUMN public.cronogramas_aluno.modo IS 'pos_edital (com concurso, data de prova e simulados) ou continuada (com trilha, sem prova nem simulados).';
