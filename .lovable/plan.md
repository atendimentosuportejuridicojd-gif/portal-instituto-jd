# Importar questões sem entregar credenciais

## O que o Claude Code pediu

Ele desistiu da chave de serviço (correto — ela não existe neste projeto) e agora pede **e-mail e senha de um administrador** para autenticar num script local e inserir questões em `questoes` / `questao_alternativas`.

Isso é melhor que a chave de serviço, mas ainda tem dois problemas:
- A senha de admin dá acesso total ao painel: dados de alunos (nome, e-mail, celular), assinaturas, materiais, configurações. Não é um escopo "só inserir questões".
- A senha ficaria em texto plano num script fora do repositório, num ambiente que você não controla totalmente.

E, principalmente: **essa importação não precisa de ferramenta externa.** Eu já fiz exatamente isso aqui — as 40 questões da FGV em Língua Portuguesa → Interpretação de Texto foram inseridas por mim, com gabarito, alternativas e comentário, sem nenhuma credencial trocada.

## Caminho recomendado

1. Você me envia o arquivo de questões (txt/docx/pdf, no mesmo formato dos anteriores) e diz a disciplina e o material de destino.
2. Eu confirmo os materiais existentes em Língua Portuguesa (Tipos e Gêneros Textuais, Ortografia e Acentuação, Coesão Textual, Gramática Prática, Reescrita de Texto) e os IDs reais.
3. Eu faço o parsing (enunciado, referência, alternativas A–E, gabarito, comentário) e insiro no banco, com verificação de contagem no final.
4. Nenhuma senha, chave ou credencial sai daqui.

## O que responder ao Claude Code

> Não vou compartilhar senha de administrador. A importação de questões será feita direto pelo Lovable, que tem acesso gerenciado ao banco. Você pode continuar ajudando no código do projeto (componentes, funções de servidor, ajustes de interface) — para isso o repositório e os tipos do banco já são suficientes.

## Se você ainda quiser que o Claude Code faça a importação

Aí o caminho seguro é um **usuário admin temporário e descartável**, criado só para essa tarefa:
- conta separada, sem relação com a sua conta pessoal
- papel de administrador concedido apenas durante a importação
- papel removido e conta apagada assim que terminar

Ainda assim, esse usuário temporário veria dados de alunos enquanto estivesse ativo. Só sigo por esse caminho se você confirmar explicitamente.

## Detalhes técnicos

- Inserção via SQL direto nas tabelas `questoes` e `questao_alternativas`, respeitando `material_id`, `disciplina_id`, `ordem`, `letra`, `correta` e `comentario_professor` — mesmo padrão da importação anterior.
- Nenhuma alteração de schema, nenhuma política de RLS afrouxada, nenhum segredo novo.
- Opção do admin temporário exigiria uma migração pontual em `user_roles` (concessão e depois remoção do papel `administrador`).
