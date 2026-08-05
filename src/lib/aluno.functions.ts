import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DIAS_NOVIDADE = 14;

const favoritoSchema = z.object({
  tipo: z.enum(["material", "trilha", "concurso", "noticia"]),
  item_id: z.string().uuid(),
});

export const toggleFavorito = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => favoritoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favoritos")
      .select("id")
      .eq("user_id", userId)
      .eq("tipo", data.tipo)
      .eq("item_id", data.item_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("favoritos").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { favorito: false };
    }
    const { error } = await supabase
      .from("favoritos")
      .insert({ user_id: userId, tipo: data.tipo, item_id: data.item_id });
    if (error) throw new Error(error.message);
    return { favorito: true };
  });

export const listFavoritos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: favs } = await supabase
      .from("favoritos")
      .select("id, tipo, item_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const lista = favs ?? [];
    const ids = (tipo: string) => lista.filter((f) => f.tipo === tipo).map((f) => f.item_id);

    const [mats, trilhas, concursos, noticias] = await Promise.all([
      ids("material").length
        ? supabase.from("materiais").select("id, titulo").in("id", ids("material"))
        : Promise.resolve({ data: [] as any[] }),
      ids("trilha").length
        ? supabase.from("trilhas").select("id, nome").in("id", ids("trilha"))
        : Promise.resolve({ data: [] as any[] }),
      ids("concurso").length
        ? supabase.from("concursos").select("id, nome").in("id", ids("concurso"))
        : Promise.resolve({ data: [] as any[] }),
      ids("noticia").length
        ? supabase.from("noticias").select("id, titulo").in("id", ids("noticia"))
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nome = (tipo: string, id: string) => {
      if (tipo === "material") return (mats.data ?? []).find((x: any) => x.id === id)?.titulo;
      if (tipo === "trilha") return (trilhas.data ?? []).find((x: any) => x.id === id)?.nome;
      if (tipo === "concurso") return (concursos.data ?? []).find((x: any) => x.id === id)?.nome;
      return (noticias.data ?? []).find((x: any) => x.id === id)?.titulo;
    };

    return lista
      .map((f) => ({ ...f, titulo: nome(f.tipo, f.item_id) ?? null }))
      .filter((f) => f.titulo !== null) as {
      id: string;
      tipo: string;
      item_id: string;
      created_at: string;
      titulo: string;
    }[];
  });

export const getLeituraMaterial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ material_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("material_leitura")
      .select("ultima_pagina, versao_vista, updated_at")
      .eq("user_id", context.userId)
      .eq("material_id", data.material_id)
      .maybeSingle();
    return row ?? null;
  });

export const salvarLeituraMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        material_id: z.string().uuid(),
        ultima_pagina: z.number().int().min(1).max(10000),
        versao_vista: z.number().int().min(1).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let versao = data.versao_vista;
    if (!versao) {
      const { data: m } = await supabase
        .from("materiais")
        .select("versao")
        .eq("id", data.material_id)
        .maybeSingle();
      versao = m?.versao ?? 1;
    }
    const { error } = await supabase.from("material_leitura").upsert(
      {
        user_id: userId,
        material_id: data.material_id,
        ultima_pagina: data.ultima_pagina,
        versao_vista: versao,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,material_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Marca/desmarca manualmente um material como já lido pelo aluno. */
export const toggleMaterialLido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ material_id: z.string().uuid(), lido: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: m } = await supabase
      .from("materiais")
      .select("versao")
      .eq("id", data.material_id)
      .maybeSingle();

    const { data: atual } = await supabase
      .from("material_leitura")
      .select("ultima_pagina, versao_vista")
      .eq("user_id", userId)
      .eq("material_id", data.material_id)
      .maybeSingle();

    const { error } = await supabase.from("material_leitura").upsert(
      {
        user_id: userId,
        material_id: data.material_id,
        ultima_pagina: atual?.ultima_pagina ?? 1,
        versao_vista: data.lido ? (m?.versao ?? 1) : (atual?.versao_vista ?? m?.versao ?? 1),
        concluido: data.lido,
        concluido_em: data.lido ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,material_id" },
    );
    if (error) throw new Error(error.message);
    return { lido: data.lido };
  });

/** Dados agregados do dashboard: continuar de onde parou, novidades e favoritos. */
export const getResumoDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const limite = new Date(Date.now() - DIAS_NOVIDADE * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: materiais }, { data: leituras }, { data: sessoes }] = await Promise.all([
      supabase
        .from("materiais")
        .select("id, titulo, versao, publicado_em, atualizado_em, disciplinas(nome)")
        .eq("publicado", true),
      supabase
        .from("material_leitura")
        .select("material_id, ultima_pagina, versao_vista, concluido, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("questao_sessoes")
        .select("id, material_id, status, percentual, updated_at, concluida_em")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
    ]);

    const mats = materiais ?? [];
    const byId = new Map(mats.map((m: any) => [m.id, m]));

    type Continuar = {
      material_id: string;
      titulo: string;
      disciplina: string;
      detalhe: string;
    } | null;

    const monta = (materialId: string, detalhe: string): Continuar => {
      const m: any = byId.get(materialId);
      if (!m) return null;
      return {
        material_id: m.id,
        titulo: m.titulo,
        disciplina: m.disciplinas?.nome ?? "Sem disciplina",
        detalhe,
      };
    };

    // Continuar questões: sessão em andamento; se não houver, a última sessão registrada
    const sessaoAberta = (sessoes ?? []).find(
      (s: any) => s.status === "em_andamento" && s.material_id,
    );
    const ultimaSessao = (sessoes ?? []).find((s: any) => s.material_id);
    const continuarQuestoes: Continuar = sessaoAberta
      ? monta(sessaoAberta.material_id, "Questionário em andamento")
      : ultimaSessao
        ? monta(ultimaSessao.material_id, "Retomar a prática dirigida")
        : null;

    // Continuar leitura: último PDF aberto e ainda não concluído
    const ultimaLeitura =
      (leituras ?? []).find((l: any) => !l.concluido) ?? (leituras ?? [])[0];
    const continuarLeitura: Continuar = ultimaLeitura
      ? monta(ultimaLeitura.material_id, `Leitura na página ${ultimaLeitura.ultima_pagina}`)
      : null;

    // Materiais atualizados que o aluno já leu mas ainda não viu a nova versão
    const leituraMap = new Map((leituras ?? []).map((l: any) => [l.material_id, l]));
    const atualizados = mats
      .filter((m: any) => {
        const l = leituraMap.get(m.id);
        return !!l && (m.versao ?? 1) > (l.versao_vista ?? 1);
      })
      .map((m: any) => ({
        id: m.id,
        titulo: m.titulo,
        disciplina: m.disciplinas?.nome ?? "Sem disciplina",
        versao: m.versao ?? 1,
        atualizado_em: m.atualizado_em,
      }));

    // Novos materiais publicados recentemente
    const novos = mats
      .filter((m: any) => m.publicado_em && m.publicado_em >= limite && !leituraMap.has(m.id))
      .map((m: any) => ({
        id: m.id,
        titulo: m.titulo,
        disciplina: m.disciplinas?.nome ?? "Sem disciplina",
        publicado_em: m.publicado_em,
      }));

    return { continuarQuestoes, continuarLeitura, atualizados, novos };
  });


/** Resumo da jornada exibido no perfil. */
export const getResumoJornada = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: leituras }, { data: sessoes }] = await Promise.all([
      supabase.from("material_leitura").select("material_id").eq("user_id", userId),
      supabase
        .from("questao_sessoes")
        .select("material_id, percentual, status")
        .eq("user_id", userId)
        .eq("status", "concluida"),
    ]);

    const concluidas = sessoes ?? [];
    const materiaisEstudados = new Set<string>([
      ...(leituras ?? []).map((l: any) => l.material_id),
      ...concluidas.map((s: any) => s.material_id).filter(Boolean),
    ]).size;

    const aproveitamento =
      concluidas.length > 0
        ? Math.round(
            concluidas.reduce((acc: number, s: any) => acc + Number(s.percentual ?? 0), 0) /
              concluidas.length,
          )
        : null;

    return {
      materiais_estudados: materiaisEstudados,
      questionarios_concluidos: concluidas.length,
      aproveitamento_geral: aproveitamento,
    };
  });
