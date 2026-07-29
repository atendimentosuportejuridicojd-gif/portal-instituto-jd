import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminGetDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Acesso restrito.");

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const since30iso = since30.toISOString();

    const [
      totAlunos,
      totMateriais,
      totQuestoes,
      totConcursos,
      totTrilhas,
      totNoticias,
      totDisciplinas,
      novosMes,
      assinAtivas,
      assinInativas,
      recentesCadastros,
      recentesSessoes,
    ] = await Promise.all([
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "aluno"),
      supabase.from("materiais").select("*", { count: "exact", head: true }),
      supabase.from("questoes").select("*", { count: "exact", head: true }),
      supabase.from("concursos").select("*", { count: "exact", head: true }),
      supabase.from("trilhas").select("*", { count: "exact", head: true }),
      supabase.from("noticias").select("*", { count: "exact", head: true }),
      supabase.from("disciplinas").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since30iso),
      supabase.from("assinaturas").select("*", { count: "exact", head: true }).eq("status", "ativa"),
      supabase.from("assinaturas").select("*", { count: "exact", head: true }).in("status", ["inativa", "cancelada", "inadimplente"]),
      supabase.from("profiles").select("created_at").gte("created_at", since30iso),
      supabase.from("questao_sessoes").select("concluida_em").eq("status", "concluida").gte("concluida_em", since30iso),
    ]);

    // Build daily buckets over last 30 days
    const days: { date: string; cadastros: number; sessoes: number }[] = [];
    const dayMap = new Map<string, { cadastros: number; sessoes: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      dayMap.set(k, { cadastros: 0, sessoes: 0 });
      days.push({ date: k, cadastros: 0, sessoes: 0 });
    }
    (recentesCadastros.data ?? []).forEach((r: any) => {
      const k = String(r.created_at).slice(0, 10);
      const b = dayMap.get(k);
      if (b) b.cadastros += 1;
    });
    (recentesSessoes.data ?? []).forEach((r: any) => {
      const k = String(r.concluida_em).slice(0, 10);
      const b = dayMap.get(k);
      if (b) b.sessoes += 1;
    });
    days.forEach((d) => {
      const b = dayMap.get(d.date)!;
      d.cadastros = b.cadastros;
      d.sessoes = b.sessoes;
    });

    return {
      totais: {
        alunos: totAlunos.count ?? 0,
        materiais: totMateriais.count ?? 0,
        questoes: totQuestoes.count ?? 0,
        concursos: totConcursos.count ?? 0,
        trilhas: totTrilhas.count ?? 0,
        noticias: totNoticias.count ?? 0,
        disciplinas: totDisciplinas.count ?? 0,
        novos_30d: novosMes.count ?? 0,
        assin_ativas: assinAtivas.count ?? 0,
        assin_inativas: assinInativas.count ?? 0,
      },
      serie: days,
    };
  });
