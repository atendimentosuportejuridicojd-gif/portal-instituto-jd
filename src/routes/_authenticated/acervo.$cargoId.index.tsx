import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, FolderOpen, ChevronRight, Lock } from "lucide-react";
import { alunoListTrilhas } from "@/lib/trilhas.functions";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";

export const Route = createFileRoute("/_authenticated/acervo/$cargoId/")({
  head: () => ({
    meta: [
      { title: "Matérias do cargo — Acervo Base | Instituto J&D" },
      {
        name: "description",
        content:
          "Matérias do cargo selecionado no Acervo Base do Instituto J&D, com materiais em PDF e questões.",
      },
      { property: "og:title", content: "Matérias do cargo — Acervo Base" },
      {
        property: "og:description",
        content: "Escolha uma matéria para abrir os materiais em PDF deste cargo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CargoDisciplinas,
});

function CargoDisciplinas() {
  const { cargoId } = Route.useParams();
  const cargosFn = useServerFn(alunoListTrilhas);
  const matsFn = useServerFn(alunoListMateriaisComProgresso);

  const qCargos = useQuery({ queryKey: ["aluno", "cargos"], queryFn: () => cargosFn() });
  const qMats = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => matsFn() });

  const todos = cargoId === "todos";
  const cargo = (qCargos.data ?? []).find((c: any) => c.id === cargoId);
  const permitidos = new Set<string>((cargo?.materiais ?? []).map((m: any) => m.id));
  const materiais = (qMats.data ?? []).filter((m: any) => !m.especifica)
    .filter((m: any) => todos || permitidos.has(m.id));

  const mapa = new Map<
    string,
    { id: string; nome: string; total: number; novos: number; grupo: string; tem_senha: boolean }
  >();
  materiais.forEach((m: any) => {
    const id = m.disciplina_id ?? "sem-disciplina";
    const atual =
      mapa.get(id) ??
      { id, nome: m.disciplina, total: 0, novos: 0, grupo: m.grupo ?? "gerais", tem_senha: false };
    atual.total += 1;
    if (m.novo || m.atualizado) atual.novos += 1;
    if (m.tem_senha) atual.tem_senha = true;
    mapa.set(id, atual);
  });
  const disciplinas = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const grupos = [
    { key: "gerais", titulo: "Conhecimentos Gerais", itens: disciplinas.filter((d) => d.grupo !== "especificos") },
    {
      key: "especificos",
      titulo: "Conhecimentos Específicos",
      itens: disciplinas.filter((d) => d.grupo === "especificos"),
    },
  ].filter((g) => g.itens.length > 0);

  const loading = qCargos.isLoading || qMats.isLoading;
  const titulo = todos ? "Acervo completo" : (cargo?.nome ?? "Cargo");

  return (
    <>
      <PageHeader
        title={loading ? "Carregando…" : titulo}
        description="Escolha uma matéria para ver os materiais em PDF."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/acervo">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Cargos
            </Link>
          </Button>
        }
      />
      <PageContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : disciplinas.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma matéria neste cargo"
            description="Os materiais deste cargo serão liberados em breve."
          />
        ) : (
          <div className="space-y-8">
            {grupos.map((g) => (
              <section key={g.key}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.titulo}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {g.itens.length} {g.itens.length === 1 ? "matéria" : "matérias"}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.itens.map((d) => (
                    <Link
                      key={d.id}
                      to="/acervo/$cargoId/$disciplinaId"
                      params={{ cargoId, disciplinaId: d.id }}
                      className="surface-card group flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <div className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-muted">
                          <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="flex items-center gap-1.5 truncate text-sm font-semibold">
                          {d.nome}
                          {d.tem_senha && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {d.total} {d.total === 1 ? "material" : "materiais"}
                          {d.novos > 0 ? ` · ${d.novos} novo(s)` : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
