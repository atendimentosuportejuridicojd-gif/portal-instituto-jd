ALTER TABLE public.questao_sessoes ADD COLUMN IF NOT EXISTS banca text;
CREATE OR REPLACE FUNCTION public.contar_questoes_por_material_banca(_banca text)
 RETURNS TABLE(material_id uuid, total bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT q.material_id, count(*)::bigint FROM public.questoes q
  WHERE q.material_id IS NOT NULL AND q.publicado = true AND upper(q.banca) = upper(_banca)
  GROUP BY q.material_id;
$$;
GRANT EXECUTE ON FUNCTION public.contar_questoes_por_material_banca(text) TO authenticated, service_role;