import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const parametrosSchema = z.object({
  concurso_id: z.string().uuid(),
  data_inicio: dataIso,
  data_prova: dataIso,
  /** Minutos por dia da semana: posição 0 = domingo ... 6 = sábado. */
  minutos_por_dia: z.array(z.number().int().min(0).max(1440)).length(7),
  minutos_por_questao: z.number().int().min(1).max(60).default(3),
  ordem_disciplinas: z.array(z.string().uuid()).max(60).optional(),
  usa_simulado: z.boolean().default(false),
  duracao_prova_min: z.number().int().min(10).max(1440).nullable().optional(),
});

/** Concursos disponíveis para o assistente e se o aluno já tem os simulados liberados. */
export const alunoDadosAssistente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { dadosAssistente } = await import("@/lib/cronograma-aluno.server");
    return dadosAssistente(context);
  });

/** Calcula o plano sem gravar, para o aluno conferir (passo 4 do assistente). */
export const alunoPreviaCronograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parametrosSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { previaCronograma } = await import("@/lib/cronograma-aluno.server");
    return previaCronograma(context, data);
  });

export const alunoCriarCronograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parametrosSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { criarCronograma } = await import("@/lib/cronograma-aluno.server");
    return criarCronograma(context, data);
  });

/** Chamada ao voltar do pagamento: ativa o rascunho se o acesso aos simulados já foi liberado. */
export const alunoFinalizarRascunho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { finalizarRascunho } = await import("@/lib/cronograma-aluno.server");
    return finalizarRascunho(context);
  });

export const alunoCronogramaAtual = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { cronogramaAtual } = await import("@/lib/cronograma-aluno.server");
    return cronogramaAtual(context);
  });

export const alunoMarcarBloco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), concluido: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { marcarBloco } = await import("@/lib/cronograma-aluno.server");
    return marcarBloco(context, data.id, data.concluido);
  });

export const alunoRecalcularCronograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { recalcularCronograma } = await import("@/lib/cronograma-aluno.server");
    return recalcularCronograma(context);
  });

export const alunoArquivarCronograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { arquivarCronograma } = await import("@/lib/cronograma-aluno.server");
    return arquivarCronograma(context);
  });

/** Matérias a revisar em um bloco de revisão (abaixo da meta de desempenho). */
export const alunoRevisaoBloco = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bloco_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { revisaoDoBloco } = await import("@/lib/cronograma-aluno.server");
    return revisaoDoBloco(context, data.bloco_id);
  });

/** Exclui de vez o cronograma ativo ou o rascunho (apaga também o andamento e os simulados dele). */
export const alunoExcluirCronograma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.enum(["ativo", "rascunho"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { excluirCronograma } = await import("@/lib/cronograma-aluno.server");
    return excluirCronograma(context, data.status);
  });
