# Próximos passos após a propagação do DNS

## 1. Confirmar que a Cloudflare assumiu o DNS
Na Cloudflare, o domínio `institutojd.ia.br` deve aparecer como **Ativo** (Active). Enquanto estiver "Pendente", nada mais precisa ser feito — só aguardar.

Depois de ativo, confira rapidamente se os sites continuam abrindo:
- portal.institutojd.ia.br
- carreira360.institutojd.ia.br
- e-book.institutojd.ia.br

Todos os registros devem permanecer como **Somente DNS** (nuvem cinza).

## 2. Adicionar os registros de e-mail na Cloudflare
No painel do Lovable, em **Cloud → Emails**, aparecem os registros do domínio de envio `notify.portal.institutojd.ia.br`. Na Cloudflare, em **DNS → Registros**, adicionar:

- **2 registros NS** com nome `notify.portal` e os dois valores `nsX.lovable.cloud` mostrados na tela do Lovable
- **1 registro TXT** de verificação, caso ainda não exista (nome `_lovable-email.portal`)

Registro NS não tem opção de proxy — é só nome e valor.

## 3. Verificar o domínio de e-mail
De volta em **Cloud → Emails**, clicar em **Verify Domain**. A verificação pode levar de minutos a algumas horas.

## 4. Testar os e-mails com a marca
Assim que o domínio ficar verificado, testar um envio real (redefinição de senha de um usuário) para confirmar que o e-mail chega com o remetente **Instituto J&D** e a logo oficial. Os templates em português com a identidade visual já estão prontos no projeto — nenhuma alteração de código é necessária.

## Observação
Se algum subdomínio ficar fora do ar após a troca de nameservers, o motivo mais provável é um registro que não foi copiado para a Cloudflare. Nesse caso, basta comparar com a lista do registro.br e recriar o que faltar.
