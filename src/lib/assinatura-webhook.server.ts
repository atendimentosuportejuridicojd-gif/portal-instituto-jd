import type Stripe from "stripe";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { ASSINATURA_SERVICE, TESTE_PRICE_ID, fimPlano, statusPortal } from "@/lib/assinatura-planos";

const EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "charge.refunded",
]);

async function gravar(db: any, ref: string, row: Record<string, unknown>) {
  const agora = new Date().toISOString();
  const { data: atual, error } = await db.from("assinaturas").select("id").eq("hotmart_transaction_id", ref).maybeSingle();
  if (error) throw error;
  const payload = { ...row, produto: "stripe", ultimo_evento_em: agora, updated_at: agora };
  const r = atual
    ? await db.from("assinaturas").update(payload).eq("id", atual.id)
    : await db.from("assinaturas").insert({ ...payload, hotmart_transaction_id: ref });
  if (r.error) throw r.error;
  // A paying student is no longer a trial student.
  if (row.status === "ativa" && row.user_id) {
    await db.from("user_roles").delete().eq("user_id", row.user_id).eq("role", "aluno_teste");
  }
}

async function syncSubscription(db: any, stripe: Stripe, subId: string, evento: string) {
  const sub = await stripe.subscriptions.retrieve(subId);
  if (sub.metadata?.service !== ASSINATURA_SERVICE || !sub.metadata.user_id) return;
  const item: any = sub.items.data[0];
  const fimSeg = item?.current_period_end ?? (sub as any).current_period_end;
  await gravar(db, sub.id, {
    user_id: sub.metadata.user_id,
    status: statusPortal(sub.status),
    plano: sub.metadata.plano,
    carreira: sub.metadata.carreira,
    inicio: new Date(sub.start_date * 1000).toISOString(),
    fim: fimSeg ? new Date(fimSeg * 1000).toISOString() : null,
    cancelada_em: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    ultimo_evento: evento,
  });
}

/**
 * Fila de conversões offline do Google Ads: uma linha na primeira compra paga de quem tem gclid no
 * perfil (o índice único por aluno barra as seguintes). Falha aqui nunca derruba o webhook do Stripe.
 */
async function registrarConversaoGoogle(db: any, obj: any, userId: string, ref: string, evento: string) {
  try {
    if (obj.metadata?.plano === TESTE_PRICE_ID) return;
    const { data: perfil } = await db.from("profiles").select("gclid, gclid_captured_at").eq("id", userId).maybeSingle();
    if (!perfil?.gclid) return;
    const { data: ja } = await db.from("conversoes_google_ads").select("id").eq("user_id", userId).maybeSingle();
    if (ja) return;
    const valor = Number(obj.amount_total) / 100;
    const { error } = await db.from("conversoes_google_ads").upsert(
      {
        user_id: userId,
        gclid: perfil.gclid,
        gclid_capturado_em: perfil.gclid_captured_at,
        hotmart_transaction_id: ref, // nome legado da coluna: guarda o id do pagamento/assinatura
        valor: Number.isFinite(valor) && valor > 0 ? valor : null,
        moeda: String(obj.currency ?? "brl").toUpperCase(),
        convertido_em: new Date().toISOString(),
      },
      { onConflict: "hotmart_transaction_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  } catch (e) {
    await db.from("admin_logs").insert({
      acao: "stripe.conversao_google_erro",
      entidade: "assinaturas",
      metadata: { ref, evento, mensagem: e instanceof Error ? e.message : "erro" },
    });
  }
}

export async function processarEventoAssinatura(event: Stripe.Event, env: StripeEnv, db: any, stripe = createStripeClient(env)) {
  if (!EVENTS.has(event.type)) return;
  // assinaturas has no environment column: test payments never grant real access.
  if (env === "sandbox") return;
  const obj: any = event.data.object;

  if (event.type.startsWith("checkout.session.")) {
    if (obj.metadata?.service !== ASSINATURA_SERVICE || obj.payment_status === "unpaid") return;
    if (obj.mode === "subscription" && obj.subscription) {
      const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id;
      await syncSubscription(db, stripe, subId, event.type);
      return registrarConversaoGoogle(db, obj, obj.metadata.user_id, subId, event.type);
    }
    if (obj.mode === "payment" && obj.payment_intent) {
      const pi = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent.id;
      const pago = new Date(event.created * 1000);
      await gravar(db, pi, {
        user_id: obj.metadata.user_id, status: "ativa", plano: obj.metadata.plano, carreira: obj.metadata.carreira,
        inicio: pago.toISOString(), fim: fimPlano(obj.metadata.plano, pago), ultimo_evento: event.type,
      });
      return registrarConversaoGoogle(db, obj, obj.metadata.user_id, pi, event.type);
    }
    return;
  }
  if (event.type.startsWith("customer.subscription.")) return syncSubscription(db, stripe, obj.id, event.type);
  if (event.type.startsWith("invoice.")) {
    const subId = obj.parent?.subscription_details?.subscription ?? obj.subscription;
    if (subId) return syncSubscription(db, stripe, typeof subId === "string" ? subId : subId.id, event.type);
    return;
  }
  if (event.type === "charge.refunded" && obj.payment_intent) {
    const pi = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent.id;
    const { data } = await db.from("assinaturas").select("id").eq("hotmart_transaction_id", pi).maybeSingle();
    if (data) await gravar(db, pi, { status: "cancelada", cancelada_em: new Date().toISOString(), ultimo_evento: event.type });
  }
}
