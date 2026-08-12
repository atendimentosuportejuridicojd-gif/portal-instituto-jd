ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS teste_solicitado_em timestamptz;

ALTER TABLE public.configuracoes_plataforma
  ADD COLUMN IF NOT EXISTS dias_teste_gratis integer NOT NULL DEFAULT 5;