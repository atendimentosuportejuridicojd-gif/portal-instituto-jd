import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Scale, Landmark, Shield, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CARREIRAS, type CarreiraId } from "@/lib/carreiras";
import { definirCarreira, getMinhaAssinatura } from "@/lib/assinaturas.functions";

export const Route = createFileRoute("/_authenticated/escolher-carreira")({
  head: () => ({
    meta: [
      { title: "Escolha sua carreira — Instituto J&D Sua Carreira 360" },
      { name: "description", content: "Escolha a carreira que você vai estudar no Portal do Aluno do Instituto J&D." },
      { property: "og:title", content: "Escolha sua carreira — Instituto J&D" },
      { property: "og:description", content: "Carreira Judiciária, Fiscal ou Policial: um portal sob medida para você." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EscolherCarreira,
});

const ICONES: Record<CarreiraId, typeof Scale> = { judiciaria: Scale, fiscal: Landmark, policial: Shield };

function EscolherCarreira() {
  const [sel, setSel] = useState<CarreiraId | null>(null);
  const assFn = useServerFn(getMinhaAssinatura);
  const q = useQuery({ queryKey: ["minha-assinatura"], queryFn: () => assFn(), staleTime: 60_000 });
  const fn = useServerFn(definirCarreira);
  const mut = useMutation({
    mutationFn: () => fn({ data: { carreira: sel! } }),
    onSuccess: () => window.location.replace("/dashboard"),
    onError: (e: any) => toast.error(e.message),
  });

  const jaEscolhida = !!q.data?.carreira && !q.data?.isAdmin;
  if (jaEscolhida && typeof window !== "undefined") window.location.replace("/dashboard");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Sua Carreira 360</p>
        <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Qual carreira você vai conquistar?</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Escolha uma única vez. Seu portal será montado com as disciplinas, matérias, questões e concursos da sua carreira.
          {q.data?.isAdmin && " (Administrador: você pode trocar sempre que quiser para conferir cada portal.)"}
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {CARREIRAS.map((c) => {
          const Icone = ICONES[c.id];
          const ativo = sel === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSel(c.id)}
              aria-pressed={ativo}
              className={`relative rounded-xl border-2 bg-card p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                ativo ? "border-accent ring-2 ring-accent/30" : "border-border"
              }`}
            >
              {ativo && (
                <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Icone className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-foreground">{c.nome}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.descricao}</p>
              {q.data?.carreira === c.id && <p className="mt-3 text-xs font-semibold text-accent">Carreira atual</p>}
            </button>
          );
        })}
      </div>
      <div className="mt-10 text-center">
        <Button size="lg" disabled={!sel || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? "Salvando..." : "Confirmar minha carreira"}
        </Button>
        {!q.data?.isAdmin && (
          <p className="mt-3 text-xs text-muted-foreground">Atenção: depois de confirmada, a escolha não pode ser alterada.</p>
        )}
      </div>
    </div>
  );
}
