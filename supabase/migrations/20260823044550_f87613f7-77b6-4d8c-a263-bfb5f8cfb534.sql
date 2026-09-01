CREATE TABLE public.disciplina_senhas (
  disciplina_id uuid PRIMARY KEY REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  senha text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disciplina_senhas TO authenticated;
GRANT ALL ON public.disciplina_senhas TO service_role;

ALTER TABLE public.disciplina_senhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disciplina_senhas_admin_all" ON public.disciplina_senhas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

ALTER TABLE public.disciplinas ADD COLUMN protegida boolean NOT NULL DEFAULT false;

INSERT INTO public.disciplina_senhas (disciplina_id, senha)
SELECT id, senha FROM public.disciplinas WHERE senha IS NOT NULL AND btrim(senha) <> '';

UPDATE public.disciplinas d SET protegida = true
WHERE EXISTS (SELECT 1 FROM public.disciplina_senhas s WHERE s.disciplina_id = d.id);

ALTER TABLE public.disciplinas DROP COLUMN senha;

CREATE OR REPLACE FUNCTION public.sync_disciplina_protegida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.disciplinas SET protegida = false WHERE id = OLD.disciplina_id;
    RETURN OLD;
  END IF;
  UPDATE public.disciplinas SET protegida = true WHERE id = NEW.disciplina_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER disciplina_senhas_sync
AFTER INSERT OR UPDATE OR DELETE ON public.disciplina_senhas
FOR EACH ROW EXECUTE FUNCTION public.sync_disciplina_protegida();

CREATE OR REPLACE FUNCTION public.verificar_senha_disciplina(_disciplina_id uuid, _senha text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT btrim(s.senha) = btrim(_senha) FROM public.disciplina_senhas s WHERE s.disciplina_id = _disciplina_id),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.verificar_senha_disciplina(uuid, text) TO authenticated;