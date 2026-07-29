## Etapa 4 — Hotmart, Assinaturas, Admin Completo e Finalização

Escopo grande. Vou dividir em blocos entregáveis. Confirme e implemento na sequência (ou em uma rodada só, se preferir).

---

### Bloco 1 — Banco de dados e segurança

Migração única no Supabase:

- `assinaturas`: `user_id`, `hotmart_subscriber_code`, `hotmart_transaction`, `produto`, `plano`, `status` (`ativa` | `inativa` | `inadimplente` | `cancelada`), `iniciada_em`, `expira_em`, `ultima_renovacao_em`, `cancelada_em`.
- `profiles`: adicionar `ultimo_acesso_em`, `bloqueado` (bool), `bloqueado_motivo`.
- `notificacoes`: `titulo`, `mensagem`, `tipo` (`material` | `noticia` | `cronograma` | `concurso` | `sistema`), `link`, `publicada_em`, `escopo` (`todos` | `user`), `target_user_id?`.
- `notificacoes_leituras`: `notificacao_id`, `user_id`, `lida_em` (marcação por aluno).
- `admin_logs`: `user_id`, `acao`, `entidade`, `entidade_id`, `metadata jsonb`, `created_at`.
- `configuracoes_plataforma`: singleton com nome, logo_url, favicon_url, contato, redes sociais, textos rodapé, sobre.
- Função `has_role` (se ainda não existir) + policies revisadas.
- Função `is_assinatura_ativa(user_id)` usada nas policies de conteúdo pago (materiais, questões).
- RLS: aluno vê apenas suas notificações/leituras/assinatura; admin vê tudo; `admin_logs` só admin.

---

### Bloco 2 — Webhook Hotmart

Rota pública `src/routes/api/public/hotmart/webhook.ts`:

- Verifica `hottok` (segredo `HOTMART_HOTTOK`) em header/body.
- Mapeia eventos:
  - `PURCHASE_APPROVED` / `PURCHASE_COMPLETE` → cria user via `supabaseAdmin.auth.admin.inviteUserByEmail` (se novo) e ativa assinatura. Envia link de definição de senha.
  - `PURCHASE_DELAYED` / `PURCHASE_BILLET_PRINTED` sem pagamento → `inadimplente`.
  - `SUBSCRIPTION_CANCELLATION` / `PURCHASE_CANCELED` / `PURCHASE_REFUNDED` / `PURCHASE_CHARGEBACK` → `cancelada` / `inativa`.
  - Renovação → atualiza `expira_em` e volta para `ativa`.
- Idempotência por `hotmart_transaction`.
- Grava em `admin_logs`.

Segredo: solicito `HOTMART_HOTTOK` via `add_secret` no momento certo.

Gate de acesso: middleware no `_authenticated/route.tsx` que consulta assinatura; se inativa/inadimplente → redireciona para `/assinatura-bloqueada` (tela dedicada com instruções). Admin ignora o gate.

---

### Bloco 3 — Autenticação e perfil

- Fluxo "definir senha" via link do Supabase Auth (recovery) em `/definir-senha`.
- Página `/esqueci-senha` e `/redefinir-senha` (públicas).
- `perfil.tsx`: dados pessoais, alterar senha, status/validade da assinatura, últimos acessos.
- Registro de `ultimo_acesso_em` num `onAuthStateChange` server fn leve.

---

### Bloco 4 — Admin: Usuários

`/admin/usuarios` reescrito:

- Busca por nome/e-mail.
- Colunas: status assinatura, cadastro, último acesso, materiais concluídos, questionários realizados.
- Ações: bloquear/desbloquear, enviar redefinição de senha, editar nome/e-mail.
- Modal de detalhes.

---

### Bloco 5 — Admin: Dashboard

`/admin/dashboard` com KPIs reais + gráfico simples (cadastros por semana, sessões de questões por semana) usando `recharts` (já disponível via shadcn charts).

---

### Bloco 6 — Configurações da plataforma

`/admin/configuracoes`:

- Form editando singleton `configuracoes_plataforma`.
- Upload de logo/favicon para bucket `branding` (público).
- Hook `usePlataformaConfig()` consumido em Root, Sidebars, rodapé, `<title>`, favicon dinâmico.

---

### Bloco 7 — Notificações

- Admin: `/admin/noticias` ganha "publicar notificação" opcional. Página adicional `/admin/notificacoes` para envios manuais.
- Aluno: sino no header com contador de não lidas, popover com lista; item "marcar como lida" e "marcar todas".
- Triggers automáticos ao publicar material/notícia/cronograma/concurso (server fn cria notificação de escopo `todos`).

---

### Bloco 8 — Busca global

- Barra no header (Cmd/Ctrl+K) usando `cmdk`.
- Server fn `buscaGlobal({ q })` que consulta disciplinas, módulos, materiais, concursos, notícias, cronogramas via `ilike` com `LIMIT` por categoria.
- Resultado agrupado, navegação por teclado, deep-link para o item.

---

### Bloco 9 — Segurança, performance, acessibilidade

- `admin_logs`: helper server-side chamado nos pontos-chave (login, logout, publicações, exclusões).
- Revisão de RLS por tabela (rodo `supabase--linter` no fim).
- Lazy loading das rotas admin pesadas.
- Revisar `aria-label`, focus states, contraste, navegação por teclado no header/sidebar/busca.
- Meta tags/OG por rota (Portal do Aluno – Instituto J&D Especialistas na Carreira Judiciária).

---

### Fora de escopo (mantido para o futuro)

- App mobile, push, IA, calendário, gamificação, certificados.
- Cobrança/checkout dentro da plataforma (a Hotmart continua sendo o checkout).

---

### Perguntas rápidas antes de codar

1. **Criação de conta via webhook**: uso `inviteUserByEmail` (Supabase envia e-mail com link de definição de senha) — ok? Alternativa: gerar link e enviar por e-mail próprio via Lovable Emails.
2. **Tela de bloqueio**: aluno inadimplente vê só mensagem + botão "Regularizar na Hotmart" com link configurável nas Configurações. Ok?
3. **Gráficos do dashboard admin**: cadastros/semana + sessões/semana são suficientes, ou quer mais séries (ex.: aprovações Hotmart, receita)?
4. **Confirma que posso executar tudo (Bloco 1–9) em sequência**, ou prefere aprovar bloco por bloco?
