CREATE TABLE public.questao_recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questao_id uuid NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materiais(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('multiplas_respostas','alteracao_gabarito','anular_questao')),
  fundamentacao text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','deferido','indeferido')),
  resposta_admin text,
  analisado_em timestamp with time zone,
  analisado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.questao_recursos TO authenticated;
GRANT UPDATE ON public.questao_recursos TO authenticated;
GRANT ALL ON public.questao_recursos TO service_role;

ALTER TABLE public.questao_recursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno cria seus recursos"
ON public.questao_recursos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Aluno ve seus recursos"
ON public.questao_recursos FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin atualiza recursos"
ON public.questao_recursos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'administrador'))
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE INDEX idx_questao_recursos_status ON public.questao_recursos (status, created_at DESC);
CREATE INDEX idx_questao_recursos_user ON public.questao_recursos (user_id);

CREATE TRIGGER questao_recursos_touch
BEFORE UPDATE ON public.questao_recursos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();