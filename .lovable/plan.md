# Próximos passos após a propagação do DNS

## 1. Confirmar que a Cloudflare assumiu o DNS
Na Cloudflare, o domínio `institutojd.ia.br` deve aparecer como **Ativo** (Active). Enquanto estiver "Pendente", nada mais precisa ser feito — só aguardar.

Depois de ativo, confira rapidamente se os sites continuam abrindo:
- portal.institutojd.ia.br
- carreira360.institutojd.ia.br
- e-book.institutojd.ia.br

Todos os registros devem permanecer como **Somente DNS** (nuvem cinza).

## 2. Adicionar os registros de e-mail na Cloudflare
Em **DNS → Registros** da Cloudflare, adicionar exatamente estes três registros (todos sem proxy):

| Tipo | Nome | Conteúdo |
|------|------|----------|
| TXT | `_lovable-email.portal` | `lovable_email_verify=210bc9eddeafc32afdebd3b93bf4d14ba0beeebf8bded832a468bb7761ac33bd` |
| NS | `notify.portal` | `ns7.lovable.cloud` |
| NS | `notify.portal` | `ns8.lovable.cloud` |

Os dois NS têm o mesmo nome e valores diferentes — são dois registros separados. Registro NS não tem opção de proxy.

## 3. Verificar o domínio de e-mail
Depois de salvar, a verificação acontece automaticamente (alguns minutos). Você pode acompanhar em **Cloud → Emails**, e eu confiro aqui quando você avisar.


## 4. Testar os e-mails com a marca
Assim que o domínio ficar verificado, testar um envio real (redefinição de senha de um usuário) para confirmar que o e-mail chega com o remetente **Instituto J&D** e a logo oficial. Os templates em português com a identidade visual já estão prontos no projeto — nenhuma alteração de código é necessária.

## Observação
Se algum subdomínio ficar fora do ar após a troca de nameservers, o motivo mais provável é um registro que não foi copiado para a Cloudflare. Nesse caso, basta comparar com a lista do registro.br e recriar o que faltar.
