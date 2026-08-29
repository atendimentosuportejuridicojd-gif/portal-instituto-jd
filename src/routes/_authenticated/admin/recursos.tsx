import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gavel } from "lucide-react";
import { toast } from "sonner";
import { adminListRecursos, adminResponderRecurso } from "@/lib/recursos.functions";
import { TIPOS_RECURSO } from "@/lib/recursos";

export const Route = createFileRoute("/_authenticated/admin/recursos")({
  head: () => ({
    meta: [
      { title: "Recursos das questões — Admin J&D" },
      { name: "description", content: "Avalie os recursos abertos pelos alunos nas questões." },
    ],
  }),
  component: AdminRecursos,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  deferido: "Deferido",
  indeferido: "Indeferido",
};

function AdminRecursos() {
  const listar = useServerFn(adminListRecursos);
  const responder = useServerFn(adminResponderRecurso);
  const [status, setStatus] = useState<"pendente" | "deferido" | "indeferido" | "todos">("pendente");
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["admin", "recursos", status],
    queryFn: () => listar({ data: { status } }),
  });

  async function decidir(id: string, decisao: "deferido" | "indeferido") {
    try {
      await responder({ data: { id, status: decisao, resposta_admin: respostas[id] ?? "" } });
      toast.success(decisao === "deferido" ? "Recurso deferido." : "Recurso indeferido.");
      q.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar decisão.");
    }
  }

  const itens = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Recursos das questões"
        description="Pedidos de múltiplas respostas, alteração de gabarito e anulação enviados pelos alunos."
      />
      <PageContent>
        <Tabs value={status} onValueChange={(v) => setStatus(v as any)} className="mb-5">
          <TabsList>
            <TabsTrigger value="pendente">Pendentes</TabsTrigger>
            <TabsTrigger value="deferido">Deferidos</TabsTrigger>
            <TabsTrigger value="indeferido">Indeferidos</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : itens.length === 0 ? (
          <EmptyState icon={Gavel} title="Nenhum recurso" description="Não há recursos nesta situação." />
        ) : (
          <div className="space-y-4">
            {itens.map((r: any) => (
              <div key={r.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{TIPOS_RECURSO[r.tipo as keyof typeof TIPOS_RECURSO]}</Badge>
                  <Badge variant={r.status === "pendente" ? "secondary" : "outline"}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium">
                  {r.aluno || r.aluno_email}
                  {r.aluno_email && <span className="text-muted-foreground"> · {r.aluno_email}</span>}
                </p>
                <div className="mt-3 rounded-md border border-border/60 bg-muted/30 p-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {r.materiais?.titulo ?? "Material"} · {r.questoes?.referencia ?? "sem referência"}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{r.questoes?.enunciado}</p>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Fundamentação do aluno
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{r.fundamentacao}</p>
                </div>

                {r.status === "pendente" ? (
                  <div className="mt-4 space-y-2">
                    <Textarea
                      rows={3}
                      placeholder="Resposta ao aluno (opcional)"
                      value={respostas[r.id] ?? ""}
                      onChange={(e) => setRespostas((p) => ({ ...p, [r.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decidir(r.id, "deferido")}>
                        Deferir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decidir(r.id, "indeferido")}>
                        Indeferir
                      </Button>
                    </div>
                  </div>
                ) : (
                  r.resposta_admin && (
                    <div className="mt-4 rounded-md border border-border/60 p-3">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Resposta do administrador
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{r.resposta_admin}</p>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
