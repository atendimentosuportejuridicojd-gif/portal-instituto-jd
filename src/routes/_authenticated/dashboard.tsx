import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader } from "@/components/page";
import { BookOpen, Target, FileText, Newspaper, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Portal J&D" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Bem-vindo(a) de volta"
        description="Sua central de estudos para Tribunais e Ministérios Públicos."
      />
      <PageContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            icon={Clock}
            label="Continuar estudando"
            title="Retome de onde parou"
            desc="Nenhum material em progresso ainda."
          />
          <Card
            icon={BookOpen}
            label="Últimos materiais"
            title="Novidades do acervo"
            desc="Ainda sem publicações recentes."
          />
          <Card
            icon={Newspaper}
            label="Fique por dentro"
            title="Notícias e atualizações"
            desc="Nenhuma notícia publicada."
          />
          <Card
            icon={TrendingUp}
            label="Revisão recomendada"
            title="Reforce o que mais errou"
            desc="Resolva questões para gerar recomendações."
          />
          <Card
            icon={Target}
            label="Trilha atual"
            title="Sua preparação"
            desc="Selecione uma trilha em Trilhas."
          />
          <Card
            icon={FileText}
            label="Cronograma"
            title="Metas da semana"
            desc="Nenhum cronograma ativo."
          />
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
