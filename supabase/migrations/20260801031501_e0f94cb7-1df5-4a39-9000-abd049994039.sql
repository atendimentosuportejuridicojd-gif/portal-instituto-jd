ALTER TABLE public.materiais
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_permitido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tamanho_bytes bigint;

ALTER TABLE public.material_versoes
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS fixado boolean NOT NULL DEFAULT false;

ALTER TABLE public.concursos
  ADD COLUMN IF NOT EXISTS orgao text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS ano integer,
  ADD COLUMN IF NOT EXISTS observacoes text;