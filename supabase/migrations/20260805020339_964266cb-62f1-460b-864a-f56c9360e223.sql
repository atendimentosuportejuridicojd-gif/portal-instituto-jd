DROP POLICY IF EXISTS "Alunos ativos veem itens de cronogramas publicados" ON public.cronograma_itens;

CREATE POLICY "Alunos ativos veem itens de cronogramas publicados"
ON public.cronograma_itens
FOR SELECT
TO authenticated
USING (
  public.tem_acesso_conteudo()
  AND EXISTS (
    SELECT 1 FROM public.cronogramas c
    WHERE c.id = cronograma_itens.cronograma_id
      AND c.publicado = true
  )
);