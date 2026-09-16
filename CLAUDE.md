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

## Acervo base — conteúdo

- Estrutura: disciplina -> matéria. Matéria é registro em `materiais`
  com tipo='markdown' e o texto em `conteudo_md`.
- `modulos` não é usada pelo acervo base. `modulo_id` fica NULL.
- Matérias nascem vazias pelo seed e são preenchidas na publicação.
- Publicação: manda, insere, aparece. Portal fechado por assinatura.
- Republicar sobrescreve direto. Sem `material_versoes`.
- Uma única versão de cada matéria, em profundidade máxima — não existe
  distinção de camada (Técnico/Analista) no texto. Essa distinção
  acontece na alocação por certame (trilhas/concursos), não no conteúdo.
- Diretivas válidas: `:::legislacao`, `:::atencao` e `:::exemplo`.
  `:::legislacao` exige `fonte`/`url`; em `:::atencao` são opcionais
  (disciplinas sem legislação/julgado, ex.: Português, Matemática,
  Informática, Análise de Dados, usam `:::atencao` sem fonte para
  marcar ponto crítico de prova).
- Títulos: H1 (matéria), H2 (subitem do programático) e H3 (seção).
  H4 ou mais profundo é rejeitado. Numeração em três níveis, gerada
  pelo componente.
- O validador do `publish.mjs` valida estrutura, nunca mérito jurídico —
  mas antes de rodá-lo é obrigatório passar pela auditoria de conteúdo
  de 4 camadas descrita em `.claude/skills/publicar-materia/SKILL.md`
  (estrutura, negrito de termo-chave, pesquisa jurídica real e checagem
  de link), que corrige mérito quando encontra citação desatualizada.
  Isso vale sempre, para qualquer matéria publicada, não é opcional.
- Nunca criar arquivo .md no repositório.
- Antes de DELETE ou UPDATE em cadeia: consultar FKs e relatar o
  alcance antes de executar.
