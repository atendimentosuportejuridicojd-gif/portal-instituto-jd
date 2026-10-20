-- Leads do formulário instantâneo da Meta ("Formulário Carreira 360") na mesma tabela do Diagnóstico.
-- A gravação é feita só pelo servidor (service role): webhook da Meta e importação de CSV.

ALTER TABLE public.leads_diagnostico
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'diagnostico',
  ADD COLUMN IF NOT EXISTS meta_lead_id text NULL,
  ADD COLUMN IF NOT EXISTS email text NULL,
  ADD COLUMN IF NOT EXISTS carreira text NULL,
  ADD COLUMN IF NOT EXISTS como_estuda text NULL,
  ADD COLUMN IF NOT EXISTS horas_dia text NULL,
  ADD COLUMN IF NOT EXISTS prazo_prova text NULL,
  ADD COLUMN IF NOT EXISTS form_id text NULL,
  ADD COLUMN IF NOT EXISTS ad_id text NULL,
  ADD COLUMN IF NOT EXISTS adgroup_id text NULL,
  ADD COLUMN IF NOT EXISTS campanha text NULL,
  ADD COLUMN IF NOT EXISTS consentimento boolean NULL,
  ADD COLUMN IF NOT EXISTS payload_bruto jsonb NULL,
  ADD COLUMN IF NOT EXISTS avisos text[] NOT NULL DEFAULT '{}';

-- Leads da Meta não têm pista nem respostas do quiz, e o telefone pode faltar.
ALTER TABLE public.leads_diagnostico
  ALTER COLUMN pista DROP NOT NULL,
  ALTER COLUMN telefone DROP NOT NULL,
  ALTER COLUMN respostas SET DEFAULT '{}'::jsonb;

-- Idempotência do webhook: um lead da Meta vira uma única linha (NULL não conflita: leads do Diagnóstico).
ALTER TABLE public.leads_diagnostico
  ADD CONSTRAINT leads_diagnostico_meta_lead_id_key UNIQUE (meta_lead_id);

ALTER TABLE public.leads_diagnostico
  ADD CONSTRAINT leads_diagnostico_origem_check CHECK (origem IN ('diagnostico', 'meta_form'));

CREATE INDEX IF NOT EXISTS leads_diagnostico_origem_idx ON public.leads_diagnostico (origem, criado_em DESC);

-- RLS: só administradores leem. Sem políticas de escrita: quem grava é a service role.
ALTER TABLE public.leads_diagnostico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_diagnostico_admin_select" ON public.leads_diagnostico;
CREATE POLICY "leads_diagnostico_admin_select" ON public.leads_diagnostico
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrador'));
-- A tabela guarda e-mail e telefone: tira os grants amplos (inclusive TRUNCATE, que o RLS não barra).
REVOKE ALL ON public.leads_diagnostico FROM anon, authenticated;
GRANT SELECT ON public.leads_diagnostico TO authenticated;
GRANT ALL ON public.leads_diagnostico TO service_role;

COMMENT ON COLUMN public.leads_diagnostico.origem IS 'diagnostico (quiz do site) ou meta_form (formulário instantâneo da Meta).';
COMMENT ON COLUMN public.leads_diagnostico.meta_lead_id IS 'leadgen_id da Meta; chave de idempotência.';
COMMENT ON COLUMN public.leads_diagnostico.campanha IS 'Nome da campanha (a resolver depois; o webhook guarda só form_id, ad_id e adgroup_id).';
COMMENT ON COLUMN public.leads_diagnostico.consentimento IS 'true só se alguma caixa de custom_disclaimer_responses veio marcada; false se há caixas e nenhuma marcada; NULL se o formulário não tem caixa.';
COMMENT ON COLUMN public.leads_diagnostico.avisos IS 'Avisos da pontuação (resposta desconhecida, telefone inválido etc.).';
