
## ETAPA 3 — Sistema Inteligente de Questões, Desempenho e Revisão

### Observação inicial
A Etapa 2 (upload/CRUD de PDFs e leitor in-app) ainda não foi executada. A Etapa 3 pressupõe materiais cadastrados. Vou implementar toda a Etapa 3 sobre a estrutura existente (`materiais`, `questoes`, `questao_alternativas`, `questao_tentativas`) e adicionar apenas o mínimo de schema necessário para tentativas com estado (em andamento / concluída). O CRUD completo de materiais/PDF fica para a Etapa 2 quando ela for retomada.

---

### 1. Ajustes de banco (migração)

Adicionar tabela `questao_sessoes` (uma "tentativa completa" do aluno sobre um material):

- `id`, `user_id`, `material_id`
- `status` ('em_andamento' | 'concluida')
- `total_questoes`, `acertos`, `erros`, `percentual`
- `iniciada_em`, `concluida_em`
- índices por (user_id, material_id)

Alterar `questao_tentativas`:
- adicionar `sessao_id` (FK), `questao_id`, `alternativa_id`, `acertou`
- garantir unicidade (sessao_id, questao_id) — cada questão respondida uma vez por sessão.

Alterar `questoes`:
- adicionar `material_id` (FK obrigatória — questão pertence a um PDF)
- adicionar `referencia` (texto único: banca/órgão/cargo/ano)
- adicionar `ordem`

Views/RPC:
- função `get_desempenho_material(user_id, material_id)` retorna % da última sessão concluída.

Todas as tabelas mantêm RLS: aluno vê apenas suas sessões/tentativas; admin vê tudo; leitura de questões apenas para materiais publicados.

---

### 2. Área Administrativa — Cadastro de Questões

Página `/admin/questoes`:
- Listagem agrupada por Disciplina → Material.
- Botão "Nova Questão" abre formulário.

Formulário (campos exatamente como pedido):
- Material relacionado (select em cascata: Disciplina → Material)
- Referência da questão (texto livre)
- Enunciado (textarea)
- Alternativas A–E (5 campos)
- Resposta correta (radio único A–E)
- Comentário do professor (textarea)

Edição e exclusão inline. Sem campos extras de banca/ano separados.

---

### 3. Área do Aluno — Integração com o material

No card/linha de cada PDF (nas telas de Acervo, Trilhas e Concursos), três ações:
- 📄 Visualizar PDF (placeholder até Etapa 2)
- 📝 Resolver Questões / 🔄 Refazer Questões (troca automaticamente)
- 📊 Desempenho: XX%

O rótulo do botão e o percentual vêm da última sessão concluída daquele aluno naquele material.

---

### 4. Página de Resolução `/materiais/$materialId/questoes`

Fluxo:
1. Ao entrar: buscar sessão `em_andamento` do aluno para o material. Se não houver, criar uma nova com o snapshot atual de questões publicadas.
2. Renderizar a próxima questão não respondida.

Interface:
- Topo: Disciplina · Material · "Questão X de N" · barra de progresso.
- Referência (acima do enunciado).
- Enunciado.
- Alternativas A–E como radios.
- Botão **Responder**.

Após responder:
- Salva tentativa no banco (imutável).
- Bloqueia alternativas.
- Destaca em verde a correta e em vermelho a escolhida (se errada).
- Mostra "✅ Resposta correta" ou "❌ Resposta incorreta".
- Exibe **Comentário do Professor**.
- Libera botão **Próxima Questão**.

Salvamento automático: cada resposta é persistida no ato. Ao reabrir a página, o sistema retoma a partir da próxima questão não respondida. Questões já respondidas ficam bloqueadas.

Ao responder a última: finaliza a sessão, calcula acertos/erros/percentual, redireciona para a página de Desempenho.

Refazer: cria nova sessão (mantém histórico das anteriores). Não permite editar respostas de uma sessão concluída.

---

### 5. Página de Desempenho `/materiais/$materialId/desempenho`

Conteúdo:
- Resultado atual: % · total · acertos · erros.
- Recomendação fixa: *"Para um melhor aproveitamento nos estudos para concursos, recomenda-se buscar um desempenho igual ou superior a 85% em cada conteúdo."*
- Lista de questões da última sessão:
  - Acertadas (colapsáveis).
  - Erradas (expandidas): enunciado, alternativa escolhida, alternativa correta, comentário do professor.
- Histórico de tentativas (tabela: Tentativa · Data · Aproveitamento).
- Botões: Refazer Questões · Voltar ao material.

---

### 6. Dashboard do Aluno — "Conteúdos para Revisar"

Nova seção listando materiais com percentual da última sessão < 70% (ajustável).
Cada item: Disciplina · Material · Desempenho · badge "🔴 Revisão recomendada" · atalho para refazer.

---

### 7. Server functions (TanStack, `.functions.ts`)

Todas protegidas com `requireSupabaseAuth`:
- `iniciarOuRetomarSessao({ materialId })`
- `responderQuestao({ sessaoId, questaoId, alternativaId })` — valida, marca acerto, se última questão finaliza a sessão.
- `getDesempenhoMaterial({ materialId })` — última sessão + histórico.
- `getConteudosParaRevisar()` — usado no dashboard.
- `getQuestoesPorMaterial({ materialId })` — para admin e para aluno (aluno recebe sem `correta`/`comentario`).

Admin (também `requireSupabaseAuth` + checagem de role):
- `criarQuestao`, `atualizarQuestao`, `excluirQuestao`.

---

### 8. UI / Design

Mantém o design system atual (azul-marinho + dourado, minimalista). Componentes novos: `QuestionCard`, `AlternativaOption`, `ProgressoQuestionario`, `DesempenhoResumo`, `HistoricoTentativas`. Nenhuma alteração de identidade visual.

---

### Fora de escopo desta etapa
- Upload/leitor de PDF (Etapa 2, pendente).
- Hotmart, assinaturas, bloqueio de usuário (Etapa 4).
- Alterar questão individual em sessão concluída (regra do produto: só refazendo tudo).
