import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Scale, CheckCircle2, Clock, ListChecks, Gift, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/simulado/")({
  head: () => ({
    meta: [
      { title: "Simulado gratuito de Carreira Judiciária — Instituto J&D" },
      {
        name: "description",
        content:
          "Simulado gratuito de 80 questões de Tribunais e Ministério Público. Descubra hoje seu percentual de acerto por área do conhecimento.",
      },
      { property: "og:title", content: "Simulado gratuito de Carreira Judiciária" },
      {
        property: "og:description",
        content:
          "80 questões de Tribunal e Ministério Público. Receba seu percentual de acerto por área.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimuladoLanding,
});

function SimuladoLanding() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gold text-gold-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold">Instituto J&D</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Especialistas na Carreira Judiciária
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Quantas questões você acertaria HOJE em uma prova de Tribunal ou Ministério Público?
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Faça um simulado de desempenho para Carreira Judiciária
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ListChecks, t: "80 questões", d: "Tribunais e Ministério Público" },
            { icon: Clock, t: "Cerca de 2 horas", d: "Respondido em uma única sessão" },
            { icon: Gift, t: "100% gratuito", d: "Sem cartão de crédito" },
          ].map((b) => (
            <div key={b.t} className="rounded-lg border border-border bg-card p-5">
              <b.icon className="h-5 w-5 text-gold" />
              <p className="mt-3 font-semibold">{b.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Button asChild size="lg">
            <Link to="/simulado/cadastro">Fazer o simulado grátis</Link>
          </Button>
        </div>

        <section className="mt-20 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Como funciona</h2>
          <ul className="mt-6 space-y-4 text-base">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-gold" />
              Você vai responder 80 questões de Tribunal e Ministério Público.
            </li>
            <li className="flex items-start gap-3">
              <BarChart3 className="mt-1 h-5 w-5 shrink-0 text-gold" />
              No final, você recebe seu percentual de acerto e por área do conhecimento.
            </li>
          </ul>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/simulado/cadastro">Começar agora</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Instituto J&D — Especialistas na Carreira Judiciária
      </footer>
    </div>
  );
}
