import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Pin } from "lucide-react";
import { alunoListNoticias } from "@/lib/noticias.functions";

export const Route = createFileRoute("/_authenticated/noticias")({
  validateSearch: (search: Record<string, unknown>) => ({
    n: typeof search.n === "string" ? search.n : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Fique por Dentro — Notícias | Instituto J&D" },
      {
        name: "description",
        content:
          "Notícias e avisos sobre editais, bancas e concursos da carreira judiciária, publicados pelo Instituto J&D.",
      },
      { property: "og:title", content: "Fique por Dentro — Notícias | Instituto J&D" },
      {
        property: "og:description",
        content: "Acompanhe editais, bancas e novidades dos concursos da carreira judiciária.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NoticiasAluno,
});

function NoticiasAluno() {
  const fetchFn = useServerFn(alunoListNoticias);
  const q = useQuery({ queryKey: ["aluno", "noticias"], queryFn: () => fetchFn() });
  const itens = q.data ?? [];
  const { n: destaqueId } = useSearch({ from: "/_authenticated/noticias" });

  useEffect(() => {
    if (!destaqueId || itens.length === 0) return;
    const el = document.getElementById(`noticia-${destaqueId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [destaqueId, itens.length]);

  return (
    <>
      <PageHeader
        title="Fique por Dentro"
        description="Editais, bancas e avisos importantes selecionados pela equipe."
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : itens.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Nenhuma notícia publicada"
            description="As novidades sobre concursos aparecerão aqui."
          />
        ) : (
          <div className="space-y-4">
            {itens.map((n: any) => (
              <article
                key={n.id}
                id={`noticia-${n.id}`}
                className={`surface-card overflow-hidden ${
                  destaqueId === n.id ? "ring-2 ring-primary" : ""
                }`}
              >
                {n.imagem_url && (
                  <img
                    src={n.imagem_url}
                    alt={n.titulo}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.fixado && (
                      <Badge variant="secondary" className="text-xs">
                        <Pin className="mr-1 h-3 w-3" />
                        Fixado
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.published_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold">{n.titulo}</h2>
                  {n.resumo && <p className="mt-1 text-sm text-muted-foreground">{n.resumo}</p>}
                  {n.conteudo && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{n.conteudo}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
