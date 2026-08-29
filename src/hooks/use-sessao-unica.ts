import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { registrarSessao, verificarSessao } from "@/lib/sessao-unica.functions";

const STORAGE_KEY = "jd_device_id";
const INTERVALO_MS = 25_000;

function getDeviceId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/**
 * Garante uma única sessão ativa por aluno: ao entrar em outro navegador/janela,
 * o acesso mais recente prevalece e a sessão anterior é encerrada.
 */
export function useSessaoUnica(enabled: boolean) {
  const registrar = useServerFn(registrarSessao);
  const verificar = useServerFn(verificarSessao);
  const encerrando = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const deviceId = getDeviceId();
    let cancelado = false;

    async function encerrar() {
      if (encerrando.current) return;
      encerrando.current = true;
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      window.location.replace("/auth?sessao=encerrada");
    }

    async function checar() {
      if (cancelado || document.visibilityState === "hidden") return;
      try {
        const res: any = await verificar({ data: { device_id: deviceId } });
        if (!cancelado && res && res.valida === false) await encerrar();
      } catch {
        /* falha de rede: não desloga */
      }
    }

    (async () => {
      try {
        await registrar({ data: { device_id: deviceId, user_agent: navigator.userAgent.slice(0, 400) } });
      } catch {
        /* ignore */
      }
    })();

    const timer = window.setInterval(checar, INTERVALO_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") checar();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelado = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, registrar, verificar]);
}
