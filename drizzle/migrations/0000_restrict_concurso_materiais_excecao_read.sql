ALTER POLICY "concurso_materiais_excecao_read"
ON public.concurso_materiais_excecao
TO authenticated
USING ((SELECT public.tem_acesso_conteudo()));