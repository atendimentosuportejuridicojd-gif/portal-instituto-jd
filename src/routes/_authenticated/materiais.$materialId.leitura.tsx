import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft,
  BarChart3,
  PencilLine,
  Loader2,
  List,
  ChevronDown,
  BookOpen,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { alunoAbrirMateriaLeitura } from "@/lib/acervo.functions";
import { EmptyState } from "@/components/page";
import { MateriaMarkdown, extractHeadings } from "@/lib/materia-markdown";
import { cn } from "@/lib/utils";
import { toggleMaterialLido } from "@/lib/aluno.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/materiais/$materialId/leitura")({
  head: () => ({
    meta: [
      { title: "Leitura da matéria — Portal J&D" },
      { name: "description", content: "Leia a matéria do Acervo Base direto no Portal do Aluno." },
    ],
  }),
  component: LeitorMateria,
});

function LeitorMateria() {
  const { materialId } = Route.useParams();
  const navigate = useNavigate();
  const abrirFn = useServerFn(alunoAbrirMateriaLeitura);
  const lidoFn = useServerFn(toggleMaterialLido);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["materia-leitura", materialId],
    queryFn: () => abrirFn({ data: { material_id: materialId } }),
    refetchOnWindowFocus: false,
  });

  const lido = !!q.data?.lido;

  const marcarLido = useMutation({
    mutationFn: () => lidoFn({ data: { material_id: materialId, lido: !lido } }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["materia-leitura", materialId] });
      qc.invalidateQueries({ queryKey: ["aluno", "acervo"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(r?.lido ? "Material marcado como lido." : "Marcação de leitura removida.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const conteudo = q.data?.material.conteudo_md ?? "";
  const headings = conteudo ? extractHeadings(conteudo) : [];

  const [progresso, setProgresso] = useState(0);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [tocAberto, setTocAberto] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    function medir() {
      const doc = document.documentElement;
      const alturaTotal = doc.scrollHeight - window.innerHeight;
      setProgresso(
        alturaTotal > 0 ? Math.min(100, Math.max(0, (window.scrollY / alturaTotal) * 100)) : 0,
      );

      let atualIdx = 0;
      for (let i = 0; i < headings.length; i++) {
        const el = document.getElementById(headings[i].slug);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 130) atualIdx = i;
        else break;
      }
      setAtivo(headings[atualIdx]?.slug ?? null);
    }

    function onScroll() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        medir();
      });
    }

    medir();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteudo]);

  if (q.isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando matéria…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="px-6 py-10 sm:px-8">
        <EmptyState
          icon={BookOpen}
          title="Não foi possível abrir a matéria"
          description={(q.error as Error)?.message ?? "Tente novamente em instantes."}
        />
      </div>
    );
  }

  const m = q.data!.material;
  const totalQuestoes = q.data!.total_questoes;

  // Os H3 ficam colapsados por padrao — so os do H2 que contem a secao
  // ativa (H1/H2/H3, o que estiver mais visivel) aparecem no indice.
  const headingAtivo = headings.find((h) => h.slug === ativo);
  const grupoH2Ativo =
    headingAtivo?.level === 3
      ? headingAtivo.parentH2
      : headingAtivo?.level === 2
        ? headingAtivo.slug
        : null;

  const IndiceLista = () => (
    <nav aria-label="Índice da matéria" className="space-y-0.5 text-sm">
      {headings
        .filter((h) => h.level !== 3 || h.parentH2 === grupoH2Ativo)
        .map((h) => {
          const isAtivo = ativo === h.slug;
          return (
            <a
              key={h.slug}
              href={`#${h.slug}`}
              onClick={() => setTocAberto(false)}
              className={cn(
                "block truncate rounded px-2 py-1 transition-colors",
                h.level === 2 && "pl-5 text-xs",
                h.level === 3 && "pl-9 text-xs italic",
                isAtivo ? "font-medium" : "text-muted-foreground hover:text-foreground",
              )}
              style={
                isAtivo
                  ? { color: "var(--jd-acento)" }
                  : h.level === 3
                    ? { color: "var(--jd-titulo-h2)" }
                    : undefined
              }
            >
              <span className="mr-1.5 tabular-nums opacity-70">{h.numero}</span>
              {h.text}
            </a>
          );
        })}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* Barra de progresso de leitura */}
      <div className="sticky top-14 z-10 h-[3px] w-full bg-border/40">
        <div
          className="h-full transition-[width] duration-150"
          style={{ width: `${progresso}%`, backgroundColor: "var(--jd-acento)" }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/acervo" })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Acervo
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{m.titulo}</p>
          <p className="truncate text-xs text-muted-foreground">
            {m.disciplina}
            {m.tempo_leitura ? ` · ${m.tempo_leitura} min de leitura` : ""}
          </p>
        </div>
        {totalQuestoes > 0 && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/materiais/$materialId/questoes" params={{ materialId }}>
                <PencilLine className="mr-1 h-3.5 w-3.5" />
                Questões ({totalQuestoes})
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/materiais/$materialId/desempenho" params={{ materialId }}>
                <BarChart3 className="mr-1 h-3.5 w-3.5" />
                Desempenho
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Índice colapsável — só em telas menores */}
      {headings.length > 0 && (
        <div className="border-b border-border/60 px-4 py-2 sm:px-6 lg:hidden">
          <Collapsible open={tocAberto} onOpenChange={setTocAberto}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-1.5">
                  <List className="h-3.5 w-3.5" />
                  Índice da matéria
                </span>
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", tocAberto && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <IndiceLista />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <article className="min-w-0">
          {m.resumo && <p className="mb-6 text-sm text-muted-foreground">{m.resumo}</p>}
          {conteudo ? (
            <>
              <MateriaMarkdown markdown={conteudo} />
              <div className="mt-10 flex flex-col items-center gap-2 border-t border-border/60 pt-6">
                <p className="text-sm text-muted-foreground">
                  {lido ? "Você já concluiu esta matéria." : "Terminou a leitura desta matéria?"}
                </p>
                <Button
                  variant={lido ? "secondary" : "default"}
                  onClick={() => marcarLido.mutate()}
                  disabled={marcarLido.isPending}
                  aria-pressed={lido}
                >
                  {marcarLido.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : lido ? (
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="mr-2 h-4 w-4" />
                  )}
                  {lido ? "Já li" : "Marcar como lido"}
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Matéria ainda não publicada"
              description="O texto desta matéria será disponibilizado em breve pela equipe do Instituto."
            />
          )}
        </article>

        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nesta matéria
              </p>
              <IndiceLista />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
