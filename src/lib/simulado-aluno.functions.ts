import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ simulado_id: z.string().uuid() });

/** Lista os simulados do cronograma ativo (datas, andamento e resultados) e se o acesso está liberado. */
export const alunoPainelSimulados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { painelSimulados } = await import("@/lib/simulado-aluno.server");
    return painelSimulados(context);
  });

export const alunoIniciarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bloco_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { iniciarSimulado } = await import("@/lib/simulado-aluno.server");
    return iniciarSimulado(context, data.bloco_id);
  });

/** Prova em andamento (sem gabarito nem comentário) ou o resultado, se já foi finalizada. */
export const alunoLerSimulado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { lerSimulado } = await import("@/lib/simulado-aluno.server");
    return lerSimulado(context, data.simulado_id);
  });

export const alunoResponderSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    idSchema.extend({ questao_id: z.string().uuid(), alternativa_id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { responderSimulado } = await import("@/lib/simulado-aluno.server");
    return responderSimulado(context, data);
  });

export const alunoFinalizarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { finalizarSimulado } = await import("@/lib/simulado-aluno.server");
    return finalizarSimulado(context, data.simulado_id);
  });

/** Inclui os simulados no cronograma ativo (ou guarda a duração e avisa que falta o pagamento). */
export const alunoAtivarSimulados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ duracao_prova_min: z.number().int().min(10).max(1440).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { ativarSimulados } = await import("@/lib/simulado-aluno.server");
    return ativarSimulados(context, data.duracao_prova_min);
  });
