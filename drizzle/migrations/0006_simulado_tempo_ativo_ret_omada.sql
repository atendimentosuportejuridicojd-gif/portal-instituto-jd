ALTER TABLE public.simulados_aluno ADD COLUMN tempo_decorrido_ms bigint NOT NULL DEFAULT 0 CHECK (tempo_decorrido_ms >= 0), ADD COLUMN questao_atual integer NOT NULL DEFAULT 0 CHECK (questao_atual >= 0);
UPDATE public.simulados_aluno SET tempo_decorrido_ms = LEAST(duracao_min::bigint * 60000, GREATEST(0, (EXTRACT(EPOCH FROM (COALESCE(concluido_em, now()) - iniciado_em)) * 1000)::bigint));
COMMENT ON COLUMN public.simulados_aluno.tempo_decorrido_ms IS 'Tempo ativo acumulado; permanece congelado enquanto o aluno está fora da prova.';
CREATE OR REPLACE FUNCTION public.salvar_progresso_simulado(p_id uuid, p_user_id uuid, p_tempo_ms bigint, p_questao integer) RETURNS void LANGUAGE sql SET search_path = public AS $$
UPDATE public.simulados_aluno SET tempo_decorrido_ms = LEAST(duracao_min::bigint * 60000, GREATEST(tempo_decorrido_ms, p_tempo_ms)), questao_atual = CASE WHEN p_tempo_ms >= tempo_decorrido_ms THEN p_questao ELSE questao_atual END WHERE id = p_id AND user_id = p_user_id AND status = 'em_andamento';
$$;
REVOKE ALL ON FUNCTION public.salvar_progresso_simulado(uuid, uuid, bigint, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_progresso_simulado(uuid, uuid, bigint, integer) TO service_role;