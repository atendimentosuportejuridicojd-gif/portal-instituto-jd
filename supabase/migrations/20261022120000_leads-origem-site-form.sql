-- Aceita leads do formulário "Escolha sua carreira" do portal (origem 'site_form') em leads_diagnostico.
-- Só amplia o CHECK de origem; nenhuma linha é alterada.
ALTER TABLE public.leads_diagnostico DROP CONSTRAINT leads_diagnostico_origem_check;
ALTER TABLE public.leads_diagnostico
  ADD CONSTRAINT leads_diagnostico_origem_check CHECK (origem IN ('diagnostico', 'meta_form', 'google_form', 'site_form'));

COMMENT ON COLUMN public.leads_diagnostico.origem IS 'diagnostico (quiz antigo), meta_form (formulário instantâneo da Meta), google_form (formulário de lead do Google Ads) ou site_form (formulário Escolha sua carreira do portal).';
