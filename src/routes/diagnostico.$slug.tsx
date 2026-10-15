import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticoRuntime } from "@/components/diagnostico-runtime";

export const Route = createFileRoute("/diagnostico/$slug")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { inicio?: boolean } => ({
    inicio: search.inicio === "1" || search.inicio === 1,
  }),
  head: () => ({
    meta: [
      { title: "Diagnóstico de Preparação — Instituto J&D" },
      { name: "description", content: "Responda algumas perguntas rápidas e descubra seu nível de preparação para a carreira judiciária." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => {
    const { slug } = Route.useParams();
    const { inicio } = Route.useSearch();
    return <DiagnosticoRuntime slug={slug} inicio={inicio} />;
  },
});
