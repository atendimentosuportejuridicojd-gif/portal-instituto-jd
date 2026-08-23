# Proteger a senha das disciplinas (mantendo a senha 1234)

A senha em si continua a mesma (1234). O problema apontado pelo scanner não é a força da senha, e sim que **qualquer usuário logado consegue ler a coluna de senha direto do banco**, mesmo sem assinatura — o que permite abrir uma disciplina protegida sem saber a senha pela tela.

Verificado agora: a tabela `disciplinas` tem a política de leitura `disciplinas_read_all_auth` com condição `true` para usuários autenticados, ou seja, todas as colunas (inclusive `senha`) ficam legíveis. Confirmado também que hoje **só "Técnico Legislativo" tem senha** (1234); as outras sete disciplinas continuam abertas e seguem assim. No código, a senha só é usada no servidor (painel do admin e conferência de senha), então dá para fechar o acesso sem mudar a experiência do aluno.

## O que será feito

1. Mover a senha para uma tabela separada, visível apenas para administradores (a senha atual 1234 é copiada automaticamente, nada se perde).
2. Criar uma função de banco que apenas confere se a senha digitada está correta (responde sim/não, nunca devolve a senha).
3. Ajustar o painel do administrador para continuar exibindo e editando a senha da disciplina normalmente.
4. Ajustar a conferência de senha do aluno para usar a nova função — a tela e o comportamento continuam idênticos.

## Detalhes técnicos

- Migração: `create table public.disciplina_senhas (disciplina_id uuid pk references disciplinas on delete cascade, senha text not null, updated_at timestamptz default now())`, com `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated` restrito por política `has_role(auth.uid(),'administrador')`, `GRANT ALL ... TO service_role`, RLS habilitado.
- Copiar dados: `insert into disciplina_senhas select id, senha from disciplinas where senha is not null;` depois `alter table public.disciplinas drop column senha;`.
- Função `public.disciplina_tem_senha(_disciplina_id uuid) returns boolean` e `public.verificar_senha_disciplina(_disciplina_id uuid, _senha text) returns boolean`, ambas `security definer`, `stable`, `set search_path = public`, com `GRANT EXECUTE TO authenticated`.
- `src/lib/acervo.functions.ts`: remover `senha` do select em `adminListAcervo` (buscar de `disciplina_senhas`), gravar em `disciplina_senhas` no `adminUpsertDisciplina`, e trocar a conferência (linha ~324) por `rpc('verificar_senha_disciplina')`.
- `src/lib/questoes.functions.ts`: substituir `disciplinas(..., senha)` por chamada a `disciplina_tem_senha` para manter o campo `tem_senha`.
- `src/integrations/supabase/types.ts` é regenerado pela migração.
