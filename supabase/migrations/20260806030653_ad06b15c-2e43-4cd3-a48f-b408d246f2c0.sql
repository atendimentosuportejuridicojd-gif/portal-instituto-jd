ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS especifica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS concurso_id uuid REFERENCES public.concursos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS disciplinas_concurso_id_idx ON public.disciplinas (concurso_id);
CREATE INDEX IF NOT EXISTS disciplinas_especifica_idx ON public.disciplinas (especifica);