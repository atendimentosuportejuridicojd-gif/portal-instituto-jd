
-- 1. Extend questoes
ALTER TABLE public.questoes
  ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materiais(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS referencia text,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS questoes_material_id_idx ON public.questoes(material_id);

-- 2. Create questao_sessoes
CREATE TABLE IF NOT EXISTS public.questao_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluida')),
  total_questoes integer NOT NULL DEFAULT 0,
  acertos integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  percentual numeric(5,2) NOT NULL DEFAULT 0,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questao_sessoes TO authenticated;
GRANT ALL ON public.questao_sessoes TO service_role;

ALTER TABLE public.questao_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessoes_own ON public.questao_sessoes;
CREATE POLICY sessoes_own ON public.questao_sessoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));

DROP POLICY IF EXISTS sessoes_insert_own ON public.questao_sessoes;
CREATE POLICY sessoes_insert_own ON public.questao_sessoes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessoes_update_own ON public.questao_sessoes;
CREATE POLICY sessoes_update_own ON public.questao_sessoes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessoes_admin ON public.questao_sessoes;
CREATE POLICY sessoes_admin ON public.questao_sessoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE INDEX IF NOT EXISTS sessoes_user_material_idx ON public.questao_sessoes(user_id, material_id);
CREATE INDEX IF NOT EXISTS sessoes_status_idx ON public.questao_sessoes(status);

CREATE TRIGGER trg_sessoes_updated_at BEFORE UPDATE ON public.questao_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Extend questao_tentativas
ALTER TABLE public.questao_tentativas
  ADD COLUMN IF NOT EXISTS sessao_id uuid REFERENCES public.questao_sessoes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS tentativas_sessao_idx ON public.questao_tentativas(sessao_id);
CREATE UNIQUE INDEX IF NOT EXISTS tentativas_sessao_questao_uidx
  ON public.questao_tentativas(sessao_id, questao_id)
  WHERE sessao_id IS NOT NULL;

-- 4. Desempenho helper
CREATE OR REPLACE FUNCTION public.get_desempenho_material(_user_id uuid, _material_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT percentual FROM public.questao_sessoes
  WHERE user_id = _user_id AND material_id = _material_id AND status = 'concluida'
  ORDER BY concluida_em DESC NULLS LAST
  LIMIT 1;
$$;
