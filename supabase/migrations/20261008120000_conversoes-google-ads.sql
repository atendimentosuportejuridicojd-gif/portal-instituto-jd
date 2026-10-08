-- Fila de conversões de assinatura a enviar ao Google Ads (conversão offline por clique).
-- O webhook da Hotmart grava uma linha na primeira compra aprovada de quem tem gclid no perfil;
-- um comando externo (agentes-jd) lê as pendentes, envia ao Google e marca como enviadas.
CREATE TABLE IF NOT EXISTS public.conversoes_google_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gclid text NOT NULL,
  gclid_capturado_em timestamp with time zone NULL,
  hotmart_transaction_id text NOT NULL,
  valor numeric(10, 2) NULL,
  moeda text NOT NULL DEFAULT 'BRL',
  convertido_em timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'erro')),
  erro text NULL,
  enviada_em timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Uma conversão por transação da Hotmart (a deduplicação do webhook) e uma por aluno.
CREATE UNIQUE INDEX IF NOT EXISTS conversoes_google_ads_transacao_uidx
  ON public.conversoes_google_ads (hotmart_transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS conversoes_google_ads_user_uidx
  ON public.conversoes_google_ads (user_id);
CREATE INDEX IF NOT EXISTS conversoes_google_ads_status_idx
  ON public.conversoes_google_ads (status, convertido_em);

-- Sem políticas: ninguém acessa pelo navegador. Só a chave de serviço (webhook e agentes-jd).
ALTER TABLE public.conversoes_google_ads ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.conversoes_google_ads TO service_role;
REVOKE ALL ON public.conversoes_google_ads FROM anon, authenticated;

COMMENT ON TABLE public.conversoes_google_ads IS 'Assinaturas (Hotmart) de quem veio por anúncio, a enviar ao Google Ads como conversão offline.';
