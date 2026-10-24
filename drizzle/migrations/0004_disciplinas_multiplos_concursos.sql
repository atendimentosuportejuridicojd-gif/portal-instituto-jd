ALTER TABLE public.disciplinas ADD COLUMN IF NOT EXISTS concurso_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
UPDATE public.disciplinas SET concurso_ids = ARRAY[concurso_id] WHERE concurso_id IS NOT NULL AND concurso_ids = '{}';
CREATE INDEX IF NOT EXISTS disciplinas_concurso_ids_idx ON public.disciplinas USING gin (concurso_ids);
COMMENT ON COLUMN public.disciplinas.concurso_id IS 'DEPRECATED: replaced by concurso_ids (kept in sync with the first id)';