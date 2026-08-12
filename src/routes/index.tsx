import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, Scale, Target, FileText, Newspaper, CalendarDays } from "lucide-react";
import lockupAsset from "@/assets/lockup-jd.png.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Portal do Aluno — Instituto J&D Especialistas na Carreira Judiciária" },
      {
        name: "description",
        content:
          "Preparação estruturada para Tribunais e Ministérios Públicos. Materiais, questões e cronogramas em um só lugar.",
      },
      { property: "og:title", content: "Portal do Aluno — Instituto J&D Especialistas na Carreira Judiciária" },
      {
        property: "og:description",
        content: "Preparação estruturada para Tribunais e Ministérios Públicos. Materiais, questões e cronogramas em um só lugar.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <img
            src={lockupAsset.url}
            alt="Instituto J&D — Carreira Judiciária 360"
            width={280}
            height={92}
            loading="eager"
            decoding="async"
            className="h-11 w-auto rounded-md object-contain sm:h-14"
          />
          <Button asChild size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6">
        <section className="py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Preparação para Tribunais e Ministérios Públicos
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
              Uma plataforma séria, para uma preparação séria.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Materiais em PDF, sistema inteligente de questões, cronogramas e trilhas de estudo —
              tudo pensado para quem busca aprovação em Tribunais e MPs de todo o Brasil.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/teste">Testar gratuitamente</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Acessar o Portal</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-24 md:grid-cols-3">
          {[
            { icon: BookOpen, title: "Acervo Base", desc: "Biblioteca organizada por disciplinas." },
            { icon: Target, title: "Trilhas", desc: "Técnico e Analista Judiciário." },
            { icon: FileText, title: "Concursos específicos", desc: "Materiais por edital." },
            { icon: Newspaper, title: "Fique por dentro", desc: "Notícias e atualizações." },
            { icon: CalendarDays, title: "Cronogramas", desc: "Organização diária dos estudos." },
            { icon: Scale, title: "Foco jurídico", desc: "Tribunais e MPs do Brasil todo." },
          ].map((f) => (
            <div key={f.title} className="surface-card p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Instituto J&D Especialistas na Carreira Judiciária
        </p>
      </footer>
    </div>
  );
}
