import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: { handlers: { POST: async ({ request }) => {
    const env = new URL(request.url).searchParams.get('env');
    if (env !== 'sandbox' && env !== 'live') return new Response('Invalid environment', { status: 400 });
    const { verifyWebhook } = await import('@/lib/stripe.server');
    let event;
    try { event = await verifyWebhook(request, env); }
    catch { return new Response('Invalid signature', { status: 400 }); }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    try {
      const { processarEventoSimulado } = await import('@/lib/simulado-webhook.server');
      await processarEventoSimulado(event, env, supabaseAdmin);
      return Response.json({ received: true });
    } catch {
      try {
        const { error } = await supabaseAdmin.from('admin_logs').insert({ acao: 'stripe.webhook_erro', entidade: 'simulado_acessos',
          metadata: { event_id: event.id, event_type: event.type, environment: env, mensagem: 'Falha ao reconciliar pagamento de simulados.' } });
        if (error) console.error('stripe.webhook_erro: logging failed');
      } catch { /* Preserve retry response even when logging is unavailable. */ }
      return new Response('Webhook processing failed', { status: 500 });
    }
  } } },
});
