import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/concursos")({
  head: () => ({ meta: [{ title: "Concursos — Portal J&D" }] }),
  component: () => (
    <>
      <PageHeader
        title="Concursos Específicos"
        description="Materiais organizados por edital."
      />
      <PageContent>
        <EmptyState
          icon={FileText}
          title="Nenhum concurso cadastrado"
          description="O administrador poderá cadastrar concursos nas próximas etapas."
        />
      </PageContent>
    </>
  ),
});
