import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/trilhas")({
  head: () => ({ meta: [{ title: "Trilhas — Admin J&D" }] }),
  component: () => (
    <>
      <PageHeader title="Trilhas" description="Gerencie as trilhas de preparação." />
      <PageContent>
        <EmptyState icon={Target} title="Gestão de trilhas" description="Vinculação de materiais na Etapa 2." />
      </PageContent>
    </>
  ),
});
