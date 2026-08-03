CREATE TABLE public.cronograma_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id uuid NOT NULL REFERENCES public.cronogramas(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materiais(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  observacoes text,
  dia integer NOT NULL DEFAULT 1,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_itens TO authenticated;
GRANT ALL ON public.cronograma_itens TO service_role;

ALTER TABLE public.cronograma_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam itens de cronograma"
ON public.cronograma_itens FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Alunos ativos veem itens de cronogramas publicados"
ON public.cronograma_itens FOR SELECT TO authenticated
USING (
  public.is_assinatura_ativa(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.cronogramas c
    WHERE c.id = cronograma_itens.cronograma_id AND c.publicado = true
  )
);

CREATE INDEX idx_cronograma_itens_cronograma ON public.cronograma_itens (cronograma_id, dia, ordem);

CREATE TRIGGER cronograma_itens_touch
BEFORE UPDATE ON public.cronograma_itens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();