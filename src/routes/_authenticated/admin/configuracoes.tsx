import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Admin J&D" }] }),
  component: () => (
    <>
      <PageHeader title="Configurações" description="Ajustes gerais da plataforma." />
      <PageContent>
        <EmptyState icon={Settings} title="Em breve" description="Integrações e configurações na Etapa 4." />
      </PageContent>
    </>
  ),
});
