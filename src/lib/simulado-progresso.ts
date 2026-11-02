import { z } from "zod";

export const progressoSimuladoSchema = z.object({
  simulado_id: z.string().uuid(),
  tempo_decorrido_ms: z.number().int().min(0).max(86_400_000),
  questao_atual: z.number().int().min(0).max(10000),
});

export function tempoRestanteSimulado(duracaoMin: number, decorridoMs: number) {
  return Math.max(0, duracaoMin * 60_000 - decorridoMs);
}