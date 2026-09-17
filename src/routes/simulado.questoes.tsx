import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { iniciarSimulado, responderSimulado } from "@/lib/simulado.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Scale } from "lucide-react";

export const Route = createFileRoute("/simulado/questoes")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/simulado/cadastro" });
  },
  head: () => ({
    meta: [
      { title: "Simulado em andamento — Instituto J&D" },
      {
        name: "description",
        content: "Responda as 80 questões do simulado gratuito de Carreira Judiciária.",
      },
      { property: "og:title", content: "Simulado em andamento — Instituto J&D" },
      {
        property: "og:description",
        content: "Simulado gratuito de 80 questões de Tribunal e Ministério Público.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimuladoQuestoes,
});

function SimuladoQuestoes() {
  const navigate = useNavigate();
  const iniciarFn = useServerFn(iniciarSimulado);
  const responderFn = useServerFn(responderSimulado);

  const q = useQuery({
    queryKey: ["simulado-iniciar"],
    queryFn: () => iniciarFn(),
    staleTime: Infinity,
    retry: false,
  });

  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const questoes = q.data?.questoes ?? [];
  const total = q.data?.total ?? 0;

  // Retoma na primeira questão ainda não respondida
  useEffect(() => {
    if (!q.data) return;
    const primeira = q.data.questoes.findIndex((x: any) => !x.respondida);
    setIndice(primeira >= 0 ? primeira : 0);
  }, [q.data]);

  const questao = useMemo(() => questoes[indice], [questoes, indice]);

  const responder = useMutation({
    mutationFn: () =>
      responderFn({
        data: {
          tentativa_id: q.data!.tentativaId,
          questao_id: questao.id,
          alternativa_id: selecionada!,
        },
      }),
    onSuccess: (r: any) => {
      setSelecionada(null);
      if (r.finalizado) return navigate({ to: "/simulado/resultado", replace: true });
      setIndice((i) => Math.min(i + 1, total - 1));
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível registrar sua resposta."),
  });

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (q.isError || !questao) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {(q.error as any)?.message ?? "Não foi possível carregar o simulado."}
          </p>
          <Button className="mt-4" onClick={() => q.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const numero = indice + 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gold text-gold-foreground">
              <Scale className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">
              Questão {numero} de {total}
            </p>
          </div>
          <Progress className="mt-3 h-2" value={(numero / Math.max(total, 1)) * 100} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{questao.materia}</p>
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed">{questao.enunciado}</p>

        <div className="mt-6 space-y-2">
          {questao.alternativas.map((a: any) => {
            const certoErrado = /^(certo|errado)$/i.test(String(a.texto).trim());
            const ativo = selecionada === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelecionada(a.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left text-sm transition ${
                  ativo
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {!certoErrado && <span className="font-semibold">{a.letra})</span>}
                <span>{a.texto}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Responda em uma única sessão — sem feedback durante o simulado.
          </p>
          <Button
            disabled={!selecionada || responder.isPending}
            onClick={() => responder.mutate()}
          >
            {responder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {numero >= total ? "Finalizar simulado" : "Próxima questão"}
          </Button>
        </div>
      </main>
    </div>
  );
}
