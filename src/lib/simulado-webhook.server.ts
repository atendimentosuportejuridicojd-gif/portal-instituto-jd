import type Stripe from 'stripe';
import { z } from 'zod';
import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';
import { fimDataProva, SIMULADO_SERVICE, dataProvaSchema } from '@/lib/simulado-pagamento';

const paymentMetadata = z.object({ service: z.literal(SIMULADO_SERVICE), user_id: z.string().uuid(), data_prova: dataProvaSchema });
const relevantEvents = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'charge.refunded', 'charge.dispute.created', 'refund.updated']);
export async function processarEventoSimulado(event: Stripe.Event, env: StripeEnv, db: any, stripe = createStripeClient(env)) {
  if (!relevantEvents.has(event.type)) return;
  // The existing entitlement table has no environment column. Never let test payments change real access.
  if (env === 'sandbox') return;
  if (!event.livemode) throw new Error('Payment environment mismatch');
  const object = event.data.object as unknown as { payment_intent?: string | { id: string }; mode?: string; payment_status?: string };
  if (event.type.startsWith('checkout.session.') && (object.mode !== 'payment' || object.payment_status !== 'paid')) return;
  const paymentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
  if (!paymentId) return;
  const payment = await stripe.paymentIntents.retrieve(paymentId);
  if (payment.metadata.service !== SIMULADO_SERVICE) return;
  const metadata = paymentMetadata.parse(payment.metadata);
  // Reconcile current provider state rather than event order. A repeated/late success cannot undo a refund/dispute.
  const charges = await stripe.charges.list({ payment_intent: payment.id, limit: 100 });
  const paid = payment.status === 'succeeded';
  const revoked = charges.data.some((charge) => charge.disputed || charge.amount_refunded > 0);
  if (!paid && !revoked) return;
  const { data: existing, error: readError } = await db.from('simulado_acessos').select('origem, referencia_externa, inicio').eq('user_id', metadata.user_id).maybeSingle();
  if (readError) throw readError;
  if (existing?.origem === 'manual') return; // Manual administrator grants are independent of this payment.
  if (revoked) {
    // An old payment refund must not revoke a newer purchase.
    const { error } = await db.from('simulado_acessos').update({ ativo: false }).eq('user_id', metadata.user_id).eq('origem', 'stripe').eq('referencia_externa', payment.id);
    if (error) throw error;
    return;
  }
  const inicio = new Date(payment.created * 1000).toISOString();
  if (existing?.referencia_externa !== payment.id && existing?.inicio && existing.inicio > inicio) return;
  const { error } = await db.from('simulado_acessos').upsert({
    user_id: metadata.user_id, ativo: true, origem: 'stripe', referencia_externa: payment.id,
    inicio, fim: fimDataProva(metadata.data_prova),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}
