-- 1) Restrict platform configuration reads to authenticated users
DROP POLICY IF EXISTS config_read_all ON public.configuracoes_plataforma;
CREATE POLICY config_read_authenticated
  ON public.configuracoes_plataforma
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.configuracoes_plataforma FROM anon;

-- 2) Trigger-only SECURITY DEFINER functions must not be callable by API roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_suporte() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- 3) Scoped storage read policy for entitled students on the private 'materiais' bucket
DROP POLICY IF EXISTS "Alunos com assinatura ativa podem ler arquivos do acervo" ON storage.objects;
CREATE POLICY "Alunos com assinatura ativa podem ler arquivos do acervo"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'materiais'
    AND EXISTS (
      SELECT 1 FROM public.materiais m
      WHERE m.storage_path = storage.objects.name
        AND m.publicado = true
    )
    AND public.is_assinatura_ativa(auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.bloqueado = true
    )
  );
