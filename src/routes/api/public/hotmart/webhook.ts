import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook público da Hotmart.
 *
 * Segurança: verificamos o valor `hottok` (segredo compartilhado) enviado pela
 * Hotmart no header `x-hotmart-hottok` ou no corpo. Configure o mesmo valor no
 * painel da Hotmart e como secret `HOTMART_HOTTOK` no projeto.
 *
 * Idempotência: gravamos o último evento por assinatura (subscriber_code) e
 * ignoramos payloads que não mudam o status quando já processados.
 */
export const Route = createFileRoute("/api/public/hotmart/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const HOTTOK = process.env.HOTMART_HOTTOK;
        const APP_URL = process.env.APP_URL ?? new URL(request.url).origin;

        if (!HOTTOK) {
          return new Response("HOTMART_HOTTOK not configured", { status: 503 });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const hottok =
          request.headers.get("x-hotmart-hottok") ||
          request.headers.get("hottok") ||
          body?.hottok;
        if (!hottok || hottok !== HOTTOK) {
          return new Response("Unauthorized", { status: 401 });
        }

        const event: string = body?.event ?? body?.data?.event ?? "unknown";
        const data = body?.data ?? {};
        const buyer = data?.buyer ?? data?.subscriber ?? {};
        const email: string | null = (buyer?.email ?? data?.customer?.email ?? null)?.toLowerCase() ?? null;
        const nome: string | null = buyer?.name ?? data?.customer?.name ?? null;
        const subscription = data?.subscription ?? {};
        const subscriberCode: string | null =
          subscription?.subscriber?.code ?? subscription?.code ?? data?.purchase?.subscription_code ?? null;
        const transactionId: string | null =
          data?.purchase?.transaction ?? data?.transaction ?? subscription?.transaction ?? null;
        const produto: string | null = data?.product?.name ?? subscription?.plan?.name ?? null;
        const plano: string | null = subscription?.plan?.name ?? null;
        const recurrenceEnd: string | null =
          subscription?.date_next_charge ?? data?.purchase?.date_next_charge ?? null;

        if (!email) {
          return new Response("Missing buyer email", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Localizar ou criar usuário pelo e-mail
        let userId: string | null = null;
        try {
          const { data: existing } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (existing?.id) userId = existing.id;
        } catch {}

        const activatingEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE", "SUBSCRIPTION_RENEWED", "PURCHASE_PROTEST"];
        const deactivatingEvents = ["PURCHASE_CANCELED", "PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "SUBSCRIPTION_CANCELLATION"];
        const delayedEvents = ["PURCHASE_DELAYED", "PURCHASE_BILLET_PRINTED", "PURCHASE_EXPIRED"];

        const isActivating = activatingEvents.includes(event);
        const isDeactivating = deactivatingEvents.includes(event);
        const isDelayed = delayedEvents.includes(event);

        // 2. Criar usuário se necessário (apenas em eventos ativantes)
        if (!userId && isActivating) {
          try {
            const redirectTo = `${APP_URL}/reset-password`;
            const { data: invite, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
              data: { full_name: nome ?? "" },
              redirectTo,
            });
            if (inviteErr && !/already/i.test(inviteErr.message)) {
              console.error("[hotmart] invite error", inviteErr);
            }
            if (invite?.user?.id) {
              userId = invite.user.id;
            } else {
              const { data: listed } = await supabaseAdmin.auth.admin.listUsers();
              const found = listed?.users?.find((u) => u.email?.toLowerCase() === email);
              if (found) userId = found.id;
            }
          } catch (e) {
            console.error("[hotmart] create user error", e);
          }
        }

        if (!userId) {
          // usuário não existe e evento não é ativante — registra log e ignora
          await supabaseAdmin.from("admin_logs").insert({
            acao: "hotmart.evento_sem_usuario",
            entidade: "hotmart",
            metadata: { event, email, subscriberCode },
          });
          return Response.json({ ok: true, note: "user not created (non-activating event)" });
        }

        // 3. Determinar novo status
        let newStatus: "ativa" | "inativa" | "cancelada" | "inadimplente" | null = null;
        let fim: string | null = null;
        let ultimaRenovacao: string | null = null;
        let canceladaEm: string | null = null;

        if (isActivating) {
          newStatus = "ativa";
          if (recurrenceEnd) fim = new Date(recurrenceEnd).toISOString();
          if (event === "SUBSCRIPTION_RENEWED") ultimaRenovacao = new Date().toISOString();
        } else if (isDeactivating) {
          newStatus = event === "PURCHASE_CANCELED" || event === "SUBSCRIPTION_CANCELLATION" ? "cancelada" : "inativa";
          canceladaEm = new Date().toISOString();
        } else if (isDelayed) {
          newStatus = "inadimplente";
        }

        // 4. Upsert da assinatura
        if (newStatus) {
          const updateFields: any = {
            user_id: userId,
            status: newStatus,
            plano: plano ?? undefined,
            produto: produto ?? undefined,
            hotmart_subscriber_code: subscriberCode ?? undefined,
            hotmart_transaction_id: transactionId ?? undefined,
            ultimo_evento: event,
            ultimo_evento_em: new Date().toISOString(),
          };
          if (fim) updateFields.fim = fim;
          if (ultimaRenovacao) updateFields.ultima_renovacao_em = ultimaRenovacao;
          if (canceladaEm) updateFields.cancelada_em = canceladaEm;

          // Try to find existing subscription
          let existingId: string | null = null;
          if (subscriberCode) {
            const { data: ex } = await supabaseAdmin
              .from("assinaturas")
              .select("id")
              .eq("hotmart_subscriber_code", subscriberCode)
              .maybeSingle();
            existingId = ex?.id ?? null;
          }
          if (!existingId) {
            const { data: ex } = await supabaseAdmin
              .from("assinaturas")
              .select("id")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            existingId = ex?.id ?? null;
          }

          if (existingId) {
            await supabaseAdmin.from("assinaturas").update(updateFields).eq("id", existingId);
          } else {
            await supabaseAdmin.from("assinaturas").insert({
              ...updateFields,
              inicio: new Date().toISOString(),
            });
          }
        }

        // 4b. Conversão offline para o Google Ads: primeira compra aprovada de quem chegou por anúncio
        // (gclid guardado no perfil). Nunca pode quebrar o webhook: qualquer erro é só registrado.
        if ((event === "PURCHASE_APPROVED" || event === "PURCHASE_COMPLETE") && transactionId) {
          try {
            // Diagnóstico único: só os NOMES das chaves de purchase e purchase.price (nunca valores).
            const { data: jaRegistrado } = await supabaseAdmin
              .from("admin_logs")
              .select("id")
              .eq("acao", "hotmart.payload_chaves")
              .limit(1)
              .maybeSingle();
            if (!jaRegistrado) {
              await supabaseAdmin.from("admin_logs").insert({
                acao: "hotmart.payload_chaves",
                entidade: "hotmart",
                metadata: {
                  event,
                  purchase: Object.keys(data?.purchase ?? {}),
                  purchase_price: Object.keys(data?.purchase?.price ?? {}),
                },
              });
            }
            const recorrencia = Number(data?.purchase?.recurrency_number ?? data?.purchase?.recurrence_number ?? 1);
            const { data: perfil } = await supabaseAdmin
              .from("profiles")
              .select("gclid, gclid_captured_at")
              .eq("id", userId)
              .maybeSingle();
            if (perfil?.gclid && recorrencia <= 1) {
              const valorBruto = Number(data?.purchase?.price?.value ?? data?.purchase?.full_price?.value);
              const aprovadaEm = Number(data?.purchase?.approved_date);
              const { error: erroConversao } = await (supabaseAdmin as any).from("conversoes_google_ads").upsert(
                {
                  user_id: userId,
                  gclid: perfil.gclid,
                  gclid_capturado_em: perfil.gclid_captured_at,
                  hotmart_transaction_id: transactionId,
                  valor: Number.isFinite(valorBruto) && valorBruto > 0 ? valorBruto : null,
                  convertido_em: Number.isFinite(aprovadaEm) && aprovadaEm > 0 ? new Date(aprovadaEm).toISOString() : new Date().toISOString(),
                },
                { onConflict: "hotmart_transaction_id", ignoreDuplicates: true },
              );
              if (erroConversao) {
                await supabaseAdmin.from("admin_logs").insert({
                  acao: "hotmart.conversao_google_erro",
                  entidade: "hotmart",
                  metadata: { transactionId, mensagem: erroConversao.message },
                });
              }
            }
          } catch (e) {
            console.error("[hotmart] conversao google ads", e);
          }
        }

        // 5. Sincroniza nome no profile (se veio no payload)
        if (nome) {
          await supabaseAdmin.from("profiles").update({ nome_completo: nome }).eq("id", userId);
        }

        // 6. Registra log
        await supabaseAdmin.from("admin_logs").insert({
          acao: "hotmart.webhook",
          entidade: "assinaturas",
          entidade_id: userId,
          metadata: { event, email, subscriberCode, newStatus },
        });

        return Response.json({ ok: true, event, status: newStatus });
      },
    },
  },
});
