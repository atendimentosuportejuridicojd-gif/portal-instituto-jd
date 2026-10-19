ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS carreira text;
UPDATE public.profiles SET carreira = 'judiciaria' WHERE carreira IS NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_carreira_chk CHECK (carreira IS NULL OR carreira IN ('judiciaria','fiscal','policial'));

ALTER TABLE public.disciplinas ADD COLUMN IF NOT EXISTS carreiras text[] NOT NULL DEFAULT ARRAY['judiciaria']::text[];
ALTER TABLE public.trilhas ADD COLUMN IF NOT EXISTS carreiras text[] NOT NULL DEFAULT ARRAY['judiciaria']::text[];
ALTER TABLE public.concursos ADD COLUMN IF NOT EXISTS carreiras text[] NOT NULL DEFAULT ARRAY['judiciaria']::text[];
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS carreira text NOT NULL DEFAULT 'judiciaria';

CREATE OR REPLACE FUNCTION public.proteger_carreira_perfil()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.carreira IS NOT NULL AND NEW.carreira IS DISTINCT FROM OLD.carreira
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'administrador') THEN
    RAISE EXCEPTION 'A carreira já foi escolhida e não pode ser alterada.';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.proteger_carreira_perfil() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_proteger_carreira ON public.profiles;
CREATE TRIGGER trg_proteger_carreira BEFORE UPDATE OF carreira ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.proteger_carreira_perfil();