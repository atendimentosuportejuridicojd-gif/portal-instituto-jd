CREATE INDEX IF NOT EXISTS questoes_material_id_publicado_idx
  ON public.questoes (material_id, publicado);

CREATE OR REPLACE FUNCTION public.contar_questoes_por_material(_somente_publicadas boolean DEFAULT false)
RETURNS TABLE (material_id uuid, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT q.material_id, count(*)::bigint
  FROM public.questoes q
  WHERE q.material_id IS NOT NULL
    AND (NOT _somente_publicadas OR q.publicado = true)
  GROUP BY q.material_id;
$$;

GRANT EXECUTE ON FUNCTION public.contar_questoes_por_material(boolean) TO authenticated;