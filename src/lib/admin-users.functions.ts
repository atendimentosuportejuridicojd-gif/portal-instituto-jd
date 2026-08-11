import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "administrador",
  });
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

export const adminListUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().max(200).default("") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    let query = supabase
      .from("profiles")
      .select("id, nome_completo, email, created_at, ultimo_acesso_em, bloqueado, bloqueado_motivo")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.q) {
      const q = data.q.replace(/[%_]/g, "");
      query = query.or(`nome_completo.ilike.%${q}%,email.ilike.%${q}%`);
    }
    const { data: profiles, error } = await query;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p: any) => p.id);
    if (ids.length === 0) return [];

    const [{ data: assins }, { data: sessoes }, { data: tent }, { data: roles }] = await Promise.all([
      supabase
        .from("assinaturas")
        .select("user_id, status, plano, fim, ultima_renovacao_em")
        .in("user_id", ids),
      supabase.from("questao_sessoes").select("user_id, status").in("user_id", ids),
      supabase.from("questao_tentativas").select("user_id").in("user_id", ids),
      supabase.from("user_roles").select("user_id, role, expira_em").in("user_id", ids),
    ]);

    const assinMap = new Map<string, any>();
    (assins ?? []).forEach((a: any) => {
      const prev = assinMap.get(a.user_id);
      if (!prev || (a.ultima_renovacao_em ?? "") > (prev.ultima_renovacao_em ?? "")) {
        assinMap.set(a.user_id, a);
      }
    });
    const sessCount = new Map<string, number>();
    (sessoes ?? []).forEach((s: any) => {
      if (s.status === "concluida") sessCount.set(s.user_id, (sessCount.get(s.user_id) ?? 0) + 1);
    });
    const tentCount = new Map<string, number>();
    (tent ?? []).forEach((t: any) => tentCount.set(t.user_id, (tentCount.get(t.user_id) ?? 0) + 1));
    const roleMap = new Map<string, string[]>();
    const testeFim = new Map<string, string | null>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
      if (r.role === "aluno_teste") testeFim.set(r.user_id, r.expira_em ?? null);
    });

    return (profiles ?? []).map((p: any) => ({
      ...p,
      assinatura_status: assinMap.get(p.id)?.status ?? "sem_assinatura",
      assinatura_plano: assinMap.get(p.id)?.plano ?? null,
      assinatura_fim: assinMap.get(p.id)?.fim ?? null,
      questionarios_concluidos: sessCount.get(p.id) ?? 0,
      questoes_respondidas: tentCount.get(p.id) ?? 0,
      roles: roleMap.get(p.id) ?? ["aluno"],
      teste_expira_em: testeFim.get(p.id) ?? null,
      teste_expirado:
        roleMap.get(p.id)?.includes("aluno_teste") === true &&
        !!testeFim.get(p.id) &&
        new Date(testeFim.get(p.id)!).getTime() <= Date.now(),
    }));
  });


const editSchema = z.object({
  id: z.string().uuid(),
  nome_completo: z.string().trim().min(1).max(200).optional(),
});

export const adminEditarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("profiles")
      .update({ nome_completo: data.nome_completo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "usuario.editar",
      entidade: "profiles",
      entidade_id: data.id,
      metadata: { nome_completo: data.nome_completo },
    });
    return { ok: true };
  });

export const adminBloquearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), bloqueado: z.boolean(), motivo: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("profiles")
      .update({
        bloqueado: data.bloqueado,
        bloqueado_motivo: data.bloqueado ? data.motivo ?? "Bloqueado manualmente pelo administrador." : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: data.bloqueado ? "usuario.bloquear" : "usuario.desbloquear",
      entidade: "profiles",
      entidade_id: data.id,
      metadata: { motivo: data.motivo },
    });
    return { ok: true };
  });

export const adminResetSenhaUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email(), redirect_to: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const SUPABASE_URL = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
    const API_KEY =
      process.env['SUPABASE_PUBLISHABLE_KEY'] ??
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
      process.env['SUPABASE_ANON_KEY'] ??
      process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!SUPABASE_URL || !API_KEY) throw new Error("Configuração de e-mail indisponível no servidor.");

    // GoTrue /recover envia efetivamente o e-mail de redefinição.
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(data.redirect_to)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ email: data.email }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) {
        throw new Error("Limite de envio de e-mails atingido. Tente novamente em alguns minutos.");
      }
      throw new Error(`Falha ao enviar o e-mail de redefinição (${res.status}). ${body.slice(0, 200)}`);
    }

    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "usuario.reset_senha",
      entidade: "auth.users",
      metadata: { email: data.email },
    });
    return { ok: true };
  });

const ROLES = ["administrador", "aluno", "aluno_teste"] as const;

export const adminDefinirRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        roles: z.array(z.enum(ROLES)).min(1).max(3),
        // Dias de teste; ao (re)ativar "aluno teste" o acesso expira nesse prazo.
        dias_teste: z.number().int().min(1).max(365).default(5),
        reiniciar_teste: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const { data: atuais, error: eSel } = await supabase
      .from("user_roles")
      .select("role, expira_em")
      .eq("user_id", data.id);
    if (eSel) throw new Error(eSel.message);

    const current = new Set((atuais ?? []).map((r: any) => r.role as string));
    const desired = new Set<string>(data.roles);

    const toAdd = [...desired].filter((r) => !current.has(r));
    const toRemove = [...current].filter((r) => !desired.has(r));

    const expiraTeste = new Date(Date.now() + data.dias_teste * 24 * 60 * 60 * 1000).toISOString();

    if (toAdd.length > 0) {
      const { error } = await supabase.from("user_roles").insert(
        toAdd.map((role) => ({
          user_id: data.id,
          role: role as any,
          expira_em: role === "aluno_teste" ? expiraTeste : null,
        })),
      );
      if (error) throw new Error(error.message);
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.id)
        .in("role", toRemove as any);
      if (error) throw new Error(error.message);
    }

    // Renovar o prazo de um aluno teste já existente
    if (data.reiniciar_teste && desired.has("aluno_teste") && current.has("aluno_teste")) {
      const { error } = await supabase
        .from("user_roles")
        .update({ expira_em: expiraTeste })
        .eq("user_id", data.id)
        .eq("role", "aluno_teste" as any);
      if (error) throw new Error(error.message);
    }

    await supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "usuario.definir_roles",
      entidade: "user_roles",
      entidade_id: data.id,
      metadata: { roles: data.roles, dias_teste: data.dias_teste },
    });

    return { ok: true };
  });

