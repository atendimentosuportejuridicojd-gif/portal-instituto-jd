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

## Nota de checagem final

Muitos textos terminam com uma seção "Nota de checagem" (às vezes como
`**Nota de checagem**`, às vezes como citação `> **Nota de checagem:**`,
às vezes só `Nota de checagem: ...`), usada para registrar como as fontes
foram conferidas na produção do texto. Essa seção é uso interno e **nunca
deve aparecer para o usuário final**: o `publish.mjs` remove
automaticamente essa seção (e o `---` que a precede, se houver) antes de
validar e gravar `conteudo_md`. Não é preciso tirar essa parte manualmente
do texto antes de publicar.

## Como executar

0. **Antes de publicar, confira se a matéria já existe na disciplina** —
   liste as matérias já cadastradas (`slug`, `titulo`, `ordem`) naquela
   disciplina e compare visualmente com o título/matéria que vai publicar.
   O `publish.mjs` só barra título **idêntico** (case-insensitive); uma
   duplicata pode ter título com poucas palavras diferentes ("Editores de
   Texto" vs. "Editor de Textos", "Apresentações" vs. "Apresentações
   Eletrônicas") e passar despercebida pela checagem automática. Publicar
   sob um slug que não bate com o placeholder do seed já criou matéria
   duplicada de verdade neste projeto (com um placeholder que tinha 30
   questões vinculadas quase perdidas na limpeza) — esse passo manual não é
   opcional.
1. **Rode a auditoria de conteúdo obrigatória de 4 camadas** (seção
   "Auditoria de conteúdo obrigatória", abaixo) no arquivo `.md` de
   origem. Isto é fluxo padrão desde 16/09/2026 — não é uma tarefa à
   parte que precisa ser pedida, roda sempre, para qualquer matéria que
   for publicada, arquivo avulso ou lote inteiro.
2. Salve o markdown (já corrigido pela auditoria) em um arquivo temporário
   **fora do repositório** — use o diretório de scratchpad da sessão, a
   menos que já esteja lendo direto de um arquivo fora do repositório
   (ex.: pasta de Downloads do usuário), caso em que pode editar e rodar
   direto nele. Nunca em `src/`, `scripts/`, nem em qualquer pasta
   versionada.
3. Rode o validador/gravador, reaproveitando as mesmas credenciais que os
   utilitários em `scripts/` já usam (não crie credencial nova, não
   versione chave):

   ```bash
   set -a && source .env && source .env.local && set +a
   node .claude/skills/publicar-materia/publish.mjs "<caminho-do-arquivo>"
   ```

4. O script (`publish.mjs`) faz toda a validação **estrutural** (front-matter,
   títulos, diretivas — ver lista abaixo) antes de tocar no banco e aborta
   com `ERRO: ...` (exit code 1) sem escrever nada se qualquer regra
   falhar. Essa validação nunca reavalia mérito jurídico — isso já foi
   feito na Camada 3 da auditoria do passo 1.
5. Se o script terminar com sucesso, repasse o relatório que ele imprime
   (ação, id do material, disciplina, link) — ver formato abaixo — junto
   com o relatório da Camada 4 da auditoria.
6. Apague o arquivo temporário do scratchpad depois de usar, se tiver
   criado um.

## Auditoria de conteúdo obrigatória (4 camadas)

Fluxo padrão desde 16/09/2026, para toda matéria publicada — arquivo
avulso ou lote inteiro, não precisa ser pedido. Rodar nesta ordem, para
cada arquivo `.md`, **antes** de chamar `publish.mjs`. Autonomia total nas
decisões: não pausar pedindo aprovação em nenhuma camada — encontrar um
problema, decidir a correção, aplicar e documentar no relatório final
(Camada 4). Decisão silenciosa não é aceitável; decisão sem pausa é o
objetivo. Isto é a exceção deliberada à regra de "não avaliar mérito
jurídico" das Regras fixas, mais abaixo — aquela regra vale para o
validador mecânico do `publish.mjs`, não para esta auditoria.

**Camada 1 — Estrutura (mecânica, sem exceção)**
- Contar H2 e H3 do corpo e comparar com o número de subitens que
  `acervo-base-conteudo-programatico.md` prevê para aquela matéria. O
  arquivo de referência correto é
  `C:\Users\User\Downloads\ACERVO BASE INSTITUTO J&D\acervo-base-conteudo-programatico.md`
  — existe uma cópia mais antiga e divergente em
  `C:\Users\User\Downloads\temporario\acervo-base-conteudo-programatico.md`,
  que não deve ser usada como referência. Se houver H2 a mais e o
  conteúdo for uma síntese/fechamento genuinamente útil (quadro-resumo,
  roteiro de decisão), manter e documentar a decisão de manter; se
  parecer redundante ou fora de lugar, rebaixar para dentro do último H3
  existente e documentar essa decisão também — sempre decidir e seguir,
  nunca deixar em aberto.
- H4 ou mais profundo: erro sempre, sem exceção — corrigir rebaixando
  para H3 ou integrando ao parágrafo.
- Diretivas `:::exemplo`, `:::atencao`, `:::legislacao`: abertura e
  fechamento balanceados como pilha — um `:::` de abertura sem fechamento
  correspondente é erro mesmo que a contagem total bata.
- Todo `:::legislacao{...}` precisa ter `fonte=` e `url=` dentro das
  chaves; nenhuma citação de lei ou jurisprudência solta em prosa sem
  essas duas informações.
- "Nota de checagem" nunca pode ser heading (`## Nota de checagem`) —
  sempre texto em negrito (`**Nota de checagem**`) depois de um separador
  `---`. Se vier como H2, corrigir sempre. Se o arquivo não tiver Nota de
  checagem nenhuma, criar uma ao final documentando o que esta auditoria
  verificou.
- Checar caracteres escapados indevidos no front-matter e nas URLs
  (`\_`, `\~`, `\[`, `\-`, `\&amp;` fora de lugar, inclusive no próprio
  delimitador `\---` do front-matter) — sintoma recorrente de exportação
  problemática neste lote de conteúdo; o `publish.mjs` rejeitaria o
  arquivo por causa disso, mas corrigir aqui antes é mais rápido que
  descobrir pelo erro do script.

**Camada 2 — Negrito de termo-chave**
- Contar quantos `**termo**` existem no corpo. Um arquivo com zero ou
  quase zero (1, tipicamente só a própria "Nota de checagem") precisa de
  negrito adicionado.
- Negritar o termo exatamente como já aparece no texto, na frase em que é
  definido pela primeira vez — nunca reescrever a frase nem acrescentar
  palavra para "caber" o negrito.
- Depois de aplicar, remover todos os `**` do arquivo original e do
  corrigido e comparar se ficam idênticos. Se não ficarem, alguma palavra
  foi alterada além do negrito — desfazer e refazer só com negrito puro.

**Camada 3 — Verificação de conteúdo (pesquisa real, obrigatória)**
- Extrair todo bloco `:::legislacao{fonte=...}` e todo
  `:::atencao{fonte=...}` que cite dispositivo legal ou julgado.
- Verificar cada um na fonte oficial correspondente, com WebSearch/WebFetch
  — é uma segunda conferência independente, feita do zero, e não uma
  auditoria do que a "Nota de checagem" do próprio arquivo já diz ter
  verificado. Nunca presumir que a nota está certa só porque ela existe.
  - Lei federal ou Constituição → planalto.gov.br, texto compilado
    vigente (não o de promulgação original, salvo quando o texto já
    avisa que é "redação anterior"). Ver nota técnica abaixo: esse
    domínio está bloqueado neste ambiente — usar WebSearch cruzando
    fontes independentes (Câmara dos Deputados/legin, LexML, JusBrasil
    etc.) em vez de tentar o fetch direto.
  - Jurisprudência do STF ou STJ → portal de jurisprudência do
    respectivo tribunal, confirmando número do processo, relator, órgão
    julgador, data e teor da ementa ou tese.
  - Resolução do CNJ → atos.cnj.jus.br.
- Priorizar por risco: dispositivos com data de vigência, prazo,
  percentual ou marco temporal são os que mais viram alvo de emenda ou
  lei superveniente — são o alvo principal. Definição doutrinária estável
  tem risco baixo e pode ser conferida com menos intensidade.
- Se achar dispositivo alterado depois da data em que o arquivo foi
  escrito: corrigir a citação para a redação vigente, acrescentar um
  `:::atencao` contando a redação anterior e o que mudou (quando a
  mudança em si for relevante para prova), e registrar a correção na
  Nota de checagem, com a fonte que a confirmou — corrigir e documentar,
  não pausar esperando aprovação para isso.
- Nunca "consertar" um dado incerto inventando precisão que a pesquisa
  não confirmou. Se a data exata de um julgado divergir entre fontes
  secundárias sem uma fonte primária que resolva, preferir remover a
  especificidade (tirar a data, manter só processo e relator) a manter
  um número que pode estar errado — isso vale mesmo com autonomia total:
  autonomia não é licença para inventar certeza que a pesquisa não deu.
- Se a auditoria revelar uma lacuna de conteúdo relevante para prova (não
  um erro de citação, mas um tópico atual que falta) e a mudança exigir
  redigir texto substancioso novo (não só um `:::atencao` curto), sinalizar
  no relatório em vez de escrever por conta própria — exceto quando o
  usuário já pedir explicitamente para complementar.

**Camada 3-B — checagem do link em si (reachability), além do teor**
Além de verificar o teor jurídico citado (obrigatório, ver acima), também
tentar verificar se cada `url="..."` carrega de fato e se o fragmento
`#:~:text=...` aponta pro trecho certo. Quando o domínio estiver
bloqueado neste ambiente (lista abaixo), **pular silenciosamente, sem
reportar isso como problema/achado** — é bloqueio de rede conhecido, o
usuário trata disso com estratégia própria depois. Só reportar (e
corrigir, quando possível) links de domínios que respondem normalmente e
que, ao testar, se mostrarem realmente quebrados ou com fragmento
desatualizado.

Nota técnica (lista cumulativa — atualizar aqui a cada novo achado, em
vez de cada auditoria redescobrir do zero): `planalto.gov.br` está
inacessível a partir deste ambiente no nível de rede (confirmado via
`WebFetch` e via `curl` direto pelo shell — timeout puro). Também
confirmados bloqueados com 403 (mesmo tratamento): `portal.stf.jus.br`,
`www.stf.jus.br`, `jurisprudencia.stf.jus.br`, `scon.stj.jus.br`, e o
endpoint específico `processo.stj.jus.br/processo/pesquisa/...` (o resto
de `processo.stj.jus.br`, como `/SCON/`, responde normalmente). Domínios
confirmados funcionando e que devem ser testados de verdade: `stj.jus.br`
e demais subdomínios (exceto os listados), `lexml.gov.br`,
`camara.leg.br` (`www2.camara.leg.br/legin`), `dizerodireito.com.br`,
`buscadordizerodireito.com.br`, `migalhas.com.br`,
`arquivocidadao.stj.jus.br`.

**Camada 4 — Relatório**
Para cada arquivo, reportar: o que foi verificado, o que foi corrigido
(antes/depois), toda decisão autônoma tomada nas Camadas 1 e 3 (com a
razão), e o que ficou sinalizado como incerto sem solução ou como lacuna
de conteúdo.

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
8. Atributos de diretiva não podem conter aspas escapadas (`\"`). O
   `remark-directive` (parser real da página) não entende esse escape e
   renderiza a diretiva inteira como texto cru para o aluno — já aconteceu
   com citação de alínea entre aspas dentro de `fonte="..."` (ex.: `art. 5º,
   XXXIV, \"a\"`). Para citar uma alínea, use aspas simples:
   `fonte="Lei X, art. Y, 'a'"`.

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
- **Não encontrou** → antes de criar, o script confere se já existe matéria
  com o **mesmo título** (case-insensitive) na mesma disciplina sob outro
  slug — se achar, aborta com erro em vez de criar duplicata (já aconteceu
  de verdade: um placeholder do seed com slug ligeiramente diferente do
  front-matter ficou órfão e vazio enquanto uma matéria nova era criada por
  engano, e esse placeholder tinha 30 questões vinculadas que quase foram
  perdidas ao tentar "limpar" a duplicata vazia). Se não achar título
  parecido, aí sim cria o registro completo (`tipo='markdown'`,
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
- **O validador do `publish.mjs` não avalia, corrige, resume ou reescreve
  o conteúdo** — só estrutura (front-matter, títulos, diretivas). A
  verificação e correção de mérito jurídico acontece antes, na auditoria
  de 4 camadas obrigatória (seção própria acima) — não é o script que faz
  isso, é o passo manual que vem antes dele.
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
