-- Reconstroi materiais para suportar tanto PDF (legado, agora vazio)
-- quanto texto markdown proprio. Aplicada com a tabela ja vazia
-- (44 PDFs legados foram apagados apos backup e desvinculo das
-- questoes, que preservaram tema_origem/disciplina_id).

BEGIN;

ALTER TABLE public.materiais
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS conteudo_md text,
  ADD COLUMN IF NOT EXISTS camada text,
  ADD COLUMN IF NOT EXISTS resumo text,
  ADD COLUMN IF NOT EXISTS tempo_leitura integer;

ALTER TABLE public.materiais
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN slug SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materiais_tipo_check'
  ) THEN
    ALTER TABLE public.materiais
      ADD CONSTRAINT materiais_tipo_check CHECK (tipo IN ('pdf', 'markdown'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materiais_camada_check'
  ) THEN
    ALTER TABLE public.materiais
      ADD CONSTRAINT materiais_camada_check CHECK (camada IS NULL OR camada IN ('C1', 'C2', 'C1C2'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'materiais_disciplina_id_slug_key'
  ) THEN
    ALTER TABLE public.materiais
      ADD CONSTRAINT materiais_disciplina_id_slug_key UNIQUE (disciplina_id, slug);
  END IF;
END $$;

-- storage_path e paginas ja sao nullable no schema original; reafirmado aqui.
ALTER TABLE public.materiais
  ALTER COLUMN storage_path DROP NOT NULL,
  ALTER COLUMN paginas DROP NOT NULL;

COMMIT;
