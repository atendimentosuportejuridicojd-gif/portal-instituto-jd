import { assertAcessoAluno } from '@/lib/acervo.server';
import { createStripeClient } from '@/lib/stripe.server';
import type { StripeEnv } from '@/lib/stripe.server';
import { SIMULADO_PRICE_ID, SIMULADO_SERVICE, validarDataProva } from '@/lib/simulado-pagamento';

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error('Invalid userId');
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}
export async function criarSessaoSimulado(context: { supabase: any; userId: string }, data: { data_prova: string; environment: StripeEnv }, origin: string) {
  validarDataProva(data.data_prova);
  await assertAcessoAluno(context);
  // assertAcessoAluno also allows trials/admins; paid Hotmart is mandatory here.
  const [{ data: assinatura, error }, { data: profile, error: profileError }] = await Promise.all([
    context.supabase.from('assinaturas').select('status, fim').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('profiles').select('bloqueado, email').eq('id', context.userId).single(),
  ]);
  if (error || profileError || profile?.bloqueado || assinatura?.status !== 'ativa' || (assinatura.fim && new Date(assinatura.fim).getTime() <= Date.now())) {
    throw new Error('Este serviço exige uma assinatura Hotmart ativa.');
  }
  const stripe = createStripeClient(data.environment);
  const prices = await stripe.prices.list({ lookup_keys: [SIMULADO_PRICE_ID], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price || price.type !== 'one_time' || price.currency !== 'brl') throw new Error('Preço avulso não configurado.');
  const product = await stripe.products.retrieve(typeof price.product === 'string' ? price.product : price.product.id);
  const customer = await resolveOrCreateCustomer(stripe, { userId: context.userId, email: profile.email });
  const metadata = { user_id: context.userId, userId: context.userId, data_prova: data.data_prova, service: SIMULADO_SERVICE };
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', ui_mode: 'embedded_page', customer,
    return_url: `${origin}/cronogramas`,
    line_items: [{ price: price.id, quantity: 1 }],
    metadata, payment_intent_data: { metadata, description: product.name },
    automatic_tax: { enabled: true }, customer_update: { address: 'auto' },
    // Dynamic payment methods: Stripe displays card and Pix only when eligible/enabled.
  });
  if (!session.client_secret) throw new Error('O pagamento não retornou uma sessão válida.');
  return { clientSecret: session.client_secret };
}
