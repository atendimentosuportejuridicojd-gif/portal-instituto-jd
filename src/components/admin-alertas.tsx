import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { UserPlus, BadgeCheck, Sparkles, Gavel, X } from "lucide-react";
import { adminNovosCadastros } from "@/lib/admin-alertas.functions";
import { adminRecursosPendentes } from "@/lib/recursos.functions";
import { Button } from "@/components/ui/button";

type Alerta = {
  id: string;
  tipo: "teste" | "cadastro" | "assinatura" | "recurso";
  nome: string;
  email: string;
  plano?: string | null;
  created_at: string;
};

const META = {
  teste: { label: "Novo cadastro de teste", Icon: Sparkles },
  cadastro: { label: "Novo cadastro de aluno", Icon: UserPlus },
  assinatura: { label: "Nova assinatura", Icon: BadgeCheck },
  recurso: { label: "Novo recurso de questão", Icon: Gavel },
} as const;

/** Avisos sobrepostos no canto inferior direito da área administrativa. */
export function AdminAlertas() {
  const fetchNovos = useServerFn(adminNovosCadastros);
  const fetchPendentes = useServerFn(adminRecursosPendentes);
  const pendentesRef = useRef<number | null>(null);
  const desde = useRef(new Date().toISOString());
  const vistos = useRef(new Set<string>());
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    let cancelado = false;

    const checar = async () => {
      try {
        const r = await fetchNovos({ data: { desde: desde.current } });
        if (cancelado) return;
        desde.current = r.agora;
        const novos = [...r.cadastros, ...r.assinaturas].filter((a) => !vistos.current.has(a.id));
        novos.forEach((a) => vistos.current.add(a.id));
        if (novos.length) setAlertas((prev) => [...novos as Alerta[], ...prev].slice(0, 4));

        const { pendentes } = await fetchPendentes();
        if (cancelado) return;
        const anterior = pendentesRef.current;
        pendentesRef.current = pendentes;
        if (anterior !== null && pendentes > anterior) {
          const alerta: Alerta = {
            id: `recurso:${Date.now()}`,
            tipo: "recurso",
            nome: `${pendentes} recurso(s) aguardando análise`,
            email: "",
            created_at: new Date().toISOString(),
          };
          setAlertas((prev) => [alerta, ...prev].slice(0, 4));
        }
      } catch {
        /* silencioso */
      }
    };

    const t = setInterval(checar, 30_000);
    checar();
    return () => {
      cancelado = true;
      clearInterval(t);
    };
  }, [fetchNovos, fetchPendentes]);

  const fechar = (id: string) => setAlertas((prev) => prev.filter((a) => a.id !== id));

  if (!alertas.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {alertas.map((a) => {
        const { label, Icon } = META[a.tipo];
        return (
          <div
            key={a.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg"
          >
            <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{a.nome}</p>
              {a.email && <p className="truncate text-xs text-muted-foreground">{a.email}</p>}
              {a.plano && <p className="mt-0.5 text-xs text-muted-foreground">Plano: {a.plano}</p>}
              <Button asChild size="sm" variant="link" className="h-auto p-0 text-xs">
                <Link
                  to={a.tipo === "recurso" ? "/admin/recursos" : "/admin/usuarios"}
                  onClick={() => fechar(a.id)}
                >
                  {a.tipo === "recurso" ? "Ver recursos" : "Ver usuários"}
                </Link>
              </Button>
            </div>
            <button
              type="button"
              onClick={() => fechar(a.id)}
              aria-label="Fechar aviso"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
