# Conversão do cadastro do curso

## Resultado
Registrar a conversão `AW-18069973013/QELhCPrwpowdEJXQt6hD` somente quando um visitante vindo de `/curso-carreira-judiciaria` concluir com sucesso a criação de uma nova conta de teste.

## Alterações
- Identificar nos dois botões da página do curso que o acesso ao formulário `/teste` veio dessa página.
- No sucesso real do cadastro em `/teste`, disparar `trackConversion` apenas quando essa origem estiver presente.
- Manter cadastros vindos diretamente de `/teste` sem esse disparo.
- Não disparar no clique, no carregamento nem quando o cadastro falhar, inclusive por e-mail já existente.

## Validação
- Conferir que o fluxo de cadastro, os 5 dias de teste e as demais conversões permanecem inalterados.
- Confirmar a compilação e informar o arquivo e a linha final do disparo.
