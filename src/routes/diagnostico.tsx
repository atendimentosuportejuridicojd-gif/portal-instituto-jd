import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticoRuntime } from "@/components/diagnostico-runtime";

export const Route = createFileRoute("/diagnostico")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { inicio?: boolean } =>
    search.inicio === "1" || search.inicio === 1 ? { inicio: true } : {},
  head: () => ({
    meta: [
      { title: "O erro de todo concurseiro — Instituto J&D" },
      {
        name: "description",
        content: "Erro de todo concurseiro: estudar só quando o edital sai. Responda 6 perguntas e descubra se você está cometendo esse erro.",
      },
      { property: "og:title", content: "O erro de todo concurseiro" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => {
    const { inicio } = Route.useSearch();
    return <DiagnosticoRuntime slug="erro_concurseiro" inicio={inicio} />;
  },
});
