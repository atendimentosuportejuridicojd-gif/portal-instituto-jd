# Acesso do Claude Code ao banco — sem a chave de serviço

## Por que não compartilhar a chave de serviço

A chave de serviço interna não está acessível neste projeto: ela existe apenas como variável de ambiente no runtime do backend e não pode ser lida nem por mim nem por você. Isso é intencional — essa chave ignora todas as regras de segurança por linha (RLS), ou seja, quem a possui pode ler e alterar qualquer dado de qualquer aluno, incluindo e-mails e telefones. Colá-la em outra ferramenta ou no repositório é um risco que não se recupera sem rotacionar tudo.

A boa notícia: para ajudar nas tarefas do projeto, o Claude Code não precisa dela.

## O que será feito

### 1. Contexto completo do banco no repositório
Consolidar num único arquivo de referência (`docs/database.md`) o que a ferramenta precisa para escrever código correto:
- lista de tabelas, colunas e relacionamentos
- resumo das políticas de acesso (RLS) por tabela
- funções do banco (`has_role`, `tem_acesso_conteudo`, `is_assinatura_ativa`, etc.) e quando usar cada uma
- convenções do projeto: onde ficam as funções de servidor, qual cliente usar em cada caso

Isso, somado aos tipos já existentes e às migrações no repositório, cobre a maior parte do "melhor desempenho" que você busca.

### 2. Guia de acesso a dados reais (leitura)
Documentar como consultar dados sem privilégio total:
- **Leitura como aluno/admin autenticado**: usar as funções de servidor já existentes do projeto, que respeitam RLS e o papel de quem chamou.
- **Leitura pontual para depuração**: consultas feitas por mim, aqui no chat, com as ferramentas de banco do Lovable — sem expor credencial nenhuma.

### 3. Regras de segurança escritas no projeto
Adicionar ao `AGENTS.md` instruções explícitas para qualquer ferramenta externa:
- nunca pedir, gravar ou registrar em log a chave de serviço
- operações privilegiadas só dentro de funções de servidor do projeto, que leem a chave do ambiente
- toda função privilegiada precisa verificar o papel de administrador antes de agir

### 4. Ajuste opcional (se você quiser leitura direta no banco)
Se o Claude Code precisar consultar o banco por conta própria, o caminho seguro é um usuário de banco **somente leitura**, criado especificamente para isso, sem permissão de escrita e sem bypass de RLS. Isso exige uma alteração no banco e a criação de uma senha própria — me confirme se quer seguir por aí e eu incluo na execução.

## Detalhes técnicos

- Nenhuma chave nova é criada nem exposta; nada de `SUPABASE_SERVICE_ROLE_KEY` em arquivos do projeto.
- `docs/database.md` é gerado a partir do schema atual e das políticas existentes (documentação, sem alterar o banco).
- `AGENTS.md` ganha uma seção "Acesso ao banco e segredos".
- Item 4 seria uma migração criando um role `readonly` com `GRANT SELECT` restrito às tabelas não sensíveis, `FORCE ROW LEVEL SECURITY` mantido, e a senha armazenada no cofre de segredos — só executo com sua confirmação.
