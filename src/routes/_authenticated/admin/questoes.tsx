import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/questoes")({
  head: () => ({ meta: [{ title: "Questões — Admin J&D" }] }),
  component: () => (
    <>
      <PageHeader title="Questões" description="Banco de questões da plataforma." />
      <PageContent>
        <EmptyState icon={HelpCircle} title="Sistema de Questões" description="Cadastro e estatísticas na Etapa 3." />
      </PageContent>
    </>
  ),
});
