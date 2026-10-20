/**
 * Inscreve o app da Meta na Página para receber os eventos "leadgen" (formulário instantâneo).
 * Rode depois de configurar o webhook do app apontando para /api/public/meta-leads.
 *
 * Uso:
 *   META_PAGE_ACCESS_TOKEN=... META_GRAPH_VERSION=v21.0 META_PAGE_ID=... \
 *   bun scripts/meta_subscribe_page.mjs
 *
 * O token vem só do ambiente e nunca é impresso.
 */
const token = process.env.META_PAGE_ACCESS_TOKEN;
const versao = process.env.META_GRAPH_VERSION;
const pageId = process.env.META_PAGE_ID ?? process.argv[2];
if (!token || !versao || !pageId) {
  throw new Error("Defina META_PAGE_ACCESS_TOKEN, META_GRAPH_VERSION e META_PAGE_ID (ou passe o id da Página como argumento).");
}

const resp = await fetch(`https://graph.facebook.com/${encodeURIComponent(versao)}/${encodeURIComponent(pageId)}/subscribed_apps`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ subscribed_fields: "leadgen" }),
});
const corpo = await resp.json().catch(() => ({}));

if (!resp.ok || corpo.success !== true) {
  // Só a mensagem de erro da Meta; a resposta nunca contém o token.
  console.error(`Falha ao inscrever (HTTP ${resp.status}):`, corpo?.error?.message ?? "resposta inesperada");
  process.exit(1);
}
console.log(`App inscrito na Página ${pageId} para o campo "leadgen".`);
