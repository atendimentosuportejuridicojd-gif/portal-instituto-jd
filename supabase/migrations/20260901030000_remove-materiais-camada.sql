-- Remove materiais.camada: o acervo base tem uma unica versao de cada
-- materia, escrita em profundidade maxima. A distincao Tecnico/Analista
-- acontece na alocacao por certame (trilhas/concursos), nao no texto.
-- Coluna sem FK, sem dados em uso; a constraint materiais_camada_check
-- e removida junto (definida na propria coluna).

BEGIN;

ALTER TABLE public.materiais DROP COLUMN IF EXISTS camada;

COMMIT;
