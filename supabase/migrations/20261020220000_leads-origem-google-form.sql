-- Aceita leads do formulário de lead do Google Ads (origem 'google_form') em leads_diagnostico.
-- Só amplia o CHECK de origem; nenhuma linha é alterada.
ALTER TABLE public.leads_diagnostico DROP CONSTRAINT leads_diagnostico_origem_check;
ALTER TABLE public.leads_diagnostico
  ADD CONSTRAINT leads_diagnostico_origem_check CHECK (origem IN ('diagnostico', 'meta_form', 'google_form'));

COMMENT ON COLUMN public.leads_diagnostico.origem IS 'diagnostico (quiz antigo do site), meta_form (formulário instantâneo da Meta) ou google_form (formulário de lead do Google Ads).';
