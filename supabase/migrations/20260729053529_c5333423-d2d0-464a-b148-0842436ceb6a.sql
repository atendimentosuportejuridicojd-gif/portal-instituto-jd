
CREATE OR REPLACE FUNCTION public.is_assinatura_ativa(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assinaturas
    WHERE user_id = _user_id
      AND status = 'ativa'
      AND (fim IS NULL OR fim > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.registrar_ultimo_acesso()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET ultimo_acesso_em = now()
  WHERE id = auth.uid();
$$;
