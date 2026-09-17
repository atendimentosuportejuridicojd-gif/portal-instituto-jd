import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getResultadoSimulado, ativarAcessoPortal } from "@/lib/simulado.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Scale, CheckCircle2, XCircle } from "lucide-react";
import ebookCapa from "@/assets/ebook-guia-carreira-judiciaria.png";

const EBOOK_URL = "https://institutojd.ia.br";

export const Route = createFileRoute("/simulado/resultado")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/simulado/cadastro" });
  },
  head: () => ({
    meta: [
      { title: "Seu resultado no simulado — Instituto J&D" },
      {
        name: "description",
        content:
          "Veja seu percentual de acerto geral e por área do conhecimento no simulado de Carreira Judiciária.",
      },
      { property: "og:title", content: "Seu resultado no simulado — Instituto J&D" },
      {
        property: "og:description",
        content: "Percentual de acerto geral e por área do conhecimento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimuladoResultado,
});

function SimuladoResultado() {
  const navigate = useNavigate();
  const resFn = useServerFn(getResultadoSimulado);
  const ativarFn = useServerFn(ativarAcessoPortal);

  const q = useQuery({ queryKey: ["simulado-resultado"], queryFn: () => resFn(), retry: false });

  const ativar = useMutation({
    mutationFn: () => ativarFn(),
    onSuccess: () => {
      window.location.replace("/dashboard");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível liberar seu acesso."),
  });

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tentativa = q.data?.tentativa ?? null;

  if (!tentativa) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Você ainda não concluiu o simulado. Termine as questões para ver seu resultado.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/simulado/questoes" })}>
            Continuar o simulado
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gold text-gold-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <p className="text-sm font-bold">Instituto J&D</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Parabéns! Você concluiu o simulado.
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Acertos</p>
            <p className="mt-2 text-3xl font-semibold">
              {tentativa.acertos}
              <span className="text-base text-muted-foreground">/{tentativa.total}</span>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Percentual de acerto
            </p>
            <p className="mt-2 text-3xl font-semibold">{tentativa.percentual}%</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Erros</p>
            <p className="mt-2 text-3xl font-semibold">{tentativa.erros}</p>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Desempenho por área</h2>
          <div className="mt-4 space-y-3">
            {(q.data?.porMateria ?? []).map((m: any) => (
              <div key={m.materia} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">
                    {String(m.materia).replace(/-/g, " ")}
                  </span>
                  <span className="text-muted-foreground">
                    {m.acertos}/{m.total} · {m.percentual}%
                  </span>
                </div>
                <Progress className="mt-3 h-2" value={m.percentual} />
              </div>
            ))}
          </div>
        </section>

        {/* Oferta pós-simulado */}
        <section className="mt-14 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-8">
            <p className="text-lg text-foreground">
              Explore seu Portal. Você tem 5 dias para aproveitar.
            </p>
            <Button
              size="lg"
              className="mt-8"
              disabled={ativar.isPending}
              onClick={() => ativar.mutate()}
            >
              {ativar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Acesse o seu Portal
            </Button>
          </div>

          <aside className="rounded-xl border border-border bg-card p-6">
            <img
              src={ebookCapa}
              alt="Capa do e-book Guia da Carreira Judiciária"
              className="mx-auto h-32 w-auto"
              loading="lazy"
            />
            <p className="mt-4 text-sm font-semibold">Quer se preparar melhor?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Guia da Carreira Judiciária — material introdutório gratuito.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <a href={EBOOK_URL} target="_blank" rel="noreferrer">
                Baixar guia gratuito
              </a>
            </Button>
          </aside>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Revisão das questões</h2>
          <div className="mt-4 space-y-4">
            {(q.data?.questoes ?? []).map((qq: any, i: number) => (
              <div key={qq.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {String(qq.materia).replace(/-/g, " ")} · Questão {i + 1}
                  </p>
                  {qq.acertou ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Acertou
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Errou
                    </span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{qq.enunciado}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Sua resposta: </span>
                    {qq.escolhida ? `${qq.escolhida.letra}) ${qq.escolhida.texto}` : "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Gabarito: </span>
                    {qq.correta ? `${qq.correta.letra}) ${qq.correta.texto}` : "—"}
                  </p>
                </div>
                {qq.comentario && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 shadow-sm">
                    <p className="font-bold text-black">Comentário do professor</p>
                    <p
                      className="mt-1 text-xl italic text-red-900"
                      style={{ fontFamily: '"Times New Roman", Times, serif' }}
                    >
                      {qq.comentario}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
