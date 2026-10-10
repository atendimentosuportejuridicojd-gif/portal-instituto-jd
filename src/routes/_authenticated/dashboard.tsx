import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, SecaoTitulo } from "@/components/page";
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
  LayoutDashboard,
  Target,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getConteudosParaRevisar } from "@/lib/questoes.functions";
import { getResumoDashboard, listFavoritos } from "@/lib/aluno.functions";
import { alunoCronogramaAtual } from "@/lib/cronograma-aluno.functions";
import { AnelProgresso, SeloTipo } from "@/components/cronograma/visual";
import { formatarData, formatarMinutos } from "@/components/cronograma/formato";
import { cn } from "@/lib/utils";

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
        content: "Continue de onde parou nas questões e na leitura das matérias.",
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
        icone={LayoutDashboard}
        rotulo="Portal do Aluno"
        title="Bem-vindo(a) de volta"
        description="Sua central de estudos para Tribunais e Ministérios Públicos."
      />
      <PageContent>
        <div className="space-y-9">
          <CartaoCronograma />

          {/* Continuar de onde parei */}
          <section className="animate-in fade-in duration-500">
            <SecaoTitulo icone={Clock}>Continuar de onde parei</SecaoTitulo>
            {qResumo.isLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <ContinuarCard
                  rotulo="Questões"
                  icon={PencilLine}
                  cor="violet"
                  item={continuarQuestoes}
                  to="/materiais/$materialId/questoes"
                  acao="Retomar as questões"
                  vazio="Você ainda não resolveu questões. Escolha um material e comece a prática dirigida."
                />
                <ContinuarCard
                  rotulo="Leitura da matéria"
                  icon={BookOpen}
                  cor="sky"
                  item={continuarLeitura}
                  to="/materiais/$materialId/leitura"
                  acao="Retomar a leitura"
                  vazio="Você ainda não abriu nenhuma matéria. Comece pelo Acervo Base."
                />
              </div>
            )}
          </section>

          {/* Conteúdos para revisar */}
          {revisar.length > 0 && (
            <section className="animate-in fade-in duration-500">
              <SecaoTitulo icone={AlertCircle}>Conteúdos para revisar</SecaoTitulo>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {revisar.map((r: any) => (
                  <Link
                    key={r.material_id}
                    to="/materiais/$materialId/questoes"
                    params={{ materialId: r.material_id }}
                    className="surface-card group block border-l-4 border-l-rose-500 p-5 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {r.disciplina}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold leading-snug">{r.titulo}</h3>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Desempenho</span>
                      <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-rose-700 dark:text-rose-300">
                        {r.percentual}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Meus favoritos */}
          <section className="animate-in fade-in duration-500">
            <SecaoTitulo icone={Star}>Meus favoritos</SecaoTitulo>
            {qFav.isLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
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
            <SecaoTitulo icone={TrendingUp}>Atalhos</SecaoTitulo>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Atalho to="/acervo" icon={BookOpen} cor="sky" title="Acervo Base" desc="Materiais e questões." />
              <Atalho to="/cronogramas" icon={CalendarDays} cor="amber" title="Meu cronograma" desc="Seu plano de estudos." />
              <Atalho to="/simulados" icon={ClipboardCheck} cor="rose" title="Simulados" desc="Meça o seu nível." />
              <Atalho to="/concursos" icon={FileText} cor="violet" title="Concursos" desc="Datas, editais e provas." />
              <Atalho to="/noticias" icon={Newspaper} cor="emerald" title="Fique por dentro" desc="Editais e avisos." />
            </div>
          </section>
        </div>
      </PageContent>
    </>
  );
}

// ---------- cartão do cronograma ----------

function CartaoCronograma() {
  const fn = useServerFn(alunoCronogramaAtual);
  const q = useQuery({ queryKey: ["aluno", "cronograma"], queryFn: () => fn(), retry: false });

  if (q.isLoading) return <Skeleton className="h-44 w-full rounded-xl" />;
  if (q.error || !q.data) return null;

  const c = q.data.cronograma;
  if (!c) {
    return (
      <section className="surface-card relative overflow-hidden border-gold/40 bg-gold/[0.05] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold/25 text-gold-foreground dark:text-gold">
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Monte o seu cronograma J&D</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Informe o concurso, a data da prova e o seu tempo. O plano organiza o que estudar em cada dia, até a
              véspera da prova.
            </p>
          </div>
          <Button asChild>
            <Link to="/cronogramas">
              Montar agora
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  const blocos: any[] = q.data.blocos ?? [];
  const hoje = q.data.hoje;
  const proxima = blocos.find((b) => !b.concluido && b.data <= hoje && b.tipo !== "simulado") ?? null;
  const pendentesHoje = blocos.filter((b) => b.data === hoje && !b.concluido);

  return (
    <section className="surface-card overflow-hidden">
      <div className="relative bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-foreground/70">
              Meu cronograma
            </p>
            <h2 className="text-lg font-semibold leading-tight sm:text-xl">{c.concurso_nome}</h2>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary-foreground/80">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Prova em {formatarData(c.data_prova)}
              </span>
              {q.data.diasAtrasados > 0 && <span>· {q.data.diasAtrasados} dia(s) em atraso</span>}
            </p>
          </div>
          <div className="flex items-center gap-5">
            {q.data.diasAteProva !== null && q.data.diasAteProva >= 0 && (
              <div className="text-center">
                <p className="text-4xl font-bold tabular-nums leading-none">{q.data.diasAteProva}</p>
                <p className="mt-1 text-[11px] text-primary-foreground/70">dias para a prova</p>
              </div>
            )}
            <AnelProgresso valor={q.data.progresso.percentual} tamanho={84}>
              <span className="text-base font-semibold tabular-nums">{q.data.progresso.percentual}%</span>
            </AnelProgresso>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 p-4 sm:px-6">
        {proxima ? (
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {proxima.data < hoje ? "Em atraso" : "Sua próxima atividade"}
            </p>
            <p className="truncate text-sm font-semibold">{proxima.titulo}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <SeloTipo tipo={proxima.tipo} />
              <span>{formatarMinutos(proxima.minutos)}</span>
              {pendentesHoje.length > 1 && <span>· mais {pendentesHoje.length - 1} hoje</span>}
            </div>
          </div>
        ) : (
          <p className="flex-1 text-sm text-muted-foreground">
            {pendentesHoje.length === 0 ? "Nada pendente para hoje. Bom trabalho!" : "Abra o cronograma para ver o dia."}
          </p>
        )}
        <Button asChild>
          <Link to="/cronogramas">
            Abrir cronograma
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// ---------- peças ----------

const CORES: Record<string, { tile: string; barra: string }> = {
  sky: { tile: "bg-sky-500/10 text-sky-600 dark:text-sky-300", barra: "border-l-sky-500" },
  violet: { tile: "bg-violet-500/10 text-violet-600 dark:text-violet-300", barra: "border-l-violet-500" },
  amber: { tile: "bg-amber-500/10 text-amber-600 dark:text-amber-300", barra: "border-l-amber-500" },
  rose: { tile: "bg-rose-500/10 text-rose-600 dark:text-rose-300", barra: "border-l-rose-500" },
  emerald: { tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", barra: "border-l-emerald-500" },
};

type ContinuarItem = {
  material_id: string;
  titulo: string;
  disciplina: string;
  detalhe: string;
} | null;

function ContinuarCard({
  rotulo,
  icon: Icon,
  cor,
  item,
  to,
  acao,
  vazio,
}: {
  rotulo: string;
  icon: React.ComponentType<{ className?: string }>;
  cor: keyof typeof CORES;
  item: ContinuarItem;
  to: "/materiais/$materialId/questoes" | "/materiais/$materialId/leitura";
  acao: string;
  vazio: string;
}) {
  return (
    <div className={cn("surface-card flex flex-col gap-4 border-l-4 p-5 hover:shadow-md", CORES[cor].barra)}>
      <div className="flex items-center gap-2.5">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", CORES[cor].tile)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</span>
      </div>
      {item ? (
        <>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {item.disciplina}
            </p>
            <h3 className="mt-1 truncate text-base font-semibold">{item.titulo}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{item.detalhe}</p>
          </div>
          <Button asChild className="mt-auto w-fit">
            <Link to={to} params={{ materialId: item.material_id }}>
              {acao}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{vazio}</p>
          <Button asChild variant="outline" className="mt-auto w-fit">
            <Link to="/acervo">
              Ir para o acervo
              <ArrowRight className="ml-1.5 h-4 w-4" />
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
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Star className="h-3.5 w-3.5 fill-gold text-gold" />
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
        className="surface-card block p-4 hover:-translate-y-0.5 hover:shadow-md"
      >
        {inner}
      </Link>
    );
  }
  const to = f.tipo === "concurso" ? "/concursos" : f.tipo === "trilha" ? "/acervo" : "/dashboard";
  return (
    <Link to={to} className="surface-card block p-4 hover:-translate-y-0.5 hover:shadow-md">
      {inner}
    </Link>
  );
}

function Atalho({
  to,
  icon: Icon,
  cor,
  title,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  cor: keyof typeof CORES;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to} className="surface-card group flex items-center gap-4 p-4 hover:-translate-y-0.5 hover:shadow-md">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105", CORES[cor].tile)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
