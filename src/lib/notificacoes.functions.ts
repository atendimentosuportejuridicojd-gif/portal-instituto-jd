import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMinhasNotificacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: notifs } = await supabase
      .from("notificacoes")
      .select("id, titulo, mensagem, tipo, link, publicada_em, escopo, target_user_id")
      .or(`escopo.eq.todos,target_user_id.eq.${userId}`)
      .order("publicada_em", { ascending: false })
      .limit(50);
    const ids = (notifs ?? []).map((n) => n.id);
    const { data: leituras } = ids.length
      ? await supabase
          .from("notificacoes_leituras")
          .select("notificacao_id")
          .eq("user_id", userId)
          .in("notificacao_id", ids)
      : { data: [] as any[] };
    const readSet = new Set((leituras ?? []).map((l: any) => l.notificacao_id));
    return (notifs ?? []).map((n) => ({ ...n, lida: readSet.has(n.id) }));
  });

export const marcarNotificacaoLida = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("notificacoes_leituras")
      .upsert({ notificacao_id: data.id, user_id: context.userId, lida_em: new Date().toISOString() });
    return { ok: true };
  });

export const marcarTodasNotificacoesLidas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: notifs } = await supabase
      .from("notificacoes")
      .select("id")
      .or(`escopo.eq.todos,target_user_id.eq.${userId}`);
    if (notifs && notifs.length) {
      await supabase.from("notificacoes_leituras").upsert(
        notifs.map((n: any) => ({ notificacao_id: n.id, user_id: userId, lida_em: new Date().toISOString() })),
      );
    }
    return { ok: true };
  });

const publicarSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  mensagem: z.string().trim().max(2000).default(""),
  tipo: z.enum(["material", "noticia", "cronograma", "concurso", "sistema"]).default("sistema"),
  link: z.string().trim().max(500).optional().nullable(),
  escopo: z.enum(["todos", "user"]).default("todos"),
  target_user_id: z.string().uuid().nullable().optional(),
});

export const adminPublicarNotificacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => publicarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");

    // Notificações gerais também viram post no "Fique por Dentro",
    // para que o aluno leia a mensagem na íntegra.
    let link = data.link ?? null;
    if (data.escopo === "todos") {
      const { data: noticia } = await context.supabase
        .from("noticias")
        .insert({
          titulo: data.titulo,
          resumo: null,
          conteudo: data.mensagem || null,
          publicado: true,
          published_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      if (!link && noticia?.id) link = `/noticias?n=${noticia.id}`;
    }

    const { error } = await context.supabase.from("notificacoes").insert({
      titulo: data.titulo,
      mensagem: data.mensagem,
      tipo: data.tipo,
      link,
      escopo: data.escopo,
      target_user_id: data.escopo === "user" ? data.target_user_id ?? null : null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_logs").insert({
      user_id: context.userId,
      acao: "notificacao.publicar",
      entidade: "notificacoes",
      metadata: { titulo: data.titulo, escopo: data.escopo },
    });
    return { ok: true };
  });

export const adminListNotificacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");
    const { data } = await context.supabase
      .from("notificacoes")
      .select("id, titulo, mensagem, tipo, escopo, target_user_id, publicada_em")
      .order("publicada_em", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const adminExcluirNotificacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Acesso restrito.");
    const { error } = await context.supabase.from("notificacoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
