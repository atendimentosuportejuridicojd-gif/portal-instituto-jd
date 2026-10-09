-- Liberação do serviço avulso "Simulados J&D" (R$ 97,00, pagamento único, válido até a data da prova).
-- A assinatura principal continua na Hotmart (tabela assinaturas). Esta tabela só diz se o aluno
-- pode usar os simulados dentro do cronograma. origem 'manual' = liberado pelo administrador;
-- 'stripe' = pago pela integração avulsa.
CREATE TABLE IF NOT EXISTS public.simulado_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'stripe')),
  referencia_externa text NULL,
  inicio timestamp with time zone NOT NULL DEFAULT now(),
  fim timestamp with time zone NULL,
  observacao text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER simulado_acessos_touch BEFORE UPDATE ON public.simulado_acessos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.simulado_acessos ENABLE ROW LEVEL SECURITY;

-- O aluno só lê o próprio acesso; o administrador gerencia tudo. A escrita da Stripe usa a chave de serviço.
CREATE POLICY "simulado_acessos_select_own" ON public.simulado_acessos
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "simulado_acessos_admin_all" ON public.simulado_acessos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulado_acessos TO authenticated;
GRANT ALL ON public.simulado_acessos TO service_role;
REVOKE ALL ON public.simulado_acessos FROM anon;

COMMENT ON TABLE public.simulado_acessos IS 'Acesso avulso aos simulados do cronograma (ativo e dentro do prazo = liberado).';
