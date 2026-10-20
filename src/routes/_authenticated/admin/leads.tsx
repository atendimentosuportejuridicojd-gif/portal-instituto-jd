import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  Flame,
  Gauge,
  Snowflake,
  MessageCircle,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { adminListLeadsDiagnostico } from "@/lib/leads-diagnostico.functions";
import {
  adminListPistasDiagnostico,
  adminCriarPistaDiagnostico,
  adminExcluirPistaDiagnostico,
  adminTogglePistaDiagnostico,
} from "@/lib/pistas-diagnostico.functions";

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

function linkWhatsApp(lead: { telefone: string; nome: string; origem?: string; carreira?: string | null }) {
  const primeiro = lead.nome.trim().split(/\s+/)[0] || "tudo bem";
  let texto: string;
  if (lead.origem === "meta_form") {
    const carreiraDefinida = lead.carreira && !/ainda n[aã]o defini/i.test(lead.carreira.replace(/_/g, " "));
    texto = carreiraDefinida
      ? `Olá, ${primeiro}! Aqui é do Instituto J&D. Vi que você preencheu nosso formulário e escolheu a carreira ${lead.carreira!.replace(/_/g, " ")}. Posso te ajudar com os próximos passos?`
      : `Olá, ${primeiro}! Aqui é do Instituto J&D. Vi que você preencheu nosso formulário. Posso te ajudar com os próximos passos?`;
  } else {
    texto = `Olá, ${primeiro}! Aqui é do Instituto J&D. Vi que você fez nosso diagnóstico de preparação para a carreira judiciária — posso te ajudar a dar o próximo passo?`;
  }
  return `https://wa.me/${telefoneInternacional(lead.telefone)}?text=${encodeURIComponent(texto)}`;
}

const ORIGEM_LABEL: Record<string, string> = {
  diagnostico: "Diagnóstico",
  meta_form: "Formulário Meta",
};

function resumoLead(lead: any): string {
  if (lead.origem === "meta_form") {
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

function linkPublico(slug: string) {
  if (slug === "trt8") return "institutojd.ia.br/diagnostico-trt8";
  if (slug === "erro_concurseiro") return "institutojd.ia.br/diagnostico";
  return `institutojd.ia.br/diagnostico/${slug}`;
}

function Leads() {
  return (
    <>
      <PageHeader
        rotulo="Marketing"
        title="Leads Qualificados"
        description="Respostas do Diagnóstico de Preparação e as pistas (versões do quiz) disponíveis."
        icone={UserCheck}
      />
      <PageContent>
        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="pistas">Pistas</TabsTrigger>
          </TabsList>
          <TabsContent value="leads">
            <AbaLeads />
          </TabsContent>
          <TabsContent value="pistas">
            <AbaPistas />
          </TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}

function AbaLeads() {
  const listFn = useServerFn(adminListLeadsDiagnostico);
  const pistasFn = useServerFn(adminListPistasDiagnostico);
  const [pista, setPista] = useState<string>("todas");
  const [segmento, setSegmento] = useState<"todos" | "quente" | "morno" | "frio">("todos");
  const [origem, setOrigem] = useState<"todas" | "diagnostico" | "meta_form">("todas");

  const pistasQuery = useQuery({ queryKey: ["admin", "pistas-diagnostico"], queryFn: () => pistasFn() });
  const query = useQuery({
    queryKey: ["admin", "leads-diagnostico", pista, segmento, origem],
    queryFn: () => listFn({ data: { pista: pista === "todas" ? "todas" : (pista as any), segmento, origem } }),
  });

  const leads = query.data ?? [];
  const pistas = pistasQuery.data ?? [];
  const nomePista = (slug: string) => pistas.find((p: any) => p.slug === slug)?.nome ?? slug;

  const contagem = {
    total: leads.length,
    quente: leads.filter((l: any) => l.segmento === "quente").length,
    morno: leads.filter((l: any) => l.segmento === "morno").length,
    frio: leads.filter((l: any) => l.segmento === "frio").length,
  };

  return (
    <div className="mt-4">
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
            <SelectItem value="diagnostico">Diagnóstico</SelectItem>
            <SelectItem value="meta_form">Formulário Meta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pista} onValueChange={setPista}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Pista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as pistas</SelectItem>
            {pistas.map((p: any) => (
              <SelectItem key={p.slug} value={p.slug}>{p.nome}</SelectItem>
            ))}
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
            description="Ainda não há respostas do Diagnóstico com esse filtro."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Pista</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">{lead.pista ? nomePista(lead.pista) : "—"}</TableCell>
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
    </div>
  );
}

function slugify(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type OpcaoForm = { label: string; pontos: number };
type PerguntaPerfilForm = { pergunta: string; opcoes: OpcaoForm[] };
type QuestaoForm = { pergunta: string; opcoes: string[]; gabarito: number };
type MensagemForm = { titulo: string; subtitulo: string; cta_label: string; cta_acao: "teste_gratis" | "guia_gratuito" | "nenhum" };

function perguntaVazia(): PerguntaPerfilForm {
  return { pergunta: "", opcoes: [{ label: "", pontos: 2 }, { label: "", pontos: 1 }, { label: "", pontos: 0 }, { label: "", pontos: 0 }] };
}
function questaoVazia(): QuestaoForm {
  return { pergunta: "", opcoes: ["", "", "", ""], gabarito: 0 };
}
function formVazio() {
  return {
    slug: "",
    nome: "",
    concurso: "",
    gancho_titulo: "",
    gancho_subtexto: "",
    cta_texto: "Fazer o diagnóstico",
    perguntas_perfil: [perguntaVazia()],
    questao1: questaoVazia(),
    questao2: questaoVazia(),
    mensagens: {
      quente: { titulo: "", subtitulo: "", cta_label: "Começar meu teste grátis de 5 dias", cta_acao: "teste_gratis" } as MensagemForm,
      morno: { titulo: "", subtitulo: "", cta_label: "Baixar guia gratuito", cta_acao: "guia_gratuito" } as MensagemForm,
      frio: { titulo: "Ainda é cedo — e está tudo bem.", subtitulo: "", cta_label: "Conhecer o Instituto J&D", cta_acao: "nenhum" } as MensagemForm,
    },
  };
}

const LETRAS = ["a", "b", "c", "d", "e", "f"];

function AbaPistas() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPistasDiagnostico);
  const criarFn = useServerFn(adminCriarPistaDiagnostico);
  const excluirFn = useServerFn(adminExcluirPistaDiagnostico);
  const toggleFn = useServerFn(adminTogglePistaDiagnostico);

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(formVazio());
  const [excluindo, setExcluindo] = useState<{ id: string; nome: string } | null>(null);

  const query = useQuery({ queryKey: ["admin", "pistas-diagnostico"], queryFn: () => listFn() });

  const criar = useMutation({
    mutationFn: () => {
      const payload = {
        slug: form.slug.trim() || slugify(form.nome),
        nome: form.nome,
        concurso: form.concurso || undefined,
        gancho_titulo: form.gancho_titulo,
        gancho_subtexto: form.gancho_subtexto,
        cta_texto: form.cta_texto,
        perguntas_perfil: form.perguntas_perfil.map((p, i) => ({
          campo: slugify(p.pergunta) || `pergunta_${i}`,
          pergunta: p.pergunta,
          opcoes: p.opcoes.filter((o) => o.label.trim()).map((o, j) => ({ valor: `op_${j}`, label: o.label, pontos: o.pontos })),
        })),
        questao1: {
          pergunta: form.questao1.pergunta,
          opcoes: form.questao1.opcoes.map((label, i) => ({ valor: LETRAS[i], label })),
          gabarito: LETRAS[form.questao1.gabarito],
        },
        questao2: {
          pergunta: form.questao2.pergunta,
          opcoes: form.questao2.opcoes.map((label, i) => ({ valor: LETRAS[i], label })),
          gabarito: LETRAS[form.questao2.gabarito],
        },
        mensagens: form.mensagens,
      };
      return criarFn({ data: payload as any });
    },
    onSuccess: () => {
      toast.success("Pista criada.");
      qc.invalidateQueries({ queryKey: ["admin", "pistas-diagnostico"] });
      setAberto(false);
      setForm(formVazio());
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível criar a pista."),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Pista excluída.");
      qc.invalidateQueries({ queryKey: ["admin", "pistas-diagnostico"] });
      setExcluindo(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível excluir."),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pistas-diagnostico"] }),
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível atualizar."),
  });

  const pistas = query.data ?? [];

  const atualizarPergunta = (i: number, patch: Partial<PerguntaPerfilForm>) =>
    setForm((f) => ({ ...f, perguntas_perfil: f.perguntas_perfil.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  const atualizarOpcao = (i: number, j: number, patch: Partial<OpcaoForm>) =>
    setForm((f) => ({
      ...f,
      perguntas_perfil: f.perguntas_perfil.map((p, idx) =>
        idx === i ? { ...p, opcoes: p.opcoes.map((o, oj) => (oj === j ? { ...o, ...patch } : o)) } : p,
      ),
    }));

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cada pista é uma versão do Diagnóstico, com seu próprio gancho e perguntas.</p>
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" onClick={() => setForm(formVazio())}>
              <Plus className="h-4 w-4" /> Nova pista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova pista do Diagnóstico</DialogTitle>
              <DialogDescription>Defina o gancho, as perguntas de perfil, as 2 questões de conhecimento e as mensagens de resultado.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Identificação</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome (uso interno)</Label>
                    <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Diagnóstico MP-SC" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slug da URL (opcional — gerado do nome)</Label>
                    <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="mp-sc" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Concurso vinculado (opcional)</Label>
                  <Input value={form.concurso} onChange={(e) => setForm((f) => ({ ...f, concurso: e.target.value }))} placeholder="Ex.: mp-sc" />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Tela de gancho</h3>
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Textarea value={form.gancho_titulo} onChange={(e) => setForm((f) => ({ ...f, gancho_titulo: e.target.value }))} rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtítulo</Label>
                  <Textarea value={form.gancho_subtexto} onChange={(e) => setForm((f) => ({ ...f, gancho_subtexto: e.target.value }))} rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Texto do botão</Label>
                  <Input value={form.cta_texto} onChange={(e) => setForm((f) => ({ ...f, cta_texto: e.target.value }))} />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">Perguntas de perfil</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setForm((f) => ({ ...f, perguntas_perfil: [...f.perguntas_perfil, perguntaVazia()] }))}
                  >
                    <Plus className="h-3.5 w-3.5" /> Pergunta
                  </Button>
                </div>
                {form.perguntas_perfil.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-2">
                      <Input
                        className="flex-1"
                        placeholder="Pergunta"
                        value={p.pergunta}
                        onChange={(e) => atualizarPergunta(i, { pergunta: e.target.value })}
                      />
                      {form.perguntas_perfil.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => setForm((f) => ({ ...f, perguntas_perfil: f.perguntas_perfil.filter((_, idx) => idx !== i) }))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      {p.opcoes.map((o, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <Input
                            className="flex-1"
                            placeholder={`Opção ${j + 1}`}
                            value={o.label}
                            onChange={(e) => atualizarOpcao(i, j, { label: e.target.value })}
                          />
                          <Select value={String(o.pontos)} onValueChange={(v) => atualizarOpcao(i, j, { pontos: Number(v) })}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 pontos</SelectItem>
                              <SelectItem value="1">1 ponto</SelectItem>
                              <SelectItem value="2">2 pontos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              {([1, 2] as const).map((n) => {
                const chave = n === 1 ? "questao1" : "questao2";
                const q = form[chave];
                return (
                  <section key={chave} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">Questão de conhecimento {n}</h3>
                    <Textarea
                      placeholder="Pergunta"
                      value={q.pergunta}
                      rows={2}
                      onChange={(e) => setForm((f) => ({ ...f, [chave]: { ...f[chave], pergunta: e.target.value } }))}
                    />
                    <div className="space-y-2">
                      {q.opcoes.map((op, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, [chave]: { ...f[chave], gabarito: i } }))}
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border text-xs font-bold uppercase ${
                              q.gabarito === i ? "border-emerald-500 bg-emerald-500/15 text-emerald-600" : "border-border text-muted-foreground"
                            }`}
                            title="Marcar como correta"
                          >
                            {LETRAS[i]}
                          </button>
                          <Input
                            className="flex-1"
                            placeholder={`Alternativa ${LETRAS[i].toUpperCase()}`}
                            value={op}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                [chave]: { ...f[chave], opcoes: f[chave].opcoes.map((o, oi) => (oi === i ? e.target.value : o)) },
                              }))
                            }
                          />
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">Clique na letra pra marcar a alternativa correta.</p>
                    </div>
                  </section>
                );
              })}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Mensagens de resultado</h3>
                {(["quente", "morno", "frio"] as const).map((seg) => (
                  <div key={seg} className="rounded-lg border border-border p-4">
                    <Badge className={SEGMENTO_CONFIG[seg].className}>{SEGMENTO_CONFIG[seg].label}</Badge>
                    <div className="mt-3 space-y-2">
                      <Input
                        placeholder="Título"
                        value={form.mensagens[seg].titulo}
                        onChange={(e) => setForm((f) => ({ ...f, mensagens: { ...f.mensagens, [seg]: { ...f.mensagens[seg], titulo: e.target.value } } }))}
                      />
                      <Input
                        placeholder="Subtítulo (opcional)"
                        value={form.mensagens[seg].subtitulo}
                        onChange={(e) => setForm((f) => ({ ...f, mensagens: { ...f.mensagens, [seg]: { ...f.mensagens[seg], subtitulo: e.target.value } } }))}
                      />
                      <div className="flex gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Texto do botão"
                          value={form.mensagens[seg].cta_label}
                          onChange={(e) => setForm((f) => ({ ...f, mensagens: { ...f.mensagens, [seg]: { ...f.mensagens[seg], cta_label: e.target.value } } }))}
                        />
                        <Select
                          value={form.mensagens[seg].cta_acao}
                          onValueChange={(v) => setForm((f) => ({ ...f, mensagens: { ...f.mensagens, [seg]: { ...f.mensagens[seg], cta_acao: v as any } } }))}
                        >
                          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="teste_gratis">Leva ao teste grátis</SelectItem>
                            <SelectItem value="guia_gratuito">Leva ao guia grátis</SelectItem>
                            <SelectItem value="nenhum">Sem oferta (só institucional)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button onClick={() => criar.mutate()} disabled={criar.isPending || !form.nome || !form.gancho_titulo}>
                {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar pista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        {query.isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pistas.length === 0 ? (
          <EmptyState icon={UserCheck} title="Nenhuma pista criada" description="Crie a primeira pista do Diagnóstico." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Link público</TableHead>
                <TableHead>Concurso</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pistas.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{linkPublico(p.slug)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.concurso ?? "—"}</TableCell>
                  <TableCell>
                    <Switch checked={p.ativo} onCheckedChange={(v) => toggle.mutate({ id: p.id, ativo: v })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setExcluindo({ id: p.id, nome: p.nome })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir pista "{excluindo?.nome}"?</DialogTitle>
            <DialogDescription>
              A página deixa de funcionar imediatamente. Os leads já capturados por ela continuam no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => excluindo && excluir.mutate(excluindo.id)} disabled={excluir.isPending}>
              {excluir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
