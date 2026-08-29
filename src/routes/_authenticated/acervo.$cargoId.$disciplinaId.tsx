import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { alunoListTrilhas } from "@/lib/trilhas.functions";
import { alunoListMateriaisComProgresso } from "@/lib/questoes.functions";
import { alunoVerificarSenhaDisciplina } from "@/lib/acervo.functions";
import { MaterialRow } from "@/components/material-row";

function unlockKey(disciplinaId: string) {
  return `acervo_desbloqueado_${disciplinaId}`;
}

export const Route = createFileRoute("/_authenticated/acervo/$cargoId/$disciplinaId")({
  head: () => ({
    meta: [
      { title: "Materiais da matéria — Acervo Base | Instituto J&D" },
      {
        name: "description",
        content:
          "Materiais em PDF da matéria selecionada, com leitor in-app, marcação de leitura, questões e desempenho.",
      },
      { property: "og:title", content: "Materiais da matéria — Acervo Base" },
      {
        property: "og:description",
        content: "Abra o PDF, marque como lido, resolva as questões e acompanhe seu desempenho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CargoDisciplinaMateriais,
});

function CargoDisciplinaMateriais() {
  const { cargoId, disciplinaId } = Route.useParams();
  const cargosFn = useServerFn(alunoListTrilhas);
  const matsFn = useServerFn(alunoListMateriaisComProgresso);

  const qCargos = useQuery({ queryKey: ["aluno", "cargos"], queryFn: () => cargosFn() });
  const qMats = useQuery({ queryKey: ["aluno", "acervo"], queryFn: () => matsFn() });

  const todos = cargoId === "todos";
  const cargo = (qCargos.data ?? []).find((c: any) => c.id === cargoId);
  const permitidos = new Set<string>((cargo?.materiais ?? []).map((m: any) => m.id));

  const items = (qMats.data ?? [])
    .filter((m: any) => !m.especifica)
    .filter((m: any) => todos || permitidos.has(m.id))
    .filter((m: any) => (m.disciplina_id ?? "sem-disciplina") === disciplinaId);

  const nome = items[0]?.disciplina ?? "Matéria";
  const temSenha = items.some((m: any) => m.tem_senha);
  const loading = qCargos.isLoading || qMats.isLoading;

  // Disciplinas com módulos (ex.: Técnico Judiciário): mostra módulos antes das matérias.
  const mapaModulos = new Map<string, { id: string; nome: string; ordem: number; total: number }>();
  items.forEach((m: any) => {
    if (!m.modulo_id) return;
    const atual = mapaModulos.get(m.modulo_id) ?? { id: m.modulo_id, nome: m.modulo ?? "Módulo", ordem: m.modulo_ordem ?? 0, total: 0 };
    atual.total += 1;
    mapaModulos.set(m.modulo_id, atual);
  });
  const modulos = [...mapaModulos.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
  const semModulo = items.filter((m: any) => !m.modulo_id).length;
  const temModulos = modulos.length > 0;

  const [moduloSel, setModuloSel] = useState<string | null>(null);
  const itensVisiveis = !temModulos || !moduloSel
    ? items
    : moduloSel === "sem-modulo"
      ? items.filter((m: any) => !m.modulo_id)
      : items.filter((m: any) => m.modulo_id === moduloSel);
  const moduloSelNome =
    moduloSel === "sem-modulo" ? "Outros materiais" : modulos.find((m) => m.id === moduloSel)?.nome;

  const [desbloqueado, setDesbloqueado] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(unlockKey(disciplinaId)) === "1",
  );
  const [senha, setSenha] = useState("");
  const verificarFn = useServerFn(alunoVerificarSenhaDisciplina);
  const verificar = useMutation({
    mutationFn: () => verificarFn({ data: { disciplina_id: disciplinaId, senha } }),
    onSuccess: (r: any) => {
      if (r.ok) {
        sessionStorage.setItem(unlockKey(disciplinaId), "1");
        setDesbloqueado(true);
      } else {
        toast.error("Senha incorreta.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bloqueado = !loading && temSenha && !desbloqueado;

  return (
    <>
      <PageHeader
        title={loading ? "Carregando…" : nome}
        description={todos ? "Materiais em PDF desta matéria." : `Materiais desta matéria em ${cargo?.nome ?? "cargo"}.`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/acervo/$cargoId" params={{ cargoId }}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Matérias
            </Link>
          </Button>
        }
      />
      <PageContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : bloqueado ? (
          <div className="surface-card mx-auto max-w-sm p-6 text-center">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Matéria protegida</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Digite a senha para ver os materiais desta matéria.
            </p>
            <form
              className="mt-4 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (senha.trim()) verificar.mutate();
              }}
            >
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoFocus
              />
              <Button type="submit" disabled={verificar.isPending || !senha.trim()}>
                {verificar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Abrir
              </Button>
            </form>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum material nesta matéria"
            description="Os materiais serão publicados em breve."
          />
        ) : (
          <div className="space-y-2">
            {items.map((m: any) => (
              <MaterialRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
