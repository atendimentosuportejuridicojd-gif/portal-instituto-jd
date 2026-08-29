import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  PencilLine,
  Loader2,
} from "lucide-react";
import { alunoAbrirMaterial } from "@/lib/acervo.functions";
import { salvarLeituraMaterial } from "@/lib/aluno.functions";
import { EmptyState } from "@/components/page";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/materiais/$materialId/pdf")({
  head: () => ({
    meta: [
      { title: "Leitor de PDF — Portal J&D" },
      { name: "description", content: "Leia o material em PDF direto no Portal do Aluno." },
    ],
  }),
  component: LeitorPdf,
});

function LeitorPdf() {
  const { materialId } = Route.useParams();
  const navigate = useNavigate();
  const abrirFn = useServerFn(alunoAbrirMaterial);
  const salvarFn = useServerFn(salvarLeituraMaterial);

  const q = useQuery({
    queryKey: ["material-pdf", materialId],
    queryFn: () => abrirFn({ data: { material_id: materialId } }),
    refetchOnWindowFocus: false,
  });

  const salvar = useMutation({
    mutationFn: (pagina: number) =>
      salvarFn({ data: { material_id: materialId, ultima_pagina: pagina } }),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [pagina, setPagina] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [perguntou, setPerguntou] = useState(false);
  const [retomar, setRetomar] = useState<number | null>(null);

  const totalPaginas = q.data?.material.paginas ?? null;

  // Diálogo "continuar ou reiniciar"
  useEffect(() => {
    if (!q.data || perguntou) return;
    const salva = q.data.leitura?.ultima_pagina ?? 1;
    if (salva > 1) setRetomar(salva);
    setPerguntou(true);
  }, [q.data, perguntou]);

  // Salvamento automático da página (debounce)
  useEffect(() => {
    if (!q.data?.url) return;
    const t = setTimeout(() => salvar.mutate(pagina), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, q.data?.url]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await containerRef.current?.requestFullscreen?.();
  };

  const irPara = (p: number) => {
    const max = totalPaginas ?? 9999;
    setPagina(Math.min(Math.max(1, p), max));
  };

  if (q.isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando material…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="px-6 py-10 sm:px-8">
        <EmptyState
          icon={FileText}
          title="Não foi possível abrir o material"
          description={(q.error as Error)?.message ?? "Tente novamente em instantes."}
        />
      </div>
    );
  }

  const m = q.data!.material;
  const url = q.data!.url;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            nav.disciplinaId
              ? navigate({
                  to: "/acervo/$cargoId/$disciplinaId",
                  params: { cargoId: "todos", disciplinaId: nav.disciplinaId },
                })
              : navigate({ to: "/acervo" })
          }
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {nav.disciplinaId ? "Disciplina" : "Acervo"}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{m.titulo}</p>
            <Badge variant="secondary" className="shrink-0">
              v{m.versao}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {m.disciplina}
            {m.modulo ? ` · ${m.modulo}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Página anterior" onClick={() => irPara(pagina - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            aria-label="Página atual"
            className="h-8 w-16 text-center"
            value={pagina}
            onChange={(e) => irPara(Number(e.target.value.replace(/\D/g, "")) || 1)}
          />
          <span className="text-xs text-muted-foreground">{totalPaginas ? `/ ${totalPaginas}` : ""}</span>
          <Button variant="ghost" size="icon" aria-label="Próxima página" onClick={() => irPara(pagina + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {q.data!.total_questoes > 0 && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/materiais/$materialId/questoes" params={{ materialId }}>
                  <PencilLine className="mr-1 h-3.5 w-3.5" />
                  Questões ({q.data!.total_questoes})
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/materiais/$materialId/desempenho" params={{ materialId }}>
                  <BarChart3 className="mr-1 h-3.5 w-3.5" />
                  Desempenho
                </Link>
              </Button>
            </>
          )}
          {m.download_permitido && url && (
            <Button asChild variant="ghost" size="icon" aria-label="Baixar PDF">
              <a href={url} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 bg-muted/40">
        {url ? (
          <iframe
            key={`${pagina}`}
            title={m.titulo}
            src={`${url}#page=${pagina}&view=FitH`}
            className="h-full w-full border-0"
          />
        ) : (
          <div className="p-8">
            <EmptyState
              icon={FileText}
              title="Arquivo ainda não publicado"
              description="Este material será disponibilizado em breve pela equipe do Instituto."
            />
          </div>
        )}
      </div>

      <Dialog open={retomar !== null} onOpenChange={(o) => !o && setRetomar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continuar de onde parou?</DialogTitle>
            <DialogDescription>
              Você estava na página {retomar} deste material.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPagina(1);
                setRetomar(null);
              }}
            >
              Começar do início
            </Button>
            <Button
              onClick={() => {
                if (retomar) setPagina(retomar);
                setRetomar(null);
              }}
            >
              Continuar na página {retomar}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
