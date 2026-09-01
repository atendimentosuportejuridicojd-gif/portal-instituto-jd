-- Remove a protecao por senha de disciplinas: era exclusiva de
-- "Tecnico Legislativo", ja excluida. Nenhuma das 22 disciplinas do
-- acervo base usa isso (protegida = false em todas). Coluna sem FK,
-- drop seguro.

BEGIN;

ALTER TABLE public.disciplinas DROP COLUMN IF EXISTS protegida;

COMMIT;
