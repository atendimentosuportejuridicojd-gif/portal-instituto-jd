# Instruções para o Claude Code neste projeto

## Fluxo de teste para mudanças simples

Para tarefas simples de edição de conteúdo/interface (textos, ajustes visuais,
pequenos campos de formulário, etc.), não é necessário rodar o servidor de
desenvolvimento local nem testar no navegador automaticamente. Basta:

1. Implementar a mudança.
2. Fazer commit e push.

O usuário confere visualmente no site publicado (via Lovable) depois do deploy.

Reserve testes automatizados mais completos (rodar o servidor local, testar no
navegador, etc.) apenas para:

- Quando o usuário pedir explicitamente.
- Quando a mudança for mais arriscada — por exemplo, lógica de pagamento,
  autenticação, ou exclusão de dados.
