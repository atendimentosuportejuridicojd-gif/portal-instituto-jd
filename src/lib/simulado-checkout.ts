import { criarCheckoutSimulado } from '@/lib/simulado-checkout.functions';
import { ambientePagamentos } from '@/lib/simulado-pagamento';

/** Returns the embedded checkout session; render CheckoutSimulado with this result. */
export async function iniciarCheckoutSimulado(dataProva: string): Promise<{ clientSecret: string }> {
  const result = await criarCheckoutSimulado({ data: { data_prova: dataProva, environment: ambientePagamentos(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN) } });
  if ('error' in result) throw new Error(result.error);
  return result;
}
