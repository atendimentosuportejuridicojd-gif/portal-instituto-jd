import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader } from "@/components/page";
import {
  BookOpen,
  CalendarDays,
  FileText,
  Newspaper,
  Clock,
  TrendingUp,
  AlertCircle,
  Star,
  ArrowRight,
  PencilLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getConteudosParaRevisar } from "@/lib/questoes.functions";
import { getResumoDashboard, listFavoritos } from "@/lib/aluno.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Portal do Aluno J&D" },
      {
        name: "description",
        content:
          "Central de estudos do Instituto J&D Especialistas na Carreira Judiciária: continue de onde parou nas questões e na leitura, revise conteúdos e acesse seus favoritos.",
      },
      { property: "og:title", content: "Dashboard — Portal do Aluno J&D" },
      {
        property: "og:description",
        content: "Continue de onde parou nas questões e na leitura dos PDFs.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const revisarFn = useServerFn(getConteudosParaRevisar);
  const resumoFn = useServerFn(getResumoDashboard);
  const favFn = useServerFn(listFavoritos);

  const qRevisar = useQuery({ queryKey: ["dashboard", "revisar"], queryFn: () => revisarFn() });
  const qResumo = useQuery({ queryKey: ["dashboard", "resumo"], queryFn: () => resumoFn() });
  const qFav = useQuery({ queryKey: ["favoritos"], queryFn: () => favFn() });

  const revisar = qRevisar.data ?? [];
  const continuarQuestoes = qResumo.data?.continuarQuestoes ?? null;
  const continuarLeitura = qResumo.data?.continuarLeitura ?? null;
  const favoritos = qFav.data ?? [];

  return (
    <>
      <PageHeader
        title="Bem-vindo(a) de volta"
        description="Sua central de estudos para Tribunais e Ministérios Públicos."
      />
      <PageContent>
        <div className="space-y-8">
          {/* Continuar de onde parei */}
          <section className="animate-in fade-in duration-500">
            <SectionTitle icon={Clock}>Continuar de onde parei</SectionTitle>
            {qResumo.isLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <ContinuarCard
                  rotulo="Questões"
                  icon={PencilLine}
                  item={continuarQuestoes}
                  to="/materiais/$materialId/questoes"
                  vazio="Você ainda não resolveu questões. Escolha um material e comece a prática dirigida."
                />
                <ContinuarCard
                  rotulo="Leitura do PDF"
                  icon={BookOpen}
                  item={continuarLeitura}
                  to="/materiais/$materialId/pdf"
                  vazio="Você ainda não abriu nenhum PDF. Comece pelo Acervo Base."
                />
              </div>
            )}
          </section>


          {/* Conteúdos para revisar */}
          {revisar.length > 0 && (
            <section className="animate-in fade-in duration-500">
              <SectionTitle icon={AlertCircle}>Conteúdos para revisar</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {revisar.map((r: any) => (
                  <Link
                    key={r.material_id}
                    to="/materiais/$materialId/questoes"
                    params={{ materialId: r.material_id }}
                    className="surface-card block p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{r.disciplina}</p>
                    <h3 className="mt-1 text-sm font-semibold">{r.titulo}</h3>
                    <div className="mt-3 text-sm">
                      Desempenho:{" "}
                      <span className="font-semibold tabular-nums text-destructive">{r.percentual}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Meus favoritos */}
          <section className="animate-in fade-in duration-500">
            <SectionTitle icon={Star}>Meus favoritos</SectionTitle>
            {qFav.isLoading ? (
              <Skeleton className="h-20 w-full rounded-lg" />
            ) : favoritos.length === 0 ? (
              <p className="surface-card p-5 text-sm text-muted-foreground">
                Você ainda não favoritou nenhum conteúdo. Use o ícone de estrela nos materiais para
                salvá-los aqui.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {favoritos.map((f) => (
                  <FavoritoCard key={f.id} f={f} />
                ))}
              </div>
            )}
          </section>

          {/* Atalhos */}
          <section>
            <SectionTitle icon={TrendingUp}>Atalhos</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Atalho to="/acervo" icon={BookOpen} title="Acervo Base" desc="Materiais e questões." />
              <Atalho to="/cronogramas" icon={CalendarDays} title="Meu cronograma" desc="Seu plano de estudos." />
              <Atalho to="/concursos" icon={FileText} title="Concursos" desc="Preparação específica." />
              <Atalho to="/perfil" icon={Newspaper} title="Meu perfil" desc="Jornada e assinatura." />
            </div>
          </section>
        </div>
      </PageContent>
    </>
  );
}

type ContinuarItem = {
  material_id: string;
  titulo: string;
  disciplina: string;
  detalhe: string;
} | null;

function ContinuarCard({
  rotulo,
  icon: Icon,
  item,
  to,
  vazio,
}: {
  rotulo: string;
  icon: React.ComponentType<{ className?: string }>;
  item: ContinuarItem;
  to: "/materiais/$materialId/questoes" | "/materiais/$materialId/pdf";
  vazio: string;
}) {
  return (
    <div className="surface-card flex flex-col gap-4 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" />
        {rotulo}
      </div>
      {item ? (
        <>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {item.disciplina}
            </p>
            <h3 className="mt-1 truncate text-base font-semibold">{item.titulo}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{item.detalhe}</p>
          </div>
          <Button asChild className="mt-auto w-fit">
            <Link to={to} params={{ materialId: item.material_id }}>
              Retomar
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{vazio}</p>
          <Button asChild variant="outline" className="mt-auto w-fit">
            <Link to="/acervo">
              Ir para o acervo
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}


function FavoritoCard({ f }: { f: { tipo: string; item_id: string; titulo: string } }) {
  const rotulo =
    f.tipo === "material"
      ? "Material"
      : f.tipo === "trilha"
        ? "Trilha"
        : f.tipo === "concurso"
          ? "Concurso"
          : "Notícia";

  const inner = (
    <>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Star className="h-3.5 w-3.5 text-gold" />
        {rotulo}
      </div>
      <h3 className="mt-2 truncate text-sm font-semibold">{f.titulo}</h3>
    </>
  );

  if (f.tipo === "material") {
    return (
      <Link
        to="/materiais/$materialId/questoes"
        params={{ materialId: f.item_id }}
        className="surface-card block p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        {inner}
      </Link>
    );
  }
  const to = f.tipo === "concurso" ? "/concursos" : f.tipo === "trilha" ? "/acervo" : "/dashboard";
  return (
    <Link to={to} className="surface-card block p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      {inner}
    </Link>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-4 w-4" />
      {children}
    </h2>
  );
}

function Atalho({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="surface-card group block p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
