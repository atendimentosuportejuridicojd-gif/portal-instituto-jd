import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader } from "@/components/page";
import { BookOpen, Target, FileText, Newspaper, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { getConteudosParaRevisar } from "@/lib/questoes.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Portal J&D" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchFn = useServerFn(getConteudosParaRevisar);
  const q = useQuery({ queryKey: ["dashboard", "revisar"], queryFn: () => fetchFn() });
  const revisar = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Bem-vindo(a) de volta"
        description="Sua central de estudos para Tribunais e Ministérios Públicos."
      />
      <PageContent>
        {revisar.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Conteúdos para Revisar
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {revisar.map((r: any) => (
                <Link
                  key={r.material_id}
                  to="/materiais/$materialId/questoes"
                  params={{ materialId: r.material_id }}
                  className="surface-card block border-red-500/20 p-5 transition-colors hover:border-red-500/40"
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-red-600">
                    <span>🔴</span>
                    Revisão recomendada
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{r.titulo}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{r.disciplina}</p>
                  <div className="mt-3 text-sm">
                    Desempenho: <span className="font-semibold tabular-nums text-red-600">{r.percentual}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card icon={Clock} label="Continuar estudando" title="Retome de onde parou" desc="Acesse o acervo para continuar." />
          <Card icon={BookOpen} label="Acervo" title="Materiais e questões" desc="Estude PDFs e resolva questões." />
          <Card icon={Newspaper} label="Fique por dentro" title="Notícias e atualizações" desc="Nenhuma notícia publicada." />
          <Card
            icon={TrendingUp}
            label="Revisão recomendada"
            title="Reforce o que mais errou"
            desc={
              revisar.length > 0
                ? `${revisar.length} conteúdo${revisar.length > 1 ? "s" : ""} abaixo de 70%.`
                : "Nenhum conteúdo em revisão. Continue assim!"
            }
          />
          <Card icon={Target} label="Trilha atual" title="Sua preparação" desc="Selecione uma trilha em Trilhas." />
          <Card icon={FileText} label="Cronograma" title="Metas da semana" desc="Nenhum cronograma ativo." />
        </div>
      </PageContent>
    </>
  );
}

function Card({
  icon: Icon,
  label,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="surface-card p-6 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
