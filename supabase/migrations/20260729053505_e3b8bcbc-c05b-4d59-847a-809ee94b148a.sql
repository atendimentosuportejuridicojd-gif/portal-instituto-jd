
-- ============ assinaturas: novos campos ============
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS hotmart_subscriber_code text,
  ADD COLUMN IF NOT EXISTS produto text,
  ADD COLUMN IF NOT EXISTS ultima_renovacao_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_evento text,
  ADD COLUMN IF NOT EXISTS ultimo_evento_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_subscriber_code_uidx
  ON public.assinaturas (hotmart_subscriber_code)
  WHERE hotmart_subscriber_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS assinaturas_user_status_idx
  ON public.assinaturas (user_id, status);

-- ============ profiles: novos campos ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ultimo_acesso_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo text;

-- allow admin to update any profile (block/unblock, edit name)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_admin_all'
  ) THEN
    CREATE POLICY profiles_admin_all ON public.profiles
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'administrador'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));
  END IF;
END $$;

-- ============ notificacoes ============
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'sistema',
  link text,
  escopo text NOT NULL DEFAULT 'todos',
  target_user_id uuid,
  publicada_em timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notificacoes_read ON public.notificacoes
  FOR SELECT TO authenticated
  USING (
    escopo = 'todos'
    OR target_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'administrador'::app_role)
  );

CREATE POLICY notificacoes_admin ON public.notificacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE INDEX IF NOT EXISTS notificacoes_publicada_em_idx
  ON public.notificacoes (publicada_em DESC);

-- ============ notificacoes_leituras ============
CREATE TABLE IF NOT EXISTS public.notificacoes_leituras (
  notificacao_id uuid NOT NULL REFERENCES public.notificacoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lida_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notificacao_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.notificacoes_leituras TO authenticated;
GRANT ALL ON public.notificacoes_leituras TO service_role;

ALTER TABLE public.notificacoes_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY nleituras_own ON public.notificacoes_leituras
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY nleituras_insert_own ON public.notificacoes_leituras
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY nleituras_delete_own ON public.notificacoes_leituras
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============ admin_logs ============
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  acao text NOT NULL,
  entidade text,
  entidade_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_logs_admin_read ON public.admin_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE INDEX IF NOT EXISTS admin_logs_created_at_idx
  ON public.admin_logs (created_at DESC);

-- ============ configuracoes_plataforma (singleton) ============
CREATE TABLE IF NOT EXISTS public.configuracoes_plataforma (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  nome_plataforma text NOT NULL DEFAULT 'Portal do Aluno – Instituto J&D Especialistas na Carreira Judiciária',
  nome_curto text NOT NULL DEFAULT 'Instituto J&D',
  logo_url text,
  favicon_url text,
  email_contato text,
  telefone text,
  whatsapp text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  linkedin_url text,
  hotmart_regularizacao_url text,
  texto_rodape text,
  sobre text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.configuracoes_plataforma TO authenticated, anon;
GRANT ALL ON public.configuracoes_plataforma TO service_role;

ALTER TABLE public.configuracoes_plataforma ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_read_all ON public.configuracoes_plataforma
  FOR SELECT USING (true);

CREATE POLICY config_admin_write ON public.configuracoes_plataforma
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));

INSERT INTO public.configuracoes_plataforma (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

-- ============ Helper: is_assinatura_ativa ============
CREATE OR REPLACE FUNCTION public.is_assinatura_ativa(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assinaturas
    WHERE user_id = _user_id
      AND status = 'ativa'
      AND (fim IS NULL OR fim > now())
  );
$$;

-- ============ Helper: registrar_ultimo_acesso ============
CREATE OR REPLACE FUNCTION public.registrar_ultimo_acesso()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET ultimo_acesso_em = now()
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_assinatura_ativa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_ultimo_acesso() TO authenticated;
