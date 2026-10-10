-- "Vincular materiais exceção": por concurso, indica em qual disciplina da ESTRUTURA DA PROVA uma matéria deve
-- contar (no cronograma e nos simulados), mesmo pertencendo a outra disciplina. Exemplo: as matérias da Lei de
-- Acesso à Informação contarem dentro de Direito Administrativo no SEFAZ SC. Vale só para o concurso da linha.
-- É uma camada à parte do "Vincular materiais" (concurso_materiais), que continua igual: remover a exceção
-- devolve a matéria à disciplina de origem exatamente como estava.
CREATE TABLE IF NOT EXISTS public.concurso_materiais_excecao (
  concurso_id uuid NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
  disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (concurso_id, material_id)
);

CREATE INDEX IF NOT EXISTS concurso_materiais_excecao_destino_idx
  ON public.concurso_materiais_excecao (concurso_id, disciplina_id);

ALTER TABLE public.concurso_materiais_excecao ENABLE ROW LEVEL SECURITY;

-- Alunos leem (o cronograma e os simulados consultam com a sessão do aluno); só o administrador escreve.
CREATE POLICY "concurso_materiais_excecao_read" ON public.concurso_materiais_excecao
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "concurso_materiais_excecao_admin" ON public.concurso_materiais_excecao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.concurso_materiais_excecao TO authenticated;
GRANT ALL ON public.concurso_materiais_excecao TO service_role;
REVOKE ALL ON public.concurso_materiais_excecao FROM anon;

COMMENT ON TABLE public.concurso_materiais_excecao IS 'Matérias que, em um concurso, contam em uma disciplina da estrutura da prova diferente da sua.';
