import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/noticias")({
  head: () => ({ meta: [{ title: "Notícias — Admin J&D" }] }),
  component: () => (
    <>
      <PageHeader title="Notícias" description="Publicações da seção Fique por Dentro." />
      <PageContent>
        <EmptyState icon={Newspaper} title="Editor de notícias" description="Publicação de notícias na Etapa 2." />
      </PageContent>
    </>
  ),
});
