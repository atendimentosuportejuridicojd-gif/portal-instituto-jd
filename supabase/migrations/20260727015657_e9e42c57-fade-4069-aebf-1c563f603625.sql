
-- Roles enum + user_roles table (security best practice)
CREATE TYPE public.app_role AS ENUM ('administrador', 'aluno');

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome_completo TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default 'aluno' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'aluno')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Disciplinas
CREATE TABLE public.disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.disciplinas TO authenticated;
GRANT ALL ON public.disciplinas TO service_role;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disciplinas_read_all_auth" ON public.disciplinas FOR SELECT TO authenticated USING (true);
CREATE POLICY "disciplinas_admin_all" ON public.disciplinas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER disciplinas_touch BEFORE UPDATE ON public.disciplinas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Módulos (agrupamento dentro de disciplina)
CREATE TABLE public.modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.modulos TO authenticated;
GRANT ALL ON public.modulos TO service_role;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modulos_read_auth" ON public.modulos FOR SELECT TO authenticated USING (true);
CREATE POLICY "modulos_admin_all" ON public.modulos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER modulos_touch BEFORE UPDATE ON public.modulos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Materiais (PDFs do Acervo Base — nunca duplicados)
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  disciplina_id UUID REFERENCES public.disciplinas(id) ON DELETE SET NULL,
  modulo_id UUID REFERENCES public.modulos(id) ON DELETE SET NULL,
  arquivo_url TEXT,
  paginas INT,
  tags TEXT[] DEFAULT '{}',
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materiais TO authenticated;
GRANT ALL ON public.materiais TO service_role;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materiais_read_auth" ON public.materiais FOR SELECT TO authenticated USING (publicado = true OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "materiais_admin_all" ON public.materiais FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER materiais_touch BEFORE UPDATE ON public.materiais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trilhas (Técnico / Analista)
CREATE TABLE public.trilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trilhas TO authenticated;
GRANT ALL ON public.trilhas TO service_role;
ALTER TABLE public.trilhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trilhas_read_auth" ON public.trilhas FOR SELECT TO authenticated USING (true);
CREATE POLICY "trilhas_admin_all" ON public.trilhas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER trilhas_touch BEFORE UPDATE ON public.trilhas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trilha_materiais (
  trilha_id UUID NOT NULL REFERENCES public.trilhas(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  PRIMARY KEY (trilha_id, material_id)
);
GRANT SELECT ON public.trilha_materiais TO authenticated;
GRANT ALL ON public.trilha_materiais TO service_role;
ALTER TABLE public.trilha_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trilha_materiais_read" ON public.trilha_materiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "trilha_materiais_admin" ON public.trilha_materiais FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Concursos específicos
CREATE TABLE public.concursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  banca TEXT,
  edital_url TEXT,
  data_prova DATE,
  descricao TEXT,
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.concursos TO authenticated;
GRANT ALL ON public.concursos TO service_role;
ALTER TABLE public.concursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concursos_read_auth" ON public.concursos FOR SELECT TO authenticated USING (publicado = true OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "concursos_admin_all" ON public.concursos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER concursos_touch BEFORE UPDATE ON public.concursos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.concurso_materiais (
  concurso_id UUID NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  exclusivo BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0,
  PRIMARY KEY (concurso_id, material_id)
);
GRANT SELECT ON public.concurso_materiais TO authenticated;
GRANT ALL ON public.concurso_materiais TO service_role;
ALTER TABLE public.concurso_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concurso_materiais_read" ON public.concurso_materiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "concurso_materiais_admin" ON public.concurso_materiais FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Questões
CREATE TABLE public.questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enunciado TEXT NOT NULL,
  disciplina_id UUID REFERENCES public.disciplinas(id) ON DELETE SET NULL,
  banca TEXT,
  ano INT,
  orgao TEXT,
  nivel TEXT,
  comentario_professor TEXT,
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questoes TO authenticated;
GRANT ALL ON public.questoes TO service_role;
ALTER TABLE public.questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questoes_read" ON public.questoes FOR SELECT TO authenticated USING (publicado = true OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "questoes_admin" ON public.questoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER questoes_touch BEFORE UPDATE ON public.questoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.questao_alternativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questao_id UUID NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  letra TEXT NOT NULL,
  texto TEXT NOT NULL,
  correta BOOLEAN NOT NULL DEFAULT false,
  ordem INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.questao_alternativas TO authenticated;
GRANT ALL ON public.questao_alternativas TO service_role;
ALTER TABLE public.questao_alternativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alt_read" ON public.questao_alternativas FOR SELECT TO authenticated USING (true);
CREATE POLICY "alt_admin" ON public.questao_alternativas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE TABLE public.questao_tentativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  alternativa_id UUID REFERENCES public.questao_alternativas(id) ON DELETE SET NULL,
  acertou BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.questao_tentativas TO authenticated;
GRANT ALL ON public.questao_tentativas TO service_role;
ALTER TABLE public.questao_tentativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tent_own" ON public.questao_tentativas FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "tent_insert_own" ON public.questao_tentativas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Notícias
CREATE TABLE public.noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo TEXT,
  imagem_url TEXT,
  publicado BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.noticias TO authenticated;
GRANT ALL ON public.noticias TO service_role;
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "noticias_read" ON public.noticias FOR SELECT TO authenticated USING (publicado = true OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "noticias_admin" ON public.noticias FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER noticias_touch BEFORE UPDATE ON public.noticias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cronogramas
CREATE TABLE public.cronogramas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  concurso_id UUID REFERENCES public.concursos(id) ON DELETE SET NULL,
  trilha_id UUID REFERENCES public.trilhas(id) ON DELETE SET NULL,
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cronogramas TO authenticated;
GRANT ALL ON public.cronogramas TO service_role;
ALTER TABLE public.cronogramas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cron_read" ON public.cronogramas FOR SELECT TO authenticated USING (publicado = true OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "cron_admin" ON public.cronogramas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER cronogramas_touch BEFORE UPDATE ON public.cronogramas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Assinaturas
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ativa',
  plano TEXT,
  hotmart_transaction_id TEXT,
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assin_own" ON public.assinaturas FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "assin_admin" ON public.assinaturas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE TRIGGER assin_touch BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed inicial das duas trilhas
INSERT INTO public.trilhas (nome, slug, descricao, ordem) VALUES
  ('Técnico Judiciário', 'tecnico-judiciario', 'Trilha de preparação para cargos de Técnico Judiciário.', 1),
  ('Analista Judiciário', 'analista-judiciario', 'Trilha de preparação para cargos de Analista Judiciário.', 2);
