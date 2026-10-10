/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { processarEventoSimulado } from './simulado-webhook.server';
import type Stripe from 'stripe';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function fixture(existing: any = null, revoked = false) {
  const writes: any[] = [];
  const db = { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing }) }) }),
    upsert: async (data: any, options: any) => { writes.push({ data, options }); return {}; },
    update: (data: any) => {
      const filters: any[] = [];
      const query: any = { eq: (column: string, value: any) => { filters.push([column, value]); return query; },
        then: (resolve: any) => { writes.push({ data, filters }); resolve({}); } };
      return query;
    },
  }) };
  const stripe: any = {
    paymentIntents: { retrieve: async () => ({ id: 'pi_example', status: 'succeeded', created: 1791580000,
      metadata: { service: 'simulados_jd', user_id: userId, data_prova: '2026-11-01' } }) },
    charges: { list: async () => ({ data: [{ disputed: revoked, amount_refunded: 0 }] }) },
  };
  const event = { id: 'evt_example', type: 'checkout.session.completed', livemode: true,
    data: { object: { mode: 'payment', payment_status: 'paid', payment_intent: 'pi_example' } } } as unknown as Stripe.Event;
  return { db, stripe, event, writes };
}
describe('Simulados webhook reconciliation', () => {
  test('test payments do not grant real access', async () => {
    const f = fixture(); await processarEventoSimulado(f.event, 'sandbox', f.db, f.stripe); expect(f.writes).toHaveLength(0);
  });
  test('unpaid checkout does not grant access', async () => {
    const f = fixture(); (f.event.data.object as any).payment_status = 'unpaid';
    await processarEventoSimulado(f.event, 'live', f.db, f.stripe); expect(f.writes).toHaveLength(0);
  });
  test('success retries upsert the same entitlement with stable dates', async () => {
    const f = fixture(); await processarEventoSimulado(f.event, 'live', f.db, f.stripe);
    await processarEventoSimulado(f.event, 'live', f.db, f.stripe);
    expect(f.writes[0]).toEqual(f.writes[1]); expect(f.writes[0].options.onConflict).toBe('user_id');
    expect(f.writes[0].data.fim).toBe('2026-11-02T02:59:59.999Z');
  });
  test('late success after dispute only revokes matching payment', async () => {
    const f = fixture(null, true); await processarEventoSimulado(f.event, 'live', f.db, f.stripe);
    expect(f.writes[0].data.ativo).toBe(false);
    expect(f.writes[0].filters).toContainEqual(['referencia_externa', 'pi_example']);
  });
  test('manual access is never overwritten', async () => {
    const f = fixture({ origem: 'manual' }); await processarEventoSimulado(f.event, 'live', f.db, f.stripe);
    expect(f.writes).toHaveLength(0);
  });
});