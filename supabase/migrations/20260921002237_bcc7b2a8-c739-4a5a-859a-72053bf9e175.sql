ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gclid text NULL,
  ADD COLUMN IF NOT EXISTS gclid_captured_at timestamp with time zone NULL;

COMMENT ON COLUMN public.profiles.gclid IS 'Identificador do clique do Google Ads capturado no cadastro do simulado.';
COMMENT ON COLUMN public.profiles.gclid_captured_at IS 'Data e hora em que o gclid foi capturado no cadastro do simulado.';