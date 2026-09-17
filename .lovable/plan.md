# Funil do Simulado Gratuito — Carreira Judiciária

## Como encaixa no que já existe

O portal já tem tudo o que o funil precisa: cadastro público de teste (cria conta confirmada, grava telefone/origem no perfil e concede o papel de aluno de teste com prazo em dias configurável) e bloqueio automático ao fim do prazo. O funil do simulado será **uma segunda porta de entrada para esse mesmo mecanismo**, sem tocar na home, no cadastro-teste atual, na assinatura ou no e-book.

Ponto central: hoje o prazo de 5 dias é gravado no momento do cadastro. Para o simulado, a conta é criada **sem o prazo** e o prazo só é gravado quando a pessoa clica em "Acessar o seu Portal". Assim nada de trial paralelo — é o mesmo mecanismo, apenas ativado depois.

## Modelo de dados (para sua confirmação)

**Na conta (perfil), dois campos novos:**
- `simulado_status`: vazio para quem não vem do simulado, `pendente` no cadastro do simulado, `concluido` ao responder a 80ª questão.
- `simulado_ativado_em`: data do clique em "Acessar o seu Portal" (marca quando o trial começou a contar).
- A origem do cadastro continua no campo `origem` que já existe, gravada como `simulado`.

**Banco de questões do simulado (separado do banco de questões das matérias, para não interferir no acervo):**
- `simulado_questoes`: identificador do arquivo (`questao_id`, ex. `cj-001`), `materia`, enunciado, `comentario` (opcional, já criado agora e vazio no lançamento), ordem, publicado.
- `simulado_alternativas`: letra (a–e), texto, correta.

**Tentativas e respostas:**
- `simulado_tentativas`: usuário, início, fim, total, acertos, percentual, status.
- `simulado_respostas`: tentativa, questão, alternativa escolhida, acertou.

O acerto por matéria do resultado sai da soma das respostas agrupadas por `materia`.

**Regras de acesso:** cada pessoa vê e grava apenas as próprias tentativas e respostas; as questões são legíveis por quem está logado; o gabarito nunca vai para a tela durante o simulado (a correção é feita no servidor).

## Importação das 80 questões

Um script de importação lê os arquivos Markdown com front-matter (`questao_id`, `materia`, `gabarito`, `comentario` opcional), separa enunciado e alternativas a)–e) e grava/atualiza pelo `questao_id` — reimportar o mesmo arquivo sobrescreve, sem duplicar. Nada de arquivo `.md` salvo no repositório: você me envia o conteúdo e eu importo.

## Telas e fluxo

1. **/simulado** (pública, sem menu do portal): headline "Quantas questões você acertaria HOJE em uma prova de Tribunal ou Ministério Público?", subheadline "Faça um simulado de desempenho para Carreira Judiciária", bloco de credibilidade (80 questões, tempo estimado, gratuito), botão único "Fazer o simulado grátis". Logo abaixo, na mesma página, a explicação breve (o que vai responder, o que recebe no final) com o botão "Começar agora". Nenhum outro link de cadastro na página.
2. **/simulado/cadastro**: mesmo formulário e mesma criação de conta do cadastro-teste (nome, e-mail, celular, senha), com origem "simulado" fixa e `simulado_status = pendente`. **Sem gravar o prazo de 5 dias.** Login automático e redirecionamento sempre para /simulado/questoes.
3. **/simulado/questoes**: uma questão por tela, barra "Questão X de 80", sem feedback de certo/errado, respondido em uma sessão só. Ao responder a última: `simulado_status = concluido` e ida para o resultado.
4. **/simulado/resultado**: "Parabéns! Você concluiu o simulado.", acertos e percentual geral, quebra por matéria, e lista de questões já preparada para exibir o comentário do professor quando existir (quando vazio, simplesmente não aparece).
5. **Oferta pós-simulado** (na mesma tela de resultado, só com status `concluido`): à esquerda, bloco grande "Conheça o Portal do Aluno" / "Acesso gratuito a todos os recursos por 5 dias, sem compromisso" / botão "Acessar o seu Portal" — esse clique grava o prazo de 5 dias na conta e leva ao portal. À direita, bloco pequeno com a imagem do e-book "Guia da Carreira Judiciária" / "Quer se preparar melhor?" / botão discreto "Baixar guia gratuito".

## Trava de acesso

Verificação no acesso às páginas do portal (não só na interface): com `simulado_status = pendente`, qualquer rota do portal redireciona para /simulado/questoes — inclusive digitando o endereço direto. Contas de administrador ficam de fora. Ao concluir, a trava deixa de valer. Quem concluiu mas ainda não clicou em "Acessar o seu Portal" também não entra no portal (ainda não tem prazo liberado) e é levado ao resultado/oferta.

## Fita de contagem do trial

Barra fixa no topo do portal, para qualquer pessoa em período de teste (venha do simulado ou do cadastro-teste), com os dias restantes: "Você tem mais 3 dias de acesso ao teste gratuito", e no último dia "Seu teste gratuito termina hoje", com link para assinar. Não aparece para assinantes nem administradores.

## Fora do escopo

Assinatura paga, conteúdo/fluxo do e-book, home do portal e cadastro-teste atual permanecem intactos; nenhum banco de questões novo genérico e nenhum mecanismo de trial paralelo.
