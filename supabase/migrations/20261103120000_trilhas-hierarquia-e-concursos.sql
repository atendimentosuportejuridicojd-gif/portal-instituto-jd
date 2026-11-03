-- Trilhas em dois níveis: o órgão (trilha-pai) e os cargos (subtrilhas). Uma subtrilha aponta para o órgão.
ALTER TABLE public.trilhas ADD COLUMN IF NOT EXISTS trilha_pai_id uuid REFERENCES public.trilhas(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS trilhas_trilha_pai_id_idx ON public.trilhas (trilha_pai_id);

-- "Vincular concursos": a trilha puxa as matérias (concurso_materiais) dos concursos vinculados.
-- Não copia nada para trilha_materiais: a lista da trilha = vínculos manuais + matérias dos concursos vinculados,
-- então acompanha qualquer mudança futura no concurso e desvincular o concurso devolve a trilha ao estado anterior.
CREATE TABLE IF NOT EXISTS public.trilha_concursos (
  trilha_id uuid NOT NULL REFERENCES public.trilhas(id) ON DELETE CASCADE,
  concurso_id uuid NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (trilha_id, concurso_id)
);

CREATE INDEX IF NOT EXISTS trilha_concursos_concurso_idx ON public.trilha_concursos (concurso_id);

ALTER TABLE public.trilha_concursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trilha_concursos_read" ON public.trilha_concursos
  FOR SELECT TO authenticated USING ((SELECT public.tem_acesso_conteudo()));
CREATE POLICY "trilha_concursos_admin" ON public.trilha_concursos
  FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'administrador')))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'administrador')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trilha_concursos TO authenticated;
GRANT ALL ON public.trilha_concursos TO service_role;
REVOKE ALL ON public.trilha_concursos FROM anon;

COMMENT ON TABLE public.trilha_concursos IS 'Concursos vinculados a uma trilha; as matérias deles passam a fazer parte da trilha.';
