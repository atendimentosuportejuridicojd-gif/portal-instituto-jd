import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/acervo")({
  head: () => ({ meta: [{ title: "Acervo Base — Portal J&D" }] }),
  component: () => (
    <>
      <PageHeader
        title="Acervo Base"
        description="Biblioteca principal organizada por disciplinas."
      />
      <PageContent>
        <EmptyState
          icon={BookOpen}
          title="Acervo em preparação"
          description="Os materiais serão publicados nas próximas etapas do projeto."
        />
      </PageContent>
    </>
  ),
});
