import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { dataProvaSchema } from '@/lib/simulado-pagamento';

export const criarCheckoutSimulado = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ data_prova: dataProvaSchema, environment: z.enum(['sandbox', 'live']) }).parse(input))
  .handler(async ({ context, data }): Promise<{ clientSecret: string } | { error: string }> => {
    const { getStripeErrorMessage } = await import('@/lib/stripe.server');
    try {
      const { criarSessaoSimulado } = await import('@/lib/simulado-checkout.server');
      return await criarSessaoSimulado(context, data, new URL(getRequest().url).origin);
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
