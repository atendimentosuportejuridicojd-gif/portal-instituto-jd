ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS protegida boolean NOT NULL DEFAULT false;

UPDATE public.disciplinas d
SET protegida = true
WHERE EXISTS (SELECT 1 FROM public.disciplina_senhas s WHERE s.disciplina_id = d.id);