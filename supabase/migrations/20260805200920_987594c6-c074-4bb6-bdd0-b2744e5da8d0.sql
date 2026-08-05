ALTER TABLE public.material_leitura
  ADD COLUMN IF NOT EXISTS concluido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS concluido_em timestamp with time zone;

CREATE TABLE public.plano_estudo_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  material_id uuid REFERENCES public.materiais(id) ON DELETE SET NULL,
  data date NOT NULL,
  observacoes text,
  concluido boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_estudo_itens TO authenticated;
GRANT ALL ON public.plano_estudo_itens TO service_role;

ALTER TABLE public.plano_estudo_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia seu proprio plano"
ON public.plano_estudo_itens FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX plano_estudo_itens_user_data_idx ON public.plano_estudo_itens (user_id, data, ordem);

CREATE TRIGGER plano_estudo_itens_touch
BEFORE UPDATE ON public.plano_estudo_itens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();