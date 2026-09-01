REVOKE ALL ON FUNCTION public.tem_acesso_conteudo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tem_acesso_conteudo() FROM anon;
GRANT EXECUTE ON FUNCTION public.tem_acesso_conteudo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_acesso_conteudo() TO service_role;