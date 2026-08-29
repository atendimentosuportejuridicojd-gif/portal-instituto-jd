CREATE TABLE IF NOT EXISTS public.sessoes_ativas (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessoes_ativas TO authenticated;
GRANT ALL ON public.sessoes_ativas TO service_role;

ALTER TABLE public.sessoes_ativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessoes_ativas_select_own" ON public.sessoes_ativas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'administrador'
  ));

CREATE POLICY "sessoes_ativas_insert_own" ON public.sessoes_ativas
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessoes_ativas_update_own" ON public.sessoes_ativas
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessoes_ativas_delete_own" ON public.sessoes_ativas
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER sessoes_ativas_touch BEFORE UPDATE ON public.sessoes_ativas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();