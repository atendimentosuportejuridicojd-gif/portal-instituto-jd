CREATE POLICY "Admins podem ver arquivos do acervo"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'materiais' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins podem enviar arquivos do acervo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'materiais' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins podem atualizar arquivos do acervo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'materiais' AND public.has_role(auth.uid(), 'administrador'))
WITH CHECK (bucket_id = 'materiais' AND public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins podem excluir arquivos do acervo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'materiais' AND public.has_role(auth.uid(), 'administrador'));