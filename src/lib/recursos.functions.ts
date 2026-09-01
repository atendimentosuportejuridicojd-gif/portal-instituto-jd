import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Aluno abre um recurso sobre uma questão. */
export const criarRecurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        questao_id: z.string().uuid(),
        material_id: z.string().uuid().optional(),
        tipo: z.enum(["multiplas_respostas", "alteracao_gabarito", "anular_questao"]),
        fundamentacao: z.string().trim().min(20).max(3000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: jaExiste } = await supabase
      .from("questao_recursos")
      .select("id")
      .eq("user_id", userId)
      .eq("questao_id", data.questao_id)
      .eq("status", "pendente")
      .maybeSingle();
    if (jaExiste) throw new Error("Você já tem um recurso em análise para esta questão.");

    const { error } = await supabase.from("questao_recursos").insert({
      user_id: userId,
      questao_id: data.questao_id,
      material_id: data.material_id ?? null,
      tipo: data.tipo,
      fundamentacao: data.fundamentacao,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Recursos do próprio aluno. */
export const listMeusRecursos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("questao_recursos")
      .select("id, tipo, status, fundamentacao, resposta_admin, created_at, questoes(enunciado)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

async function garantirAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrador",
  });
  if (!isAdmin) throw new Error("Acesso restrito.");
}

/** Lista para o administrador avaliar. */
export const adminListRecursos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["pendente", "deferido", "indeferido", "todos"]).default("pendente") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await garantirAdmin(context);
    let q = context.supabase
      .from("questao_recursos")
      .select(
        "id, tipo, status, fundamentacao, resposta_admin, acao_aplicada, alunos_afetados, created_at, analisado_em, user_id, questao_id, material_id, questoes(enunciado, referencia, anulada, questao_alternativas(id, letra, texto, correta, ordem)), materiais(titulo)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "todos") q = q.eq("status", data.status);
    const { data: recursos, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((recursos ?? []).map((r: any) => r.user_id))];
    const { data: perfis } = ids.length
      ? await context.supabase.from("profiles").select("id, nome_completo, email").in("id", ids)
      : { data: [] as any[] };
    const mapa = new Map((perfis ?? []).map((p: any) => [p.id, p]));

    return (recursos ?? []).map((r: any) => ({
      ...r,
      aluno: mapa.get(r.user_id)?.nome_completo ?? "",
      aluno_email: mapa.get(r.user_id)?.email ?? "",
    }));
  });

/** Administrador responde (defere ou indefere) o recurso.
 *  Ao deferir com ação, a questão é corrigida e o desempenho de TODOS os alunos
 *  que já responderam (e dos futuros) é recalculado automaticamente. */
export const adminResponderRecurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["deferido", "indeferido"]),
        resposta_admin: z.string().trim().max(3000).optional(),
        acao: z.enum(["anular", "alterar_gabarito", "multiplas_respostas", "nenhuma"]).default("nenhuma"),
        alternativas: z.array(z.string().uuid()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await garantirAdmin(context);

    const { data: recurso, error: eRec } = await context.supabase
      .from("questao_recursos")
      .select("id, user_id, questao_id, tipo")
      .eq("id", data.id)
      .single();
    if (eRec || !recurso) throw new Error("Recurso não encontrado.");

    let afetados: number | null = null;

    if (data.status === "deferido" && data.acao !== "nenhuma") {
      const { data: qtd, error: eRpc } = await context.supabase.rpc("aplicar_recurso_questao", {
        _questao_id: recurso.questao_id,
        _acao: data.acao,
        _alternativas: data.acao === "anular" ? undefined : (data.alternativas ?? []),
      });
      if (eRpc) throw new Error(eRpc.message);
      afetados = (qtd as number) ?? 0;
    }

    const { error } = await context.supabase
      .from("questao_recursos")
      .update({
        status: data.status,
        resposta_admin: data.resposta_admin ?? null,
        acao_aplicada: data.status === "deferido" ? data.acao : null,
        alunos_afetados: afetados,
        analisado_em: new Date().toISOString(),
        analisado_por: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Avisa o aluno que abriu o recurso
    await context.supabase.from("notificacoes").insert({
      titulo: data.status === "deferido" ? "Recurso deferido" : "Recurso indeferido",
      mensagem:
        (data.resposta_admin?.trim() ||
          (data.status === "deferido"
            ? "Seu recurso foi acolhido e a questão foi atualizada."
            : "Seu recurso foi analisado e não foi acolhido.")) +
        (afetados !== null ? ` O desempenho foi recalculado para ${afetados} aluno(s).` : ""),
      tipo: "info",
      escopo: "usuario",
      target_user_id: recurso.user_id,
      created_by: context.userId,
    });

    return { ok: true, alunos_afetados: afetados };
  });

/** Quantidade de recursos pendentes (usado nos avisos do admin). */
export const adminRecursosPendentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirAdmin(context);
    const { count } = await context.supabase
      .from("questao_recursos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    return { pendentes: count ?? 0 };
  });
