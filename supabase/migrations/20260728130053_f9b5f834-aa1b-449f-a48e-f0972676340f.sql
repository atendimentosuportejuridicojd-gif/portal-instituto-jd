
CREATE OR REPLACE FUNCTION public.get_desempenho_material(_user_id uuid, _material_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT percentual FROM public.questao_sessoes
  WHERE user_id = _user_id AND material_id = _material_id AND status = 'concluida'
  ORDER BY concluida_em DESC NULLS LAST
  LIMIT 1;
$$;
