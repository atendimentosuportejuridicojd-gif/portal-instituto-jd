# Acesso administrativo controlado para o Claude Code

Objetivo: o Claude Code consegue executar tarefas de administrador (a começar pela importação de questões) sem receber a chave de serviço nem a senha da sua conta pessoal, e sem enxergar dados de alunos.

## Abordagem recomendada: endpoint de administração com token próprio

Em vez de dar uma identidade de admin completa, o projeto ganha um endpoint HTTP dedicado, protegido por um token exclusivo da automação. O token permite só o que o endpoint faz — nada além.

### O que será criado

1. **Segredo `ADMIN_API_TOKEN`** — token aleatório gerado no cofre do projeto. É o único valor que você compartilha com o Claude Code, e pode ser rotacionado a qualquer momento sem afetar sua conta.

2. **Endpoint `POST /api/public/admin/questoes`** (`src/routes/api/public/admin/questoes.ts`)
   - Exige o header `Authorization: Bearer <ADMIN_API_TOKEN>`; sem ele, responde 401.
   - Comparação do token em tempo constante (sem vazar por timing).
   - Valida o corpo com Zod: `material_id` (ou nome do material), e uma lista de questões com `enunciado`, `referencia`, `comentario_professor`, `alternativas` (letra, texto, correta).
   - Insere em `questoes` e `questao_alternativas` numa operação única, com `ordem` sequencial e `publicado` conforme enviado.
   - Devolve um resumo: quantas questões e alternativas foram criadas, e os IDs.
   - Idempotência: recusa questão cujo enunciado já exista no mesmo material, para não duplicar em caso de reenvio.

3. **Endpoint `GET /api/public/admin/catalogo`** (mesmo arquivo de rota ou irmão)
   - Mesmo token.
   - Retorna apenas a árvore de conteúdo: disciplinas (com `grupo`), módulos e materiais (id, título). Nada de alunos, assinaturas ou e-mails.
   - Resolve exatamente o que o Claude Code pediu: conferir os nomes/IDs dos materiais de Língua Portuguesa antes de inserir.

4. **Registro de auditoria** — cada chamada bem-sucedida grava uma linha em `admin_logs` com a ação, o material afetado e a quantidade inserida, marcada como origem "api-automacao". Você vê tudo que a automação fez.

5. **Documentação em `docs/admin-api.md`** — contrato dos dois endpoints, exemplos de payload e a regra explícita: nunca pedir chave de serviço nem senha de usuário.

### Por que isso é melhor

- O token não dá acesso ao painel, ao login, aos dados de alunos nem a operações destrutivas.
- Escopo real: listar catálogo de conteúdo e inserir questões. Nada mais.
- Rotação trivial: gerar um novo token invalida o antigo.
- Tudo auditado.

## Alternativa, se você quiser acesso amplo mesmo

Conta de administrador dedicada (não a sua): usuário próprio da automação, com papel `administrador`, senha guardada no cofre e trocada ao fim da tarefa. Funciona para qualquer tarefa do painel, mas expõe dados de alunos enquanto estiver ativa. Só implemento se você pedir explicitamente.

## Detalhes técnicos

- Rotas sob `src/routes/api/public/admin/` — o prefixo `public` apenas dispensa a autenticação de sessão do site; a autorização é feita dentro do handler pelo Bearer token.
- Escritas privilegiadas usam `supabaseAdmin` carregado com `await import("@/integrations/supabase/client.server")` **dentro** do handler, após validar o token.
- `ADMIN_API_TOKEN` é lido de `process.env` dentro do handler.
- Nenhuma alteração de schema e nenhuma política de RLS afrouxada; `admin_logs` já existe.
- URL estável para a automação: `https://portal-instituto-jd.lovable.app/api/public/admin/...`.
