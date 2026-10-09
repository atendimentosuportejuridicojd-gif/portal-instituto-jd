import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ambientePagamentos } from '@/lib/simulado-pagamento';

let stripePromise: ReturnType<typeof loadStripe> | undefined;
export function CheckoutSimulado({ clientSecret }: { clientSecret: string }) {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  if (!token) return <p className="text-destructive">Conclua a ativação de pagamentos para aceitar pagamentos reais.</p>;
  const env = ambientePagamentos(token);
  stripePromise ??= loadStripe(token);
  return <>
    {env === 'sandbox' && <p role="status" className="mb-4 border border-border bg-muted p-3 text-sm text-muted-foreground">Pagamento de teste: não há cobrança real nem liberação de acesso.</p>}
    <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  </>;
}
