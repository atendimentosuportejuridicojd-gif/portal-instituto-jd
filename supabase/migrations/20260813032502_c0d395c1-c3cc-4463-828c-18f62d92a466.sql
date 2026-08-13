ALTER TABLE public.disciplinas ADD COLUMN IF NOT EXISTS grupo TEXT NOT NULL DEFAULT 'gerais';
ALTER TABLE public.disciplinas ADD CONSTRAINT disciplinas_grupo_check CHECK (grupo IN ('gerais','especificos'));
UPDATE public.disciplinas SET grupo = 'especificos' WHERE especifica = false AND nome ILIKE '%DIREITO%';