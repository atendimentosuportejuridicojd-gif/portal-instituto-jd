-- Taxonomia do Acervo Base: codigo (G1-G11 / E1-E11) em disciplinas
-- e slug em modulos. Backfill dos 7 registros hoje ligados ao acervo
-- base + correcao dos dois slugs trocados de disciplinas de Direito
-- Penal. "Tecnico Legislativo" (concurso especifico) fica sem codigo
-- e nao e alterada.

-- 1) disciplinas.codigo -------------------------------------------------
ALTER TABLE public.disciplinas ADD COLUMN IF NOT EXISTS codigo text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'disciplinas_codigo_key'
  ) THEN
    ALTER TABLE public.disciplinas ADD CONSTRAINT disciplinas_codigo_key UNIQUE (codigo);
  END IF;
END $$;

-- 2) modulos.slug ---------------------------------------------------------
ALTER TABLE public.modulos ADD COLUMN IF NOT EXISTS slug text;

-- 3) Correcao dos slugs trocados de disciplinas (ordem importa: libera o
--    valor de "processual penal" antes de atribui-lo a "penal") ---------
UPDATE public.disciplinas
SET slug = 'nocoes-de-direito-processual-penal'
WHERE id = 'b08cc823-5f5d-494b-87e1-8487757496eb'; -- NOCOES DE DIREITO PROCESSUAL PENAL

UPDATE public.disciplinas
SET slug = 'nocoes-de-direito-penal'
WHERE id = 'f3ce3e31-2d67-45ab-a8b7-4a2bf07aaf9b'; -- NOCOES DE DIREITO PENAL

-- 4) Backfill de codigo nas 7 disciplinas existentes do acervo base -----
UPDATE public.disciplinas SET codigo = 'G1' WHERE id = '2bc5e600-8359-4771-b414-734c96604657' AND codigo IS NULL; -- LINGUA PORTUGUESA
UPDATE public.disciplinas SET codigo = 'E1' WHERE id = '17e4f860-589c-453e-a1a6-5c17d49c8318' AND codigo IS NULL; -- NOCOES DE DIREITO CONSTITUCIONAL
UPDATE public.disciplinas SET codigo = 'E2' WHERE id = '57ed4885-2fbe-454c-9c1b-59b190ad88a5' AND codigo IS NULL; -- NOCOES DE DIREITO ADMINISTRATIVO
UPDATE public.disciplinas SET codigo = 'E3' WHERE id = '261dff0f-76f8-4fc7-8f51-596a938e2cfc' AND codigo IS NULL; -- NOCOES DE DIREITO CIVIL
UPDATE public.disciplinas SET codigo = 'E4' WHERE id = '354084a4-47e8-4325-9429-9310d40b7fa3' AND codigo IS NULL; -- NOCOES DE DIREITO PROCESSUAL CIVIL
UPDATE public.disciplinas SET codigo = 'E5' WHERE id = 'f3ce3e31-2d67-45ab-a8b7-4a2bf07aaf9b' AND codigo IS NULL; -- NOCOES DE DIREITO PENAL
UPDATE public.disciplinas SET codigo = 'E6' WHERE id = 'b08cc823-5f5d-494b-87e1-8487757496eb' AND codigo IS NULL; -- NOCOES DE DIREITO PROCESSUAL PENAL
-- Tecnico Legislativo (346a03ad-38b8-4275-a020-d646dfedc08d): sem codigo, propositalmente.

-- 5) Backfill de slug nos 12 modulos existentes (todos em Tecnico
--    Legislativo), calculado a partir do nome com a mesma regra usada
--    em src/lib/acervo.server.ts (gerarSlug) ----------------------------
UPDATE public.modulos SET slug = 'direito-administrativo' WHERE id = '5bdf0b71-d168-400c-b714-bf85d6a90865' AND slug IS NULL;
UPDATE public.modulos SET slug = 'administracao-publica' WHERE id = 'ef0d9c29-3867-48d2-b11e-22819f27bd54' AND slug IS NULL;
UPDATE public.modulos SET slug = 'direito-constitucional' WHERE id = '39a44470-0714-4fbf-8787-b57a381e2936' AND slug IS NULL;
UPDATE public.modulos SET slug = 'informatica' WHERE id = 'b2171126-3501-4ded-b802-c3241aaab5b0' AND slug IS NULL;
UPDATE public.modulos SET slug = 'legislacao-institucional' WHERE id = '551e00ce-7ed9-44d4-bbe3-08c898607e72' AND slug IS NULL;
UPDATE public.modulos SET slug = 'orcamento-e-contabilidade-publica' WHERE id = 'c2da891d-c4f1-43ef-a6c4-dffb43f3098c' AND slug IS NULL;
UPDATE public.modulos SET slug = 'licitacoes-e-contratos' WHERE id = 'a8301799-b1a7-44ee-85f4-3c0d5cd4adce' AND slug IS NULL;
UPDATE public.modulos SET slug = 'gestao-de-materiais-patrimonio-e-almoxarifado' WHERE id = 'e6dce6b5-c929-4acb-b242-aa0a869547ad' AND slug IS NULL;
UPDATE public.modulos SET slug = 'gestao-de-pessoas-na-administracao-publica' WHERE id = '4750734a-2a3e-4261-9e0d-a55f67df0797' AND slug IS NULL;
UPDATE public.modulos SET slug = 'rotinas-administrativas-e-legislativas' WHERE id = '90fe7e26-769b-4a48-bde9-927691f6fab1' AND slug IS NULL;
UPDATE public.modulos SET slug = 'comunicacao-administrativa' WHERE id = '5616468d-9be4-454b-bbb5-d1bfd964221c' AND slug IS NULL;
UPDATE public.modulos SET slug = 'ouvidoria-publica' WHERE id = 'def17c39-1695-400a-a4b3-166ab88fbbae' AND slug IS NULL;

-- 6) Guarda: aborta a transacao se os slugs derivados colidirem dentro
--    da mesma disciplina (antes de tentar criar a constraint) -----------
DO $$
DECLARE
  dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT disciplina_id, slug
    FROM public.modulos
    WHERE slug IS NOT NULL
    GROUP BY disciplina_id, slug
    HAVING count(*) > 1
  ) x;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Colisao de slug em modulos: % grupo(s) duplicado(s) dentro da mesma disciplina', dup_count;
  END IF;
END $$;

-- 7) Constraint de unicidade em modulos (por disciplina) -----------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'modulos_disciplina_id_slug_key'
  ) THEN
    ALTER TABLE public.modulos ADD CONSTRAINT modulos_disciplina_id_slug_key UNIQUE (disciplina_id, slug);
  END IF;
END $$;
