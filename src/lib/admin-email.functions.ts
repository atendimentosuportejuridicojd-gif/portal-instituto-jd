import * as React from "react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Mesmo remetente e domínio já configurados para os e-mails de autenticação (ver routes/lovable/email/auth/webhook.ts).
const SITE_NAME = "Instituto J&D";
const SENDER_DOMAIN = "notify.portal.institutojd.ia.br";
const FROM_DOMAIN = "portal.institutojd.ia.br";
const MAX_DESTINATARIOS = 30;

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "administrador",
  });
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

function chaveApi() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("Envio de e-mail indisponível: chave LOVABLE_API_KEY não configurada no servidor.");
  return k;
}

function primeiroNome(nome?: string | null) {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

export const adminEnviarEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        destinatarios: z
          .array(z.object({ email: z.string().trim().email().max(200), nome: z.string().trim().max(200).optional() }))
          .min(1)
          .max(MAX_DESTINATARIOS),
        assunto: z.string().trim().min(3).max(150),
        // {nome} é trocado pelo primeiro nome de cada destinatário.
        mensagem: z.string().trim().min(3).max(10000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = chaveApi();
    const [{ sendLovableEmail }, { render }, { ContatoEmail }] = await Promise.all([
      import("@lovable.dev/email-js"),
      import("@react-email/render"),
      import("@/lib/email-templates/contato"),
    ]);

    // Respostas vão para o e-mail de contato configurado na plataforma, se houver.
    const { data: cfg } = await context.supabase
      .from("configuracoes_plataforma")
      .select("email_contato")
      .eq("id", true)
      .maybeSingle();
    const replyTo = (cfg as any)?.email_contato || undefined;

    const unicos = new Map<string, { email: string; nome?: string }>();
    data.destinatarios.forEach((d) => unicos.set(d.email.toLowerCase(), d));

    const resultados: { email: string; ok: boolean; erro?: string }[] = [];
    for (const dest of unicos.values()) {
      const corpo = data.mensagem.replace(/\{nome\}/gi, primeiroNome(dest.nome) || "aluno(a)");
      try {
        const element = React.createElement(ContatoEmail, { assunto: data.assunto, mensagem: corpo });
        const html = await render(element);
        const textoPuro = await render(element, { plainText: true });
        await sendLovableEmail(
          {
            to: dest.email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: data.assunto,
            html,
            text: textoPuro,
            purpose: "transactional",
            reply_to: replyTo,
            idempotency_key: `admin-contato-${crypto.randomUUID()}`,
            label: "admin-contato",
          },
          { apiKey },
        );
        resultados.push({ email: dest.email, ok: true });
      } catch (e: any) {
        resultados.push({ email: dest.email, ok: false, erro: e?.message ?? "Falha no envio." });
      }
    }

    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "email.enviar",
      entidade: "email",
      metadata: {
        assunto: data.assunto,
        destinatarios: resultados.map((r) => r.email),
        enviados: resultados.filter((r) => r.ok).length,
        falhas: resultados.filter((r) => !r.ok).length,
      },
    });
    return { resultados };
  });

/** Eventos recentes de entrega (enviado, entregue, devolvido, reclamação) do projeto inteiro. */
export const adminListarEventosEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ destinatario: z.string().trim().max(200).default("") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = chaveApi();
    const { listEmailLogs } = await import("@lovable.dev/email-js");
    const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const r = await listEmailLogs(
      { limit: 100, since: desde, ...(data.destinatario ? { recipient: data.destinatario } : {}) },
      { apiKey },
    );
    return r.data;
  });
