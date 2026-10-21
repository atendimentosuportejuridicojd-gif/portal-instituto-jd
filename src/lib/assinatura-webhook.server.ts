import type Stripe from "stripe";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { ASSINATURA_SERVICE, fimAnual, statusPortal } from "@/lib/assinatura-planos";

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

export async function processarEventoAssinatura(event: Stripe.Event, env: StripeEnv, db: any, stripe = createStripeClient(env)) {
  if (!EVENTS.has(event.type)) return;
  // assinaturas has no environment column: test payments never grant real access.
  if (env === "sandbox") return;
  const obj: any = event.data.object;

  if (event.type.startsWith("checkout.session.")) {
    if (obj.metadata?.service !== ASSINATURA_SERVICE || obj.payment_status === "unpaid") return;
    if (obj.mode === "subscription" && obj.subscription) {
      return syncSubscription(db, stripe, typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id, event.type);
    }
    if (obj.mode === "payment" && obj.payment_intent) {
      const pi = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent.id;
      const pago = new Date(event.created * 1000);
      return gravar(db, pi, {
        user_id: obj.metadata.user_id, status: "ativa", plano: obj.metadata.plano, carreira: obj.metadata.carreira,
        inicio: pago.toISOString(), fim: fimAnual(pago), ultimo_evento: event.type,
      });
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
