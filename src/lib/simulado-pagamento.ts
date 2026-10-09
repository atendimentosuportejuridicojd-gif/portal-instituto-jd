import { z } from 'zod';

// Price amount is maintained in the Stripe catalog under this single stable lookup key.
export const SIMULADO_PRICE_ID = 'simulados_jd_avulso';
export const SIMULADO_SERVICE = 'simulados_jd';
export const dataProvaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Data da prova inválida.');
export function hojeBrasilia(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function validarDataProva(value: string, now = new Date()): string {
  const data = dataProvaSchema.parse(value);
  if (data < hojeBrasilia(now)) throw new Error('A data da prova não pode estar no passado.');
  return data;
}
export function fimDataProva(value: string): string {
  const data = dataProvaSchema.parse(value);
  return new Date(`${data}T23:59:59.999-03:00`).toISOString();
}
export function ambientePagamentos(token: string | undefined): 'sandbox' | 'live' {
  if (token?.startsWith('pk_test_')) return 'sandbox';
  if (token?.startsWith('pk_live_')) return 'live';
  throw new Error('Conclua a ativação de pagamentos no Lovable antes de iniciar a cobrança.');
}
