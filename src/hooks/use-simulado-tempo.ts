import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tempoRestanteSimulado } from "@/lib/simulado-progresso";

export const chaveProgressoSimulado = (id: string) => `simulado-progresso:${id}`;

/** Counts visible, unpaused exam time only; checkpoints survive navigation, reload and abrupt closure. */
export function useSimuladoTempo(id: string, dados: any, atual: number, retomar: (posicao: number) => void, pausado = false) {
  const [restante, setRestante] = useState(() => tempoRestanteSimulado(dados.duracao_min, dados.tempo_decorrido_ms));
  const posicao = useRef(atual);
  posicao.current = atual;
  const pausaRef = useRef(pausado);
  const checkpoint = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const chave = chaveProgressoSimulado(id);
    let decorrido = Number(dados.tempo_decorrido_ms ?? 0);
    try {
      const salvo = JSON.parse(localStorage.getItem(chave) ?? "null");
      if (salvo && Number.isFinite(salvo.tempo_decorrido_ms) && salvo.tempo_decorrido_ms >= decorrido) {
        decorrido = Math.min(dados.duracao_min * 60_000, salvo.tempo_decorrido_ms);
        if (Number.isInteger(salvo.questao_atual) && salvo.questao_atual >= 0 && salvo.questao_atual < dados.questoes.length) {
          posicao.current = salvo.questao_atual;
          retomar(salvo.questao_atual);
        }
      }
    } catch { /* Storage may be unavailable. Server checkpoints remain usable. */ }
    const contando = () => document.visibilityState === "visible" && !pausaRef.current;
    let inicio = contando() ? performance.now() : null;
    const medir = () => {
      const agora = performance.now();
      if (inicio !== null) decorrido += Math.max(0, agora - inicio);
      inicio = contando() ? agora : null;
      decorrido = Math.min(decorrido, dados.duracao_min * 60_000);
      const progresso = { simulado_id: id, tempo_decorrido_ms: Math.floor(decorrido), questao_atual: posicao.current };
      try { localStorage.setItem(chave, JSON.stringify(progresso)); } catch { /* Optional local recovery. */ }
      setRestante(tempoRestanteSimulado(dados.duracao_min, decorrido));
      return progresso;
    };
    let token: string | undefined;
    void supabase.auth.getSession().then(({ data }) => { token = data.session?.access_token; });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => { token = session?.access_token; });
    const salvar = async () => {
      const progresso = medir();
      if (!token) return;
      const response = await fetch("/api/public/simulado-progresso", {
        method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(progresso),
      });
      if (!response.ok) throw new Error("Não foi possível salvar o progresso. Tente novamente antes de sair.");
    };
    checkpoint.current = salvar;
    const salvarSilencioso = () => { void salvar().catch(() => {}); };
    medir();
    const relogio = window.setInterval(medir, 1000);
    const sincronizar = window.setInterval(salvarSilencioso, 5000);
    document.addEventListener("visibilitychange", salvarSilencioso);
    window.addEventListener("pagehide", salvarSilencioso);
    return () => {
      salvarSilencioso();
      inicio = null;
      window.clearInterval(relogio);
      window.clearInterval(sincronizar);
      document.removeEventListener("visibilitychange", salvarSilencioso);
      window.removeEventListener("pagehide", salvarSilencioso);
      subscription.subscription.unsubscribe();
    };
  }, [id, dados, retomar]);

  // Pausing/resuming: close the running interval at the old state, then switch.
  useEffect(() => {
    void checkpoint.current().catch(() => {});
    pausaRef.current = pausado;
    void checkpoint.current().catch(() => {});
  }, [pausado]);

  useEffect(() => { void checkpoint.current().catch(() => {}); }, [atual]);
  return { restante, salvarProgresso: () => checkpoint.current() };
}
