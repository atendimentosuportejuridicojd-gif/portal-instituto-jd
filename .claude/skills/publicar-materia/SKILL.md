---
name: publicar-materia
description: Publica ou atualiza uma matéria do Acervo Base a partir de um texto markdown colado na conversa, gravando o conteúdo direto em materiais.conteudo_md no Supabase. Use quando o usuário colar um texto com front-matter YAML (codigo, disciplina, materia, titulo, resumo, tempo_leitura, tags) pedindo para publicar/atualizar uma matéria.
---

# Publicar matéria do Acervo Base

Recebe um texto markdown colado na conversa e grava como matéria do portal.
**Nunca cria arquivo `.md` no repositório. Nunca envia nada ao Storage.** O
texto vai para `materiais.conteudo_md` e é renderizado direto na página —
publicar é inserir/atualizar a linha no banco, nada mais.

## Entrada esperada

Markdown com front-matter YAML no topo:

```
---
codigo: E2
disciplina: direito-administrativo
materia: atos-administrativos
titulo: "Atos Administrativos"
resumo: "Conceito, atributos, classificação e extinção."
tempo_leitura: 14
tags: [ato-administrativo, atributos, anulacao]
---

# Atos Administrativos

## Conceito
...
```

- `codigo`: código da disciplina no acervo base (ex.: `E2`, `G1`).
- `disciplina`: slug da disciplina — precisa bater com o slug atual daquele `codigo`.
- `materia`: slug da matéria dentro da disciplina (chave de busca do placeholder).
- `tags`: lista entre colchetes.

Não existe distinção de camada (Técnico/Analista) no texto — o acervo base
tem uma única versão de cada matéria, escrita em profundidade máxima. Essa
distinção acontece na alocação por certame, não no conteúdo.

## Como executar

1. Salve o markdown colado pelo usuário em um arquivo temporário **fora do
   repositório** — use o diretório de scratchpad da sessão. Nunca em
   `src/`, `scripts/`, nem em qualquer pasta versionada.
2. Rode o validador/gravador, reaproveitando as mesmas credenciais que os
   utilitários em `scripts/` já usam (não crie credencial nova, não
   versione chave):

   ```bash
   set -a && source .env && source .env.local && set +a
   node .claude/skills/publicar-materia/publish.mjs "<caminho-do-arquivo-temporario>"
   ```

3. O script (`publish.mjs`) faz toda a validação **antes** de tocar no
   banco e aborta com `ERRO: ...` (exit code 1) sem escrever nada se
   qualquer regra falhar. Repasse o erro ao usuário tal como veio —
   não tente adivinhar ou corrigir o texto por conta própria.
4. Se o script terminar com sucesso, repasse o relatório que ele imprime
   (ação, id do material, disciplina, link) — ver formato abaixo.
5. Apague o arquivo temporário do scratchpad depois de usar.

## Validação (o script já faz isto — não reimplemente na mão)

1. Campos obrigatórios presentes: `codigo`, `disciplina`, `materia`,
   `titulo`, `resumo`, `tempo_leitura`, `tags`.
2. `codigo` existe em `disciplinas`.
3. `disciplina` bate com o slug atual daquele `codigo` (consulta ao vivo —
   slugs já mudaram antes neste projeto, nunca assuma).
4. Títulos: apenas H1 (`#`, título da matéria), H2 (`##`, subitem do
   conteúdo programático) e H3 (`###`, seção aninhada no subitem) no
   corpo. H4 em diante é erro. (Checagem ignora linhas dentro de blocos
   ` ``` `.)
5. Diretivas de bloco: apenas `:::legislacao`, `:::atencao` e `:::exemplo`.
   Qualquer outro nome após `:::` é erro.
6. `:::legislacao` **exige** os atributos `fonte="..."` e `url="..."`
   **entre chaves** na linha de abertura — sintaxe real do
   `remark-directive` (o parser usado pela página de leitura), não é
   "solto": `:::legislacao{fonte="Lei nº 14.133/2021" url="https://..."}`.
   `:::atencao` aceita `fonte`/`url` como **opcionais** — em disciplinas
   sem legislação ou julgado a citar (Língua Portuguesa, Matemática,
   Informática, Análise de Dados), `:::atencao` marca só um ponto crítico
   de prova, sem fonte. `:::exemplo` não leva chaves nem atributos.
7. Toda diretiva aberta precisa ter um `:::` de fechamento correspondente
   (pilha balanceada) — nenhuma pode ficar aberta, nenhum fechamento pode
   sobrar sem abertura.

Qualquer falha: aborta, relata o erro exato (regra + linha, quando
aplicável), não escreve nada no banco.

## Gravação

A matéria já existe como placeholder (criado pelo seed do acervo base).
A skill **localiza e completa**, nunca recria do zero por padrão.

**Busca**: `disciplina_id` (resolvido do `codigo`) + `slug` = campo
`materia` do front-matter.

- **Encontrou** → `UPDATE` preenchendo `conteudo_md` (corpo do markdown,
  sem o front-matter), `resumo`, `tempo_leitura`, `tags`,
  `publicado = true`. **Não** altera `titulo` nem `ordem` — esses vieram
  do seed e são a fonte da verdade para a ordem de exibição.
- **Não encontrou** → cria o registro completo (`tipo='markdown'`,
  `modulo_id=NULL`, `ordem` = último da disciplina + 1) e avisa
  explicitamente que era uma matéria fora da lista original do seed.

Republicar **sobrescreve direto, sem perguntar** — é atualização em tempo
real do conteúdo já publicado. Não há confirmação intermediária porque o
portal é fechado por assinatura (sem etapa de "tornar público").

**Nunca grava em `material_versoes`** — matérias em markdown não têm
controle de versão (isso é exclusivo do fluxo antigo de PDF, que não
existe mais no acervo base).

## Regras fixas

- Inserir/atualizar direto, como já é feito com as questões — sem etapa
  de revisão ou aprovação.
- **Não avaliar, corrigir, resumir ou reescrever o conteúdo.** O texto
  entra exatamente como veio. A validação é de **estrutura** (front-matter,
  títulos, diretivas), nunca de mérito jurídico ou qualidade do texto.
- Não rodar deploy. O conteúdo vive no Supabase e aparece no app sem
  precisar de push/build — é dado, não código.
- Não criar arquivo `.md` em lugar nenhum do repositório, nem
  temporariamente fora do scratchpad da sessão.
- Não tocar em `modulos`, `questoes`, `trilha_materiais` nem
  `concurso_materiais`. Esta skill só escreve em `materiais`.

### Regra de segurança obrigatória

Antes de qualquer `DELETE` ou `UPDATE` em cadeia (mais de uma tabela,
ou uma tabela que pode arrastar outras via FK), consulte
`pg_constraint`/`information_schema` para levantar **todas** as foreign
keys envolvidas — não só as tabelas que a pessoa mencionou — e relate o
que vai ser afetado (`ON DELETE CASCADE` apaga a linha dependente,
`SET NULL` só desvincula) antes de executar. `materiais` hoje é
referenciada por `questoes`, `questao_sessoes`, `material_leitura` e
`trilha_materiais`/`concurso_materiais`/`material_versoes` (todas
`CASCADE`) e por `cronograma_itens`/`plano_estudo_itens`/
`questao_recursos` (`SET NULL`) — uma operação em cadeia mal avaliada
nessa tabela já apagou dados que deveriam ter sido preservados neste
projeto. Nunca repita isso sem o levantamento prévio.

## Relatório final

Ao terminar (sucesso), reporte:

- Criado ou atualizado.
- `id` do material.
- Disciplina (código + nome).
- Link para a matéria no portal: `/materiais/{id}/leitura` (rota
  `src/routes/_authenticated/materiais.$materialId.leitura.tsx`).

Em caso de erro, reporte a regra violada e a linha do texto, sem tentar
adivinhar a correção.
