-- Estrutura da prova de cada concurso: quantas questões de cada disciplina e o peso dela.
-- Preenchida pelo administrador; usada para montar os simulados do cronograma.
CREATE TABLE IF NOT EXISTS public.concurso_prova_estrutura (
  concurso_id uuid NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  qtd_questoes integer NOT NULL CHECK (qtd_questoes > 0),
  peso numeric(5, 2) NOT NULL DEFAULT 1 CHECK (peso > 0),
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (concurso_id, disciplina_id)
);

CREATE TRIGGER concurso_prova_estrutura_touch BEFORE UPDATE ON public.concurso_prova_estrutura
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.concurso_prova_estrutura ENABLE ROW LEVEL SECURITY;

-- Alunos leem a estrutura de concursos publicados (o cronograma e os simulados precisam dela);
-- só o administrador escreve.
CREATE POLICY "concurso_prova_estrutura_select" ON public.concurso_prova_estrutura
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador')
    OR EXISTS (SELECT 1 FROM public.concursos c WHERE c.id = concurso_id AND c.publicado)
  );
CREATE POLICY "concurso_prova_estrutura_admin_all" ON public.concurso_prova_estrutura
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.concurso_prova_estrutura TO authenticated;
GRANT ALL ON public.concurso_prova_estrutura TO service_role;
REVOKE ALL ON public.concurso_prova_estrutura FROM anon;

COMMENT ON TABLE public.concurso_prova_estrutura IS 'Estrutura da prova por concurso: questões e peso por disciplina.';
