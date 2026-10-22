import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserCheck, Flame, Gauge, Snowflake, MessageCircle, Loader2 } from "lucide-react";
import { adminListLeadsDiagnostico } from "@/lib/leads-diagnostico.functions";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({ meta: [{ title: "Leads Qualificados — Admin J&D" }] }),
  component: Leads,
});

const SEGMENTO_CONFIG: Record<string, { label: string; className: string }> = {
  quente: { label: "Quente", className: "border-transparent bg-red-500/15 text-red-600 dark:text-red-400" },
  morno: { label: "Morno", className: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  frio: { label: "Frio", className: "border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400" },
};

function telefoneInternacional(telefone: string) {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") ? d : `55${d}`;
}

/** Leads de formulário (Meta, Google ou do site) têm as 4 respostas em colunas; o Diagnóstico não. */
function ehFormulario(origem?: string) {
  return origem === "meta_form" || origem === "google_form" || origem === "site_form";
}

function linkWhatsApp(lead: { telefone: string; nome: string; origem?: string; carreira?: string | null }) {
  const primeiro = lead.nome.trim().split(/\s+/)[0] || "tudo bem";
  let texto: string;
  if (ehFormulario(lead.origem)) {
    const carreiraDefinida = lead.carreira && !/ainda n[aã]o defini/i.test(lead.carreira.replace(/_/g, " "));
    texto = carreiraDefinida
      ? `Olá, ${primeiro}! Aqui é da equipe do Instituto J&D.\n\nVi que você preencheu nosso formulário e tem foco na carreira ${lead.carreira!.replace(/_/g, " ")}. Vamos te ajudar com os próximos passos!\n\nVocê já tem algum concurso em vista que tenha interesse em fazer? Se sim, qual o cargo?`
      : `Olá, ${primeiro}! Aqui é da equipe do Instituto J&D.\n\nVi que você preencheu nosso formulário. Vamos te ajudar com os próximos passos!\n\nVocê já tem algum concurso em vista que tenha interesse em prestar ou ainda está decidindo qual área e cargo seguir?`;
  } else {
    texto = `Olá, ${primeiro}! Aqui é do Instituto J&D. Vi que você fez nosso diagnóstico de preparação para a carreira judiciária — posso te ajudar a dar o próximo passo?`;
  }
  return `https://wa.me/${telefoneInternacional(lead.telefone)}?text=${encodeURIComponent(texto)}`;
}

const ORIGEM_LABEL: Record<string, string> = {
  diagnostico: "Diagnóstico",
  meta_form: "Formulário Meta",
  google_form: "Formulário Google",
  site_form: "Formulário do site",
};

function resumoLead(lead: any): string {
  if (ehFormulario(lead.origem)) {
    return [lead.carreira, lead.como_estuda, lead.horas_dia, lead.prazo_prova].filter(Boolean).join(" · ") || "—";
  }
  return resumoRespostas(lead.respostas);
}

function resumoRespostas(respostas: Record<string, unknown>): string {
  const ignorar = new Set(["questao1", "questao2", "fechamento"]);
  const partes = Object.entries(respostas ?? {})
    .filter(([k, v]) => !ignorar.has(k) && v)
    .map(([, v]) => String(v).replace(/_/g, " "));
  return partes.join(" · ") || "—";
}

function Leads() {
  const listFn = useServerFn(adminListLeadsDiagnostico);
  const [segmento, setSegmento] = useState<"todos" | "quente" | "morno" | "frio">("todos");
  const [origem, setOrigem] = useState<"todas" | "meta_form" | "google_form" | "site_form">("todas");

  const query = useQuery({
    queryKey: ["admin", "leads-diagnostico", segmento, origem],
    queryFn: () => listFn({ data: { segmento, origem } }),
  });

  const leads = query.data ?? [];

  const contagem = {
    total: leads.length,
    quente: leads.filter((l: any) => l.segmento === "quente").length,
    morno: leads.filter((l: any) => l.segmento === "morno").length,
    frio: leads.filter((l: any) => l.segmento === "frio").length,
  };

  return (
    <>
      <PageHeader
        rotulo="Marketing"
        title="Leads Qualificados"
        description="Leads dos formulários de anúncio, classificados em quente, morno e frio."
        icone={UserCheck}
      />
      <PageContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="mt-1 text-2xl font-bold">{contagem.total}</p>
              </div>
              <Gauge className="h-7 w-7 text-muted-foreground/50" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400">Quentes</p>
                <p className="mt-1 text-2xl font-bold">{contagem.quente}</p>
              </div>
              <Flame className="h-7 w-7 text-red-500/50" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">Mornos</p>
                <p className="mt-1 text-2xl font-bold">{contagem.morno}</p>
              </div>
              <Gauge className="h-7 w-7 text-amber-500/50" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">Frios</p>
                <p className="mt-1 text-2xl font-bold">{contagem.frio}</p>
              </div>
              <Snowflake className="h-7 w-7 text-sky-500/50" />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Select value={origem} onValueChange={(v) => setOrigem(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as origens</SelectItem>
              <SelectItem value="meta_form">Formulário Meta</SelectItem>
              <SelectItem value="google_form">Formulário Google</SelectItem>
              <SelectItem value="site_form">Formulário do site</SelectItem>
            </SelectContent>
          </Select>
          <Select value={segmento} onValueChange={(v) => setSegmento(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os segmentos</SelectItem>
              <SelectItem value="quente">Quente</SelectItem>
              <SelectItem value="morno">Morno</SelectItem>
              <SelectItem value="frio">Frio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          {query.isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Nenhum lead encontrado"
              description="Ainda não há leads com esse filtro."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-center">Pontuação</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: any) => {
                  const seg = SEGMENTO_CONFIG[lead.segmento] ?? SEGMENTO_CONFIG.frio;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ORIGEM_LABEL[lead.origem] ?? lead.origem}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={resumoLead(lead)}>
                        {resumoLead(lead)}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{lead.pontuacao} pts</TableCell>
                      <TableCell>
                        <Badge className={seg.className}>{seg.label}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(lead.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-right">
                        {lead.telefone ? (
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <a href={linkWhatsApp(lead)} target="_blank" rel="noreferrer">
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{lead.email ?? "sem contato"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </PageContent>
    </>
  );
}
