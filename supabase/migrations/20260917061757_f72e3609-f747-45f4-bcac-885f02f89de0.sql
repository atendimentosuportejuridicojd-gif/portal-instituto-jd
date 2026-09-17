ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS simulado_status text,
  ADD COLUMN IF NOT EXISTS simulado_ativado_em timestamptz;

CREATE TABLE public.simulado_questoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  questao_id text NOT NULL UNIQUE,
  materia text NOT NULL,
  enunciado text NOT NULL,
  comentario text,
  ordem integer NOT NULL DEFAULT 0,
  publicado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.simulado_questoes TO authenticated;
GRANT ALL ON public.simulado_questoes TO service_role;
ALTER TABLE public.simulado_questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questoes_simulado_leitura_logados" ON public.simulado_questoes
  FOR SELECT TO authenticated USING (publicado = true OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "questoes_simulado_admin" ON public.simulado_questoes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER simulado_questoes_touch BEFORE UPDATE ON public.simulado_questoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.simulado_alternativas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  questao_id uuid NOT NULL REFERENCES public.simulado_questoes(id) ON DELETE CASCADE,
  letra text NOT NULL,
  texto text NOT NULL,
  correta boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (questao_id, letra)
);
GRANT SELECT ON public.simulado_alternativas TO authenticated;
GRANT ALL ON public.simulado_alternativas TO service_role;
ALTER TABLE public.simulado_alternativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alt_simulado_leitura_logados" ON public.simulado_alternativas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "alt_simulado_admin" ON public.simulado_alternativas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE TABLE public.simulado_tentativas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'em_andamento',
  total_questoes integer NOT NULL DEFAULT 0,
  acertos integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  percentual numeric NOT NULL DEFAULT 0,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.simulado_tentativas TO authenticated;
GRANT ALL ON public.simulado_tentativas TO service_role;
ALTER TABLE public.simulado_tentativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tent_simulado_own_select" ON public.simulado_tentativas
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "tent_simulado_own_insert" ON public.simulado_tentativas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tent_simulado_own_update" ON public.simulado_tentativas
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER simulado_tentativas_touch BEFORE UPDATE ON public.simulado_tentativas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.simulado_respostas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tentativa_id uuid NOT NULL REFERENCES public.simulado_tentativas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questao_id uuid NOT NULL REFERENCES public.simulado_questoes(id) ON DELETE CASCADE,
  alternativa_id uuid REFERENCES public.simulado_alternativas(id) ON DELETE SET NULL,
  acertou boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tentativa_id, questao_id)
);
GRANT SELECT, INSERT ON public.simulado_respostas TO authenticated;
GRANT ALL ON public.simulado_respostas TO service_role;
ALTER TABLE public.simulado_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resp_simulado_own_select" ON public.simulado_respostas
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "resp_simulado_own_insert" ON public.simulado_respostas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_simulado_questoes_ordem ON public.simulado_questoes (publicado, ordem);
CREATE INDEX idx_simulado_alt_questao ON public.simulado_alternativas (questao_id);
CREATE INDEX idx_simulado_tent_user ON public.simulado_tentativas (user_id, status);
CREATE INDEX idx_simulado_resp_tent ON public.simulado_respostas (tentativa_id);