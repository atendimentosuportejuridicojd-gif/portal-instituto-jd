# Conectar o Claude Code ao portal via MCP (com login)

Sim, existe um caminho oficial e bem mais seguro que token ou senha: transformar o próprio portal em um **servidor MCP**. O Claude Code (e também ChatGPT, Cursor, Claude Desktop) se conecta pelo endereço do site, faz **login com a sua conta do portal** numa tela de autorização, e passa a usar apenas as ferramentas que eu expuser — nada de chave de serviço, nada de senha compartilhada, e as permissões são exatamente as do usuário que autorizou (administrador, no seu caso).

## Como funciona na prática

```text
Claude Code  ->  https://portal.institutojd.ia.br/mcp
                        |
                 tela "Autorizar acesso" (você aprova, logado como admin)
                        |
                 ferramentas do portal (catálogo, questões, ...)
                        |
                 banco com as MESMAS permissões do seu usuário
```

Você pode revogar o acesso a qualquer momento, e tudo que a automação fizer fica registrado no log administrativo.

## Ferramentas que vou expor

1. `listar_catalogo` — cargos/concursos, disciplinas (com grupo Gerais/Específicos), módulos e materiais com seus IDs. Resolve o problema de "descobrir o ID do material" antes de importar.
2. `listar_questoes` — questões de um material (enunciado curto, ordem, publicado) para conferência e para evitar duplicidade.
3. `inserir_questoes` — inserção em lote: enunciado, referência, comentário do professor, 5 alternativas (A–E) e gabarito. Recusa enunciado já existente no mesmo material, numera a `ordem` em sequência e grava auditoria em `admin_logs`.
4. `atualizar_questao` — corrigir enunciado, comentário, alternativas, gabarito ou publicação de uma questão existente.
5. `resumo_conteudo` — contagem de materiais e questões por disciplina, para acompanhar o que falta importar.

Todas exigem papel `administrador`; sem isso, a ferramenta responde erro. Nenhuma ferramenta lê dados de alunos (perfis, e-mails, telefones, assinaturas).

## O que você faz do seu lado

1. Habilito o servidor e a tela de autorização aqui no projeto.
2. Publico as alterações.
3. No Claude Code você adiciona o servidor MCP apontando para `https://portal.institutojd.ia.br/mcp`, faz login com o e-mail de administrador e aprova.

## Detalhes técnicos

- Pacote `@lovable.dev/mcp-js` (já liberado no `bunfig.toml`) + `mcpPlugin()` no `vite.config.ts`; as rotas HTTP são geradas automaticamente.
- Definição em `src/lib/mcp/index.ts`, uma ferramenta por arquivo em `src/lib/mcp/tools/`, cliente compartilhado em `src/lib/mcp/supabase.ts`.
- Autenticação OAuth 2.1 do Lovable Cloud (`auth.oauth.issuer`), com registro dinâmico de clientes ativado, e tela de consentimento em `src/routes/[.]lovable.oauth.consent.tsx` reaproveitando a tela de login atual.
- As ferramentas encaminham o token verificado ao banco, então o RLS roda como o usuário autorizado; a checagem de papel usa `has_role(..., 'administrador')`. Nada de `service_role`.
- Sem mudança de schema e sem afrouxar nenhuma política de RLS.

## Alternativa

Se preferir não expor um servidor, o outro caminho é o endpoint com `ADMIN_API_TOKEN` que planejamos antes (mais simples, mas o token vive fora da sua identidade e precisa ser rotacionado). O MCP é a opção recomendada.
