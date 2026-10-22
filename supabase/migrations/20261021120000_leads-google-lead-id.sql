-- Leads do formulário de lead do Google Ads (origem 'google_form'): chave de idempotência do webhook
-- e gclid, para ligar o lead à assinatura depois (fila conversoes_google_ads).
ALTER TABLE public.leads_diagnostico
  ADD COLUMN IF NOT EXISTS google_lead_id text NULL,
  ADD COLUMN IF NOT EXISTS gclid text NULL;

-- Um lead do Google vira uma única linha (NULL não conflita: leads do Diagnóstico e da Meta).
ALTER TABLE public.leads_diagnostico
  ADD CONSTRAINT leads_diagnostico_google_lead_id_key UNIQUE (google_lead_id);

COMMENT ON COLUMN public.leads_diagnostico.google_lead_id IS 'lead_id do webhook do Google Ads; chave de idempotência.';
COMMENT ON COLUMN public.leads_diagnostico.gclid IS 'gcl_id do clique que gerou o lead (formulário do Google Ads).';
