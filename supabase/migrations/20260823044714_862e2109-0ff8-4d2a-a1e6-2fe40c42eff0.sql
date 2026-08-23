REVOKE ALL ON FUNCTION public.verificar_senha_disciplina(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verificar_senha_disciplina(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verificar_senha_disciplina(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.sync_disciplina_protegida() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_disciplina_protegida() FROM anon;
REVOKE ALL ON FUNCTION public.sync_disciplina_protegida() FROM authenticated;