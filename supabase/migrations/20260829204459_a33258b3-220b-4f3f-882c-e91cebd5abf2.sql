ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS anulada boolean NOT NULL DEFAULT false;
ALTER TABLE public.questao_recursos ADD COLUMN IF NOT EXISTS acao_aplicada text;
ALTER TABLE public.questao_recursos ADD COLUMN IF NOT EXISTS alunos_afetados integer;

CREATE OR REPLACE FUNCTION public.aplicar_recurso_questao(
  _questao_id uuid,
  _acao text,
  _alternativas uuid[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _afetados integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso restrito.';
  END IF;

  IF _acao = 'anular' THEN
    UPDATE public.questoes SET anulada = true WHERE id = _questao_id;
    UPDATE public.questao_tentativas SET acertou = true
    WHERE questao_id = _questao_id AND acertou = false;

  ELSIF _acao IN ('alterar_gabarito', 'multiplas_respostas') THEN
    IF _alternativas IS NULL OR array_length(_alternativas, 1) IS NULL THEN
      RAISE EXCEPTION 'Informe as alternativas corretas.';
    END IF;

    UPDATE public.questoes SET anulada = false WHERE id = _questao_id;

    UPDATE public.questao_alternativas
    SET correta = (id = ANY(_alternativas))
    WHERE questao_id = _questao_id;

    UPDATE public.questao_tentativas t
    SET acertou = (t.alternativa_id = ANY(_alternativas))
    WHERE t.questao_id = _questao_id
      AND t.acertou <> (t.alternativa_id = ANY(_alternativas));
  ELSE
    RAISE EXCEPTION 'Ação inválida.';
  END IF;

  -- Recalcula o desempenho das sessões que contêm esta questão
  WITH sessoes AS (
    SELECT DISTINCT sessao_id FROM public.questao_tentativas
    WHERE questao_id = _questao_id AND sessao_id IS NOT NULL
  ), totais AS (
    SELECT t.sessao_id,
           count(*) FILTER (WHERE t.acertou) AS acertos,
           count(*) FILTER (WHERE NOT t.acertou) AS erros
    FROM public.questao_tentativas t
    JOIN sessoes s ON s.sessao_id = t.sessao_id
    GROUP BY t.sessao_id
  )
  UPDATE public.questao_sessoes qs
  SET acertos = tt.acertos,
      erros = tt.erros,
      percentual = CASE WHEN (tt.acertos + tt.erros) > 0
        THEN round((tt.acertos::numeric * 100) / (tt.acertos + tt.erros), 2) ELSE 0 END,
      updated_at = now()
  FROM totais tt
  WHERE qs.id = tt.sessao_id;

  SELECT count(DISTINCT user_id) INTO _afetados
  FROM public.questao_tentativas WHERE questao_id = _questao_id;

  RETURN COALESCE(_afetados, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_recurso_questao(uuid, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_recurso_questao(uuid, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_recurso_questao(uuid, text, uuid[]) TO service_role;