import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/acervo")({
  head: () => ({ meta: [{ title: "Acervo — Admin J&D" }] }),
  component: () => (
    <>
      <PageHeader title="Acervo Base" description="Gerencie disciplinas, módulos e materiais." />
      <PageContent>
        <EmptyState
          icon={BookOpen}
          title="Gestão do acervo"
          description="Upload de PDFs, disciplinas e módulos serão implementados na Etapa 2."
        />
      </PageContent>
    </>
  ),
});
