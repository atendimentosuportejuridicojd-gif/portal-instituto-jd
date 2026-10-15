import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "administrador" });
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

const opcaoComPontos = z.object({ valor: z.string().min(1).max(60), label: z.string().min(1).max(160), pontos: z.number().int().min(0).max(2) });
const perguntaPerfil = z.object({ campo: z.string().min(1).max(60), pergunta: z.string().min(1).max(200), opcoes: z.array(opcaoComPontos).min(2).max(6) });
const opcaoSimples = z.object({ valor: z.string().min(1).max(10), label: z.string().min(1).max(200) });
const questaoConhecimento = z.object({ pergunta: z.string().min(1).max(300), opcoes: z.array(opcaoSimples).min(2).max(6), gabarito: z.string().min(1).max(10) });
const mensagemSegmento = z.object({
  titulo: z.string().min(1).max(200),
  subtitulo: z.string().max(300).default(""),
  cta_label: z.string().min(1).max(60),
  cta_acao: z.enum(["teste_gratis", "guia_gratuito", "nenhum"]),
});

export const pistaSchema = z.object({
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen."),
  nome: z.string().trim().min(2).max(120),
  concurso: z.string().trim().max(60).optional(),
  gancho_titulo: z.string().trim().min(2).max(200),
  gancho_subtexto: z.string().trim().min(2).max(300),
  cta_texto: z.string().trim().min(1).max(60).default("Fazer o diagnóstico"),
  perguntas_perfil: z.array(perguntaPerfil).min(1).max(6),
  questao1: questaoConhecimento,
  questao2: questaoConhecimento,
  mensagens: z.object({ quente: mensagemSegmento, morno: mensagemSegmento, frio: mensagemSegmento }),
});

/** Pista pública (sem login): usada pela página de quiz. Nunca inclui o gabarito das questões. */
export const getPistaPublica = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pista, error } = await supabaseAdmin
      .from("pistas_diagnostico")
      .select("slug, nome, gancho_titulo, gancho_subtexto, cta_texto, perguntas_perfil, questao1, questao2, pergunta_fechamento")
      .eq("slug", data.slug)
      .eq("ativo", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pista) throw new Error("Diagnóstico não encontrado ou não está mais disponível.");

    const semGabarito = (q: any) => ({ pergunta: q.pergunta, opcoes: q.opcoes });
    return {
      ...pista,
      questao1: semGabarito(pista.questao1),
      questao2: semGabarito(pista.questao2),
    };
  });

export const adminListPistasDiagnostico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("pistas_diagnostico")
      .select("id, slug, nome, concurso, ativo, criado_em")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCriarPistaDiagnostico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pistaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("pistas_diagnostico").insert({
      slug: data.slug,
      nome: data.nome,
      concurso: data.concurso || null,
      gancho_titulo: data.gancho_titulo,
      gancho_subtexto: data.gancho_subtexto,
      cta_texto: data.cta_texto,
      perguntas_perfil: data.perguntas_perfil,
      questao1: data.questao1,
      questao2: data.questao2,
      mensagens: data.mensagens,
    });
    if (error) throw new Error(error.message.includes("duplicate") ? "Já existe uma pista com esse slug." : error.message);
    return { ok: true };
  });

export const adminExcluirPistaDiagnostico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("pistas_diagnostico").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTogglePistaDiagnostico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("pistas_diagnostico").update({ ativo: data.ativo }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
