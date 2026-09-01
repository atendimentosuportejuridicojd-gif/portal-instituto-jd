-- Preserva o tema de cada questao antes de remover o vinculo com o
-- PDF (materiais sera reconstruida do zero em seguida). Corrige
-- tambem questoes.disciplina_id, que estava dessincronizado de
-- materiais.disciplina_id (fonte real da categorizacao).

BEGIN;

ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS tema_origem text;

UPDATE public.questoes q
SET tema_origem = m.titulo,
    disciplina_id = m.disciplina_id
FROM public.materiais m
WHERE q.material_id = m.id;

UPDATE public.questoes SET material_id = NULL WHERE material_id IS NOT NULL;

COMMIT;
