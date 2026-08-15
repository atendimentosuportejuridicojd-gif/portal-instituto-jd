# API de automação administrativa

Endpoints dedicados a automações (ex.: Claude Code) para tarefas de conteúdo,
sem acesso a dados de alunos, assinaturas ou e-mails.

## Regras de segurança (obrigatórias)

- **Nunca** pedir, receber ou armazenar a chave de serviço do banco. Ela não é
  acessível neste projeto.
- **Nunca** pedir e-mail/senha de usuário administrador.
- O único credencial válido é o token `ADMIN_API_TOKEN`, enviado no header
  `Authorization: Bearer <token>`. Ele não deve ser gravado no repositório nem
  em logs.
- Toda escrita é registrada em `admin_logs` com `metadata.origem = "api-automacao"`.

Base URL: `https://portal-instituto-jd.lovable.app`

---

## GET /api/public/admin/catalogo

Retorna a árvore de conteúdo para localizar IDs antes de inserir.

```bash
curl -s https://portal-instituto-jd.lovable.app/api/public/admin/catalogo \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

Resposta:

```json
{
  "disciplinas": [{ "id": "...", "nome": "Língua Portuguesa", "grupo": "gerais", "ordem": 1 }],
  "modulos": [{ "id": "...", "nome": "...", "disciplina_id": "...", "ordem": 1 }],
  "materiais": [{ "id": "...", "titulo": "INTERPRETAÇÃO DE TEXTO", "disciplina_id": "...", "publicado": true }]
}
```

---

## POST /api/public/admin/questoes

Insere questões comentadas em um material.

```bash
curl -s -X POST https://portal-instituto-jd.lovable.app/api/public/admin/questoes \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "material_titulo": "INTERPRETAÇÃO DE TEXTO",
    "disciplina_nome": "Língua Portuguesa",
    "publicado": true,
    "questoes": [
      {
        "enunciado": "Texto da questão...",
        "referencia": "FGV — TJ/XX 2024",
        "comentario_professor": "Explicação do gabarito...",
        "banca": "FGV",
        "ano": 2024,
        "alternativas": [
          { "letra": "A", "texto": "...", "correta": false },
          { "letra": "B", "texto": "...", "correta": true },
          { "letra": "C", "texto": "...", "correta": false },
          { "letra": "D", "texto": "...", "correta": false },
          { "letra": "E", "texto": "...", "correta": false }
        ]
      }
    ]
  }'
```

### Campos

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `material_id` | um dos dois | UUID exato do material |
| `material_titulo` | um dos dois | Busca sem diferenciar maiúsculas; use `disciplina_nome` para desambiguar |
| `disciplina_nome` | não | Filtra o material por disciplina |
| `publicado` | não | Padrão `true` |
| `questoes[].enunciado` | sim | Texto completo (inclua o texto de apoio quando houver) |
| `questoes[].referencia` | não | Banca/concurso de origem |
| `questoes[].comentario_professor` | não | Comentário exibido após a resposta |
| `questoes[].alternativas` | sim | 2 a 6 itens, com exatamente uma `correta: true` |

### Respostas

- `200` — `{ ok, material_id, questoes_inseridas, alternativas_inseridas, questoes_ignoradas, ids }`
- `400` — JSON ou payload inválido
- `401` — token ausente ou incorreto
- `404` — material não encontrado
- `409` — mais de um material com o mesmo título (informe `material_id`)
- `503` — `ADMIN_API_TOKEN` não configurado

### Idempotência

Questões cujo enunciado já exista no mesmo material são ignoradas e listadas em
`questoes_ignoradas`, então reenviar o mesmo lote não duplica conteúdo.
