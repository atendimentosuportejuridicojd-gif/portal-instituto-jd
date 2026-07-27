import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/concursos")({
  head: () => ({ meta: [{ title: "Concursos — Admin J&D" }] }),
  component: () => (
    <>
      <PageHeader title="Concursos" description="Cadastre editais específicos." />
      <PageContent>
        <EmptyState icon={FileText} title="Gestão de concursos" description="Cadastro completo na Etapa 2." />
      </PageContent>
    </>
  ),
});
