import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const alternativaSchema = z.object({
  letra: z.string().trim().min(1).max(2),
  texto: z.string().trim().min(1),
  correta: z.boolean().default(false),
});

const questaoSchema = z.object({
  enunciado: z.string().trim().min(1),
  referencia: z.string().trim().nullish(),
  comentario_professor: z.string().trim().nullish(),
  banca: z.string().trim().nullish(),
  ano: z.number().int().nullish(),
  orgao: z.string().trim().nullish(),
  nivel: z.string().trim().nullish(),
  alternativas: z.array(alternativaSchema).min(2).max(6),
});

const payloadSchema = z.object({
  material_id: z.string().uuid().optional(),
  material_titulo: z.string().trim().min(1).optional(),
  disciplina_nome: z.string().trim().min(1).optional(),
  publicado: z.boolean().default(true),
  questoes: z.array(questaoSchema).min(1).max(200),
});

/**
 * POST /api/public/admin/questoes
 *
 * Insere questões comentadas em um material, com alternativas e gabarito.
 * Autorização: header `Authorization: Bearer <ADMIN_API_TOKEN>`.
 * Idempotente: questões cujo enunciado já exista no material são ignoradas.
 */
export const Route = createFileRoute("/api/public/admin/questoes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verificarTokenAdmin, jsonResponse, registrarAuditoria } = await import(
          "@/lib/admin-api.server"
        );
        const negado = verificarTokenAdmin(request);
        if (negado) return negado;

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse({ error: "JSON inválido." }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse({ error: "Payload inválido.", detalhes: parsed.error.issues }, 400);
        }
        const payload = parsed.data;

        if (!payload.material_id && !payload.material_titulo) {
          return jsonResponse({ error: "Informe material_id ou material_titulo." }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Resolver o material de destino
        let materialId = payload.material_id ?? null;
        let disciplinaId: string | null = null;

        if (!materialId) {
          let query = supabaseAdmin
            .from("materiais")
            .select("id, titulo, disciplina_id, disciplinas(nome)")
            .ilike("titulo", payload.material_titulo!);

          const { data: encontrados, error } = await query;
          if (error) return jsonResponse({ error: error.message }, 500);

          const candidatos = (encontrados ?? []).filter((m: any) =>
            payload.disciplina_nome
              ? (m.disciplinas?.nome ?? "").toLowerCase() === payload.disciplina_nome.toLowerCase()
              : true,
          );

          if (candidatos.length === 0) {
            return jsonResponse({ error: "Material não encontrado. Consulte /api/public/admin/catalogo." }, 404);
          }
          if (candidatos.length > 1) {
            return jsonResponse(
              {
                error: "Mais de um material corresponde ao título. Informe material_id.",
                candidatos: candidatos.map((m: any) => ({ id: m.id, titulo: m.titulo })),
              },
              409,
            );
          }
          materialId = candidatos[0].id;
          disciplinaId = candidatos[0].disciplina_id ?? null;
        } else {
          const { data: material, error } = await supabaseAdmin
            .from("materiais")
            .select("id, disciplina_id")
            .eq("id", materialId)
            .maybeSingle();
          if (error) return jsonResponse({ error: error.message }, 500);
          if (!material) return jsonResponse({ error: "Material não encontrado." }, 404);
          disciplinaId = material.disciplina_id ?? null;
        }

        // 2. Questões já existentes (idempotência + ordem)
        const { data: existentes, error: erroExistentes } = await supabaseAdmin
          .from("questoes")
          .select("enunciado, ordem")
          .eq("material_id", materialId);
        if (erroExistentes) return jsonResponse({ error: erroExistentes.message }, 500);

        const normalizar = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
        const jaExiste = new Set((existentes ?? []).map((q) => normalizar(q.enunciado)));
        let proximaOrdem =
          (existentes ?? []).reduce((max, q) => Math.max(max, q.ordem ?? 0), 0) + 1;

        const inseridas: { id: string; ordem: number }[] = [];
        const ignoradas: string[] = [];
        let totalAlternativas = 0;

        // 3. Inserir questão + alternativas
        for (const questao of payload.questoes) {
          if (jaExiste.has(normalizar(questao.enunciado))) {
            ignoradas.push(questao.enunciado.slice(0, 80));
            continue;
          }

          const { data: criada, error: erroQuestao } = await supabaseAdmin
            .from("questoes")
            .insert({
              enunciado: questao.enunciado,
              material_id: materialId,
              disciplina_id: disciplinaId,
              referencia: questao.referencia ?? null,
              comentario_professor: questao.comentario_professor ?? null,
              banca: questao.banca ?? null,
              ano: questao.ano ?? null,
              orgao: questao.orgao ?? null,
              nivel: questao.nivel ?? null,
              publicado: payload.publicado,
              ordem: proximaOrdem,
            })
            .select("id")
            .single();

          if (erroQuestao || !criada) {
            return jsonResponse(
              {
                error: erroQuestao?.message ?? "Falha ao inserir questão.",
                inseridas: inseridas.length,
              },
              500,
            );
          }

          const alternativas = questao.alternativas.map((alt, i) => ({
            questao_id: criada.id,
            letra: alt.letra.toUpperCase(),
            texto: alt.texto,
            correta: alt.correta,
            ordem: i + 1,
          }));

          const { error: erroAlt } = await supabaseAdmin
            .from("questao_alternativas")
            .insert(alternativas);
          if (erroAlt) {
            await supabaseAdmin.from("questoes").delete().eq("id", criada.id);
            return jsonResponse(
              { error: erroAlt.message, inseridas: inseridas.length },
              500,
            );
          }

          jaExiste.add(normalizar(questao.enunciado));
          inseridas.push({ id: criada.id, ordem: proximaOrdem });
          totalAlternativas += alternativas.length;
          proximaOrdem += 1;
        }

        await registrarAuditoria("importar_questoes", "materiais", materialId, {
          questoes_inseridas: inseridas.length,
          alternativas_inseridas: totalAlternativas,
          questoes_ignoradas: ignoradas.length,
        });

        return jsonResponse({
          ok: true,
          material_id: materialId,
          questoes_inseridas: inseridas.length,
          alternativas_inseridas: totalAlternativas,
          questoes_ignoradas: ignoradas,
          ids: inseridas.map((q) => q.id),
        });
      },
    },
  },
});
