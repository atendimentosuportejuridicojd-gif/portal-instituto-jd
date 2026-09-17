import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/simulado/")({
  head: () => ({
    meta: [
      {
        title: "Simulado Grátis de Carreira Judiciária | Instituto J&D",
      },
      {
        name: "description",
        content:
          "Faça um simulado de desempenho para Carreira Judiciária: 80 questões de Tribunal e Ministério Público, com percentual de acerto por área. 100% gratuito.",
      },
      { property: "og:title", content: "Simulado Grátis de Carreira Judiciária | Instituto J&D" },
      {
        property: "og:description",
        content:
          "80 questões de Tribunal e Ministério Público. Receba seu percentual de acerto no final. 100% gratuito.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SimuladoLanding,
});

function SimuladoLanding() {
  return (
    <div className="jd-landing relative min-h-screen w-full overflow-hidden font-sans">
      <div className="jd-landing-orb ld-orb-1 size-72 -left-16 -top-10 bg-[oklch(0.28_0.07_260/25%)]" aria-hidden="true" />
      <div className="jd-landing-orb ld-orb-2 right-[-4rem] top-24 size-80 bg-[oklch(0.72_0.13_82/35%)]" aria-hidden="true" />
      <div className="jd-landing-orb ld-orb-3 bottom-10 left-1/3 size-64 bg-[oklch(0.28_0.07_260/18%)]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-10 sm:py-16">
        {/* Seção 1 — Headline */}
        <section className="ld-rise jd-landing-glass rounded-[2rem] px-6 py-10 text-center sm:px-12 sm:py-16" style={{ animationDelay: "0.05s" }}>
          <div className="jd-landing-glass-soft inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[oklch(0.28_0.07_260)]">
            <span className="size-1.5 rounded-full bg-[oklch(0.72_0.13_82)]" aria-hidden="true" />
            Instituto J&amp;D
          </div>

          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.22em] text-[oklch(0.28_0.07_260/80%)]">
            Faça um simulado de desempenho para Carreira Judiciária
          </p>

          <h1 className="mt-4 text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Quantas questões você acertaria{" "}
            <span className="text-[oklch(0.28_0.07_260)]">HOJE</span> em uma prova de Tribunal
            ou Ministério Público?
          </h1>

          <Link
            to="/simulado/cadastro"
            className="jd-landing-cta mt-8 inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-bold transition-transform duration-200 hover:-translate-y-0.5 sm:text-lg"
          >
            Fazer o simulado grátis
            <span aria-hidden="true">→</span>
          </Link>

          {/* Seção 2 — Credibilidade */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="ld-rise jd-landing-glass-soft rounded-2xl px-5 py-4 text-left" style={{ animationDelay: "0.25s" }}>
              <div className="text-2xl font-bold text-[oklch(0.28_0.07_260)]">80</div>
              <div className="mt-1 text-sm text-[oklch(0.28_0.07_260/70%)]">questões</div>
            </div>
            <div className="ld-rise jd-landing-glass-soft rounded-2xl px-5 py-4 text-left" style={{ animationDelay: "0.35s" }}>
              <div className="text-2xl font-bold text-[oklch(0.28_0.07_260)]">90 min</div>
              <div className="mt-1 text-sm text-[oklch(0.28_0.07_260/70%)]">tempo estimado</div>
            </div>
            <div className="ld-rise jd-landing-glass-soft rounded-2xl px-5 py-4 text-left" style={{ animationDelay: "0.45s" }}>
              <div className="text-2xl font-bold text-[oklch(0.28_0.07_260)]">Grátis</div>
              <div className="mt-1 text-sm text-[oklch(0.28_0.07_260/70%)]">
                100% gratuito
              </div>
            </div>
          </div>
        </section>

        {/* Seção 3 — Explicação breve */}
        <section className="ld-rise jd-landing-glass mt-6 rounded-[2rem] px-6 py-10 sm:px-12 sm:py-12" style={{ animationDelay: "0.2s" }}>
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Simples de começar, fácil de entender o resultado
              </h2>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[oklch(0.72_0.13_82/20%)] text-sm font-bold text-[oklch(0.45_0.11_80)]">
                    1
                  </span>
                  <span className="text-[oklch(0.28_0.07_260/80%)]">
                    Você vai responder{" "}
                    <strong className="text-[oklch(0.28_0.07_260)]">80 questões</strong> de
                    Tribunal e Ministério Público.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[oklch(0.72_0.13_82/20%)] text-sm font-bold text-[oklch(0.45_0.11_80)]">
                    2
                  </span>
                  <span className="text-[oklch(0.28_0.07_260/80%)]">
                    No final, você recebe seu{" "}
                    <strong className="text-[oklch(0.28_0.07_260)]">percentual de acerto</strong>{" "}
                    e por área do conhecimento.
                  </span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/70 bg-gradient-to-br from-white/60 to-white/30 px-8 py-10">
              <div className="text-5xl font-bold text-[oklch(0.28_0.07_260)]">100%</div>
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[oklch(0.28_0.07_260/60%)]">
                Gratuito
              </div>
              <Link
                to="/simulado/cadastro"
                className="jd-landing-cta inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-base font-bold transition-transform duration-200 hover:-translate-y-0.5"
              >
                Começar agora
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-[oklch(0.28_0.07_260/50%)]">
          Um único passo até o seu resultado. Sem cadastro complicado.
        </p>
      </div>
    </div>
  );
}
