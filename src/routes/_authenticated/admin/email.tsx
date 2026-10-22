import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Inbox, Mail, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { PageContent, PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminListUsuarios } from "@/lib/admin-users.functions";
import { adminEnviarEmail, adminListarEventosEmail } from "@/lib/admin-email.functions";
import { CARREIRAS } from "@/lib/carreiras";

export const Route = createFileRoute("/_authenticated/admin/email")({
  head: () => ({ meta: [{ title: "E-mail — Admin J&D" }] }),
  component: EmailAdmin,
});

type Dest = { email: string; nome?: string };

const MAX = 30;

const EVENTO: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregue",
  bounced: "Devolvido",
  complaint: "Marcado como spam",
  unsubscribed: "Descadastrado",
  failed: "Falhou",
};

function EmailAdmin() {
  const listFn = useServerFn(adminListUsuarios);
  const enviarFn = useServerFn(adminEnviarEmail);
  const eventosFn = useServerFn(adminListarEventosEmail);

  const [q, setQ] = useState("");
  const [carreira, setCarreira] = useState("todas");
  const [sel, setSel] = useState<Dest[]>([]);
  const [avulso, setAvulso] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("Olá, {nome}!\n\n");

  const usuarios = useQuery({
    queryKey: ["admin", "email", "usuarios", q],
    queryFn: () => listFn({ data: { q } }),
  });
  const eventos = useQuery({
    queryKey: ["admin", "email", "eventos"],
    queryFn: () => eventosFn({ data: { destinatario: "" } }),
    refetchInterval: 30_000,
  });

  const lista = (usuarios.data ?? []).filter((u: any) => (carreira === "todas" ? true : u.carreira === carreira));
  const marcado = (email: string) => sel.some((d) => d.email.toLowerCase() === email.toLowerCase());

  const alternar = (u: any) =>
    setSel((atual) => {
      if (marcado(u.email)) return atual.filter((d) => d.email.toLowerCase() !== u.email.toLowerCase());
      if (atual.length >= MAX) {
        toast.error(`Máximo de ${MAX} destinatários por envio.`);
        return atual;
      }
      return [...atual, { email: u.email, nome: u.nome_completo ?? undefined }];
    });

  const adicionarAvulso = () => {
    const email = avulso.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Digite um e-mail válido.");
    if (!marcado(email)) {
      if (sel.length >= MAX) return toast.error(`Máximo de ${MAX} destinatários por envio.`);
      setSel((a) => [...a, { email }]);
    }
    setAvulso("");
  };

  const enviar = useMutation({
    mutationFn: () => enviarFn({ data: { destinatarios: sel, assunto, mensagem } }),
    onSuccess: (r) => {
      const ok = r.resultados.filter((x) => x.ok).length;
      const falhas = r.resultados.filter((x) => !x.ok);
      if (ok) toast.success(`${ok} e-mail(s) enviado(s).`);
      if (falhas.length) toast.error(`Falhou para: ${falhas.map((f) => f.email).join(", ")}. ${falhas[0].erro ?? ""}`);
      if (!falhas.length) {
        setSel([]);
        setAssunto("");
        setMensagem("Olá, {nome}!\n\n");
      }
      eventos.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pronto = sel.length > 0 && assunto.trim().length >= 3 && mensagem.trim().length >= 3;

  return (
    <>
      <PageHeader
        title="E-mail"
        description="Envie e-mails de contato a alunos e leads, e acompanhe a entrega."
        icone={Mail}
        actions={
          <Button asChild variant="outline">
            <a
              href="https://mail.google.com/mail/u/atendimento.suportejuridicojd@gmail.com/#inbox"
              target="_blank"
              rel="noreferrer"
            >
              <Inbox className="mr-2 h-4 w-4" />
              Abrir caixa de entrada
            </a>
          </Button>
        }
      />
      <PageContent>
        <Tabs defaultValue="escrever">
          <TabsList>
            <TabsTrigger value="escrever">Escrever</TabsTrigger>
            <TabsTrigger value="enviados">Enviados e entrega</TabsTrigger>
          </TabsList>

          <TabsContent value="escrever" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              {/* Destinatários */}
              <div className="surface-card space-y-3 p-4">
                <h2 className="text-sm font-semibold">Destinatários ({sel.length}/{MAX})</h2>
                {sel.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sel.map((d) => (
                      <Badge key={d.email} variant="secondary" className="gap-1">
                        {d.nome ? `${d.nome.split(" ")[0]} · ` : ""}
                        {d.email}
                        <button
                          type="button"
                          aria-label={`Remover ${d.email}`}
                          onClick={() => setSel((a) => a.filter((x) => x.email !== d.email))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Adicionar outro e-mail (ex.: um lead)"
                    value={avulso}
                    onChange={(e) => setAvulso(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarAvulso())}
                  />
                  <Button type="button" variant="outline" onClick={adicionarAvulso}>
                    Adicionar
                  </Button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar aluno por nome, e-mail ou telefone…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {[{ id: "todas", nome: "Todas" }, ...CARREIRAS.map((c) => ({ id: c.id as string, nome: c.nome.replace("Carreira ", "") }))].map(
                    (c) => (
                      <Button
                        key={c.id}
                        size="sm"
                        variant={carreira === c.id ? "secondary" : "ghost"}
                        className="h-7"
                        onClick={() => setCarreira(c.id)}
                      >
                        {c.nome}
                      </Button>
                    ),
                  )}
                </div>
                <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
                  {lista.length === 0 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      {usuarios.isLoading ? "Carregando…" : "Nenhum aluno encontrado."}
                    </p>
                  )}
                  {lista.map((u: any) => (
                    <label key={u.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                      <Checkbox checked={marcado(u.email)} onCheckedChange={() => alternar(u)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{u.nome_completo || "—"}</span>
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      </span>
                      {u.carreira && (
                        <Badge variant="outline" className="shrink-0">
                          {CARREIRAS.find((c) => c.id === u.carreira)?.nome.replace("Carreira ", "") ?? u.carreira}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Mensagem */}
              <div className="surface-card space-y-3 p-4">
                <h2 className="text-sm font-semibold">Mensagem</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input id="assunto" value={assunto} maxLength={150} onChange={(e) => setAssunto(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mensagem">Texto</Label>
                  <Textarea
                    id="mensagem"
                    rows={12}
                    value={mensagem}
                    maxLength={10000}
                    onChange={(e) => setMensagem(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use <code>{"{nome}"}</code> para inserir o primeiro nome de cada pessoa. Linha em branco separa
                    parágrafos. O e-mail sai com a marca do Instituto J&D e as respostas chegam no Gmail de atendimento
                    (botão "Abrir caixa de entrada", no topo).
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Cada pessoa recebe o seu próprio e-mail, sem ver os outros destinatários.
                  </p>
                  <Button disabled={!pronto || enviar.isPending} onClick={() => enviar.mutate()}>
                    <Send className="mr-2 h-4 w-4" />
                    {enviar.isPending ? "Enviando…" : `Enviar${sel.length ? ` (${sel.length})` : ""}`}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="enviados" className="mt-4">
            <div className="surface-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Evento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(eventos.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                        {eventos.isLoading
                          ? "Carregando…"
                          : eventos.isError
                            ? "Não foi possível carregar o histórico de entrega."
                            : "Nenhum evento nos últimos 30 dias."}
                      </TableCell>
                    </TableRow>
                  )}
                  {(eventos.data ?? []).map((e: any, i: number) => (
                    <TableRow key={`${e.message_id}-${e.event_type}-${i}`}>
                      <TableCell className="text-muted-foreground">
                        {new Date(e.timestamp).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>{e.recipient}</TableCell>
                      <TableCell>
                        <Badge
                          variant={["bounced", "complaint", "failed"].includes(e.event_type) ? "destructive" : "secondary"}
                        >
                          {EVENTO[e.event_type] ?? e.event_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Inclui também os e-mails automáticos do portal (cadastro, senha). Últimos 30 dias.
            </p>
          </TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}
