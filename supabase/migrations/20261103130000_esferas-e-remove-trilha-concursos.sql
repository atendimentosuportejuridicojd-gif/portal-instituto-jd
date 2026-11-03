-- Removido: "Vincular concursos" nas trilhas (trilha_concursos). O fluxo passa a ser: a trilha é um catálogo de
-- matérias do Acervo Base por cargo, e o concurso (pós-edital) usa a trilha + disciplinas exclusivas. Tabela estava vazia.
DROP TABLE IF EXISTS public.trilha_concursos;

-- Esfera de governo. Em trilhas é lista porque um cargo pode ser de mais de uma esfera (ex.: Polícia Penal e
-- Bombeiros: federal e estadual). Em concursos guarda a esfera do certame; a UF continua em concursos.estado.
ALTER TABLE public.trilhas ADD COLUMN IF NOT EXISTS esferas text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.concursos ADD COLUMN IF NOT EXISTS esferas text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.trilhas DROP CONSTRAINT IF EXISTS trilhas_esferas_check;
ALTER TABLE public.trilhas ADD CONSTRAINT trilhas_esferas_check
  CHECK (esferas <@ ARRAY['federal','estadual','municipal']::text[]);
ALTER TABLE public.concursos DROP CONSTRAINT IF EXISTS concursos_esferas_check;
ALTER TABLE public.concursos ADD CONSTRAINT concursos_esferas_check
  CHECK (esferas <@ ARRAY['federal','estadual','municipal']::text[]);

COMMENT ON COLUMN public.trilhas.esferas IS 'Esferas de governo da trilha: federal, estadual e/ou municipal.';
COMMENT ON COLUMN public.concursos.esferas IS 'Esfera do concurso: federal, estadual ou municipal. A UF fica em concursos.estado.';
