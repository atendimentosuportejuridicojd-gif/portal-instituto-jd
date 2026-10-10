-- Vínculo opcional de uma disciplina ESPECÍFICA (fora do Acervo Base) com uma disciplina do Acervo Base.
-- Serve para organização no admin e para o cronograma e os simulados tratarem as matérias complementares
-- como parte da disciplina-base. A disciplina específica continua fora do Acervo Base (especifica = true);
-- o vínculo não a faz aparecer lá. Sem vínculo, ela é uma disciplina própria do concurso.
ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS disciplina_base_id uuid NULL REFERENCES public.disciplinas(id) ON DELETE SET NULL;

ALTER TABLE public.disciplinas
  ADD CONSTRAINT disciplinas_base_so_especifica CHECK (disciplina_base_id IS NULL OR especifica);
ALTER TABLE public.disciplinas
  ADD CONSTRAINT disciplinas_base_diferente_de_si CHECK (disciplina_base_id IS NULL OR disciplina_base_id <> id);

CREATE INDEX IF NOT EXISTS disciplinas_base_idx ON public.disciplinas (disciplina_base_id)
  WHERE disciplina_base_id IS NOT NULL;

COMMENT ON COLUMN public.disciplinas.disciplina_base_id IS 'Para disciplinas específicas: disciplina do Acervo Base à qual as matérias complementares se juntam no cronograma e nos simulados.';
