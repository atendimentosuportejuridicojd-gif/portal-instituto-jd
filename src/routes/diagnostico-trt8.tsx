import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticoRuntime } from "@/components/diagnostico-runtime";

export const Route = createFileRoute("/diagnostico-trt8")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { inicio?: boolean } => ({
    inicio: search.inicio === "1" || search.inicio === 1,
  }),
  head: () => ({
    meta: [
      { title: "Diagnóstico: você está preparado para o TRT8? — Instituto J&D" },
      {
        name: "description",
        content: "Responda 6 perguntas rápidas e descubra seu nível de preparação para o concurso do TRT8 2026.",
      },
      { property: "og:title", content: "Diagnóstico: você está preparado para o TRT8?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => {
    const { inicio } = Route.useSearch();
    return <DiagnosticoRuntime slug="trt8" inicio={inicio} />;
  },
});
