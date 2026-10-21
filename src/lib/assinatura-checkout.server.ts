import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { ASSINATURA_SERVICE, parsePriceId, priceIdPlano, type Periodo } from "@/lib/assinatura-planos";

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
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

export async function criarSessaoAssinatura(
  context: { supabase: any; userId: string },
  data: { periodo: Periodo; environment: StripeEnv },
  origin: string,
) {
  const [{ data: profile, error }, { data: ativa }] = await Promise.all([
    context.supabase.from("profiles").select("email, carreira, bloqueado").eq("id", context.userId).single(),
    context.supabase.rpc("is_assinatura_ativa", { _user_id: context.userId }),
  ]);
  if (error || !profile) throw new Error("Perfil não encontrado.");
  if (profile.bloqueado) throw new Error("Conta bloqueada. Fale com o suporte.");
  if (ativa) throw new Error("Você já possui uma assinatura ativa.");
  // Career comes from the profile, never from the client.
  const priceId = priceIdPlano(profile.carreira, data.periodo);
  const plano = parsePriceId(priceId)!;
  const stripe = createStripeClient(data.environment);
  const prices = await stripe.prices.list({ lookup_keys: [priceId], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw new Error("Plano não configurado.");
  const recorrente = price.type === "recurring";
  const customer = await resolveOrCreateCustomer(stripe, { userId: context.userId, email: profile.email });
  const metadata = { userId: context.userId, user_id: context.userId, service: ASSINATURA_SERVICE, plano: priceId, carreira: plano.carreira };
  let description: string | undefined;
  if (!recorrente) {
    const product = await stripe.products.retrieve(typeof price.product === "string" ? price.product : price.product.id);
    description = `${product.name} — Plano Anual`;
  }
  const session = await stripe.checkout.sessions.create({
    mode: recorrente ? "subscription" : "payment",
    ui_mode: "embedded_page",
    customer,
    return_url: `${origin}/dashboard?assinatura=ok`,
    line_items: [{ price: price.id, quantity: 1 }],
    metadata,
    ...(recorrente ? { subscription_data: { metadata } } : { payment_intent_data: { metadata, description } }),
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
  });
  if (!session.client_secret) throw new Error("O pagamento não retornou uma sessão válida.");
  return { clientSecret: session.client_secret };
}
