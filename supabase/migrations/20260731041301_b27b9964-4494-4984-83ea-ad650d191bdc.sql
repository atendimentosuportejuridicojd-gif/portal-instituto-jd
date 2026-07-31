-- Materiais: versionamento
ALTER TABLE public.materiais
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS publicado_em timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz;

-- Noticias: fixar no topo
ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS fixado boolean NOT NULL DEFAULT false;

-- Histórico de versões dos PDFs
CREATE TABLE IF NOT EXISTS public.material_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  arquivo_url text,
  notas text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, versao)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_versoes TO authenticated;
GRANT ALL ON public.material_versoes TO service_role;
ALTER TABLE public.material_versoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_versoes_select" ON public.material_versoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "material_versoes_admin_write" ON public.material_versoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Progresso de leitura por aluno
CREATE TABLE IF NOT EXISTS public.material_leitura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  ultima_pagina integer NOT NULL DEFAULT 1,
  versao_vista integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, material_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_leitura TO authenticated;
GRANT ALL ON public.material_leitura TO service_role;
ALTER TABLE public.material_leitura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_leitura_own" ON public.material_leitura
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER material_leitura_set_updated_at BEFORE UPDATE ON public.material_leitura
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('material','trilha','concurso','noticia')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tipo, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favoritos TO authenticated;
GRANT ALL ON public.favoritos TO service_role;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favoritos_own" ON public.favoritos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Administrador oficial de suporte
CREATE OR REPLACE FUNCTION public.grant_admin_suporte()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'atendimento.suportejuridicojd@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'administrador')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin_suporte ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin_suporte
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_suporte();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin_suporte ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_admin_suporte
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_suporte();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'administrador' FROM auth.users
WHERE lower(email) = 'atendimento.suportejuridicojd@gmail.com'
  AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;