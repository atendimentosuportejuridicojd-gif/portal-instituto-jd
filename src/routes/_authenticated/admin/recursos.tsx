import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [acoes, setAcoes] = useState<Record<string, string>>({});
  const [corretas, setCorretas] = useState<Record<string, string[]>>({});

  const q = useQuery({
    queryKey: ["admin", "recursos", status],
    queryFn: () => listar({ data: { status } }),
  });

  function acaoPadrao(r: any) {
    if (acoes[r.id]) return acoes[r.id];
    if (r.tipo === "anular_questao") return "anular";
    if (r.tipo === "alteracao_gabarito") return "alterar_gabarito";
    if (r.tipo === "multiplas_respostas") return "multiplas_respostas";
    return "nenhuma";
  }

  function selecionadas(r: any) {
    return (
      corretas[r.id] ??
      (r.questoes?.questao_alternativas ?? []).filter((a: any) => a.correta).map((a: any) => a.id)
    );
  }

  function alternar(r: any, altId: string, acao: string) {
    const atuais = selecionadas(r);
    const novas =
      acao === "alterar_gabarito"
        ? [altId]
        : atuais.includes(altId)
          ? atuais.filter((i: string) => i !== altId)
          : [...atuais, altId];
    setCorretas((p) => ({ ...p, [r.id]: novas }));
  }

  async function decidir(r: any, decisao: "deferido" | "indeferido") {
    const id = r.id;
    const acao = decisao === "deferido" ? acaoPadrao(r) : "nenhuma";
    const alternativas = selecionadas(r);
    if (decisao === "deferido" && acao !== "anular" && acao !== "nenhuma" && alternativas.length === 0) {
      toast.error("Marque a(s) alternativa(s) correta(s).");
      return;
    }
    try {
      const res: any = await responder({
        data: { id, status: decisao, resposta_admin: respostas[id] ?? "", acao, alternativas },
      });
      toast.success(
        decisao === "indeferido"
          ? "Recurso indeferido."
          : `Recurso deferido. Desempenho recalculado para ${res?.alunos_afetados ?? 0} aluno(s).`,
      );
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
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md border border-border/60 p-3">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Ação ao deferir (reflete no desempenho de todos os alunos)
                      </div>
                      <Select
                        value={acaoPadrao(r)}
                        onValueChange={(v) => setAcoes((p) => ({ ...p, [r.id]: v }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anular">Anular questão (todos passam a acertar)</SelectItem>
                          <SelectItem value="alterar_gabarito">Alterar gabarito</SelectItem>
                          <SelectItem value="multiplas_respostas">Aceitar múltiplas respostas</SelectItem>
                          <SelectItem value="nenhuma">Manter questão como está</SelectItem>
                        </SelectContent>
                      </Select>

                      {acaoPadrao(r) !== "anular" && acaoPadrao(r) !== "nenhuma" && (
                        <div className="mt-3 space-y-2">
                          {(r.questoes?.questao_alternativas ?? [])
                            .slice()
                            .sort((a: any, b: any) => a.ordem - b.ordem)
                            .map((a: any) => (
                              <label key={a.id} className="flex cursor-pointer items-start gap-2 text-sm">
                                <Checkbox
                                  checked={selecionadas(r).includes(a.id)}
                                  onCheckedChange={() => alternar(r, a.id, acaoPadrao(r))}
                                  className="mt-0.5"
                                />
                                <span>
                                  <span className="font-semibold">{a.letra})</span> {a.texto}
                                </span>
                              </label>
                            ))}
                        </div>
                      )}
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Resposta ao aluno (opcional)"
                      value={respostas[r.id] ?? ""}
                      onChange={(e) => setRespostas((p) => ({ ...p, [r.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decidir(r, "deferido")}>
                        Deferir e atualizar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decidir(r, "indeferido")}>
                        Indeferir
                      </Button>
                    </div>
                  </div>
                ) : (
                  (r.acao_aplicada || r.resposta_admin) && (
                    <div className="mt-4 rounded-md border border-border/60 p-3">
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Resposta do administrador
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{r.resposta_admin}</p>
                      {r.acao_aplicada && r.acao_aplicada !== "nenhuma" && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Ação aplicada: {r.acao_aplicada.replace(/_/g, " ")}
                          {r.alunos_afetados != null && ` · desempenho recalculado para ${r.alunos_afetados} aluno(s)`}
                        </p>
                      )}
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
