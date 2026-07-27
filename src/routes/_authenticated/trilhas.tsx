import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader } from "@/components/page";
import { Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trilhas")({
  head: () => ({ meta: [{ title: "Trilhas — Portal J&D" }] }),
  component: () => (
    <>
      <PageHeader
        title="Trilhas de Preparação"
        description="Organização de estudos por cargo."
      />
      <PageContent>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { nome: "Técnico Judiciário", desc: "Trilha completa para cargos técnicos." },
            { nome: "Analista Judiciário", desc: "Trilha completa para cargos de analista." },
          ].map((t) => (
            <div key={t.nome} className="surface-card p-6">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{t.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </PageContent>
    </>
  ),
});
