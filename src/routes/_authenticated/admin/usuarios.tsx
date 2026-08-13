import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader } from "@/components/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Lock, Unlock, Mail, Pencil, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  adminListUsuarios,
  adminEditarUsuario,
  adminBloquearUsuario,
  adminResetSenhaUsuario,
  adminDefinirRoles,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Admin J&D" }] }),
  component: Usuarios,
});

function Usuarios() {
  const listFn = useServerFn(adminListUsuarios);
  const editFn = useServerFn(adminEditarUsuario);
  const blockFn = useServerFn(adminBloquearUsuario);
  const resetFn = useServerFn(adminResetSenhaUsuario);
  const rolesFn = useServerFn(adminDefinirRoles);

  const roleMut = useMutation({
    mutationFn: (v: {
      id: string;
      roles: string[];
      dias_teste?: number;
      reiniciar_teste?: boolean;
    }) => rolesFn({ data: v as any }),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setEditing(null);
      toast.success("Funções atualizadas.");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"ativa" | "sem" | "todos">("todos");
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [blockDialog, setBlockDialog] = useState<any | null>(null);
  const [motivo, setMotivo] = useState("");

  const query = useQuery({
    queryKey: ["admin", "usuarios", q],
    queryFn: () => listFn({ data: { q } }),
  });

  const edit = useMutation({
    mutationFn: (v: { id: string; nome_completo: string }) => editFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setEditing(null);
      toast.success("Usuário atualizado.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const block = useMutation({
    mutationFn: (v: { id: string; bloqueado: boolean; motivo?: string }) => blockFn({ data: v }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setBlockDialog(null);
      setMotivo("");
      toast.success(v.bloqueado ? "Usuário bloqueado." : "Usuário desbloqueado.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (email: string) =>
      resetFn({ data: { email, redirect_to: window.location.origin + "/reset-password" } }),
    onSuccess: () => toast.success("E-mail de redefinição de senha enviado ao aluno."),
    onError: (e: any) => toast.error(e.message),
  });

  const all = query.data ?? [];
  const rows = all.filter((r: any) =>
    filtro === "todos"
      ? true
      : filtro === "ativa"
        ? r.assinatura_status === "ativa"
        : r.assinatura_status !== "ativa",
  );

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Alunos e administradores da plataforma."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5">
              {([
                { key: "ativa", label: "Assinatura ativa" },
                { key: "sem", label: "Sem assinatura" },
                { key: "todos", label: "Todos" },
              ] as const).map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filtro === f.key ? "secondary" : "ghost"}
                  className="h-8"
                  onClick={() => setFiltro(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-64 pl-8"
                placeholder="Buscar por nome ou e-mail…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        }
      />
      <PageContent>
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-right">Progresso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {query.isLoading ? "Carregando…" : "Nenhum usuário encontrado."}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="font-medium underline-offset-4 hover:underline"
                        onClick={() => setDetalhe(r)}
                      >
                        {r.nome_completo || "—"}
                      </button>
                      {r.bloqueado && <Badge variant="destructive">Bloqueado</Badge>}
                      {r.roles?.includes("administrador") && <Badge>Admin</Badge>}
                      {r.roles?.includes("aluno_teste") && (
                        <Badge variant={r.teste_expirado ? "destructive" : "secondary"}>
                          {r.teste_expirado
                            ? "Teste expirado"
                            : r.teste_expira_em
                              ? `Teste até ${new Date(r.teste_expira_em).toLocaleDateString("pt-BR")}`
                              : "Aluno teste"}
                        </Badge>
                      )}

                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{r.email}</div>
                    {r.telefone && <div className="text-xs tabular-nums">{r.telefone}</div>}
                    {r.origem === "teste_gratis" && (
                      <div className="text-xs text-muted-foreground/70">via página de teste</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <AssinaturaBadge status={r.assinatura_status} plano={r.assinatura_plano} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.ultimo_acesso_em
                      ? new Date(r.ultimo_acesso_em).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    <div>{r.questionarios_concluidos} questionário(s)</div>
                    <div>{r.questoes_respondidas} questão(ões)</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Enviar redefinição de senha"
                        onClick={() => reset.mutate(r.email)}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={r.bloqueado ? "Desbloquear" : "Bloquear"}
                        onClick={() => {
                          if (r.bloqueado) block.mutate({ id: r.id, bloqueado: false });
                          else setBlockDialog(r);
                        }}
                      >
                        {r.bloqueado ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageContent>

      {/* Detalhes do usuário */}
      <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados do usuário</DialogTitle>
            <DialogDescription>
              Informações do cadastro
              {detalhe?.origem === "teste_gratis" ? " (página de teste)" : ""}.
            </DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Nome completo</p>
                <p className="font-medium">{detalhe.nome_completo || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</p>
                <p className="font-medium break-all">{detalhe.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Celular (WhatsApp)</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium tabular-nums">
                    {detalhe.telefone ? formatarTelefone(detalhe.telefone) : "—"}
                  </p>
                  {detalhe.telefone && (
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                      <a
                        href={linkWhatsApp(detalhe.telefone, detalhe.nome_completo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Assinatura</p>
                  <div className="mt-1">
                    <AssinaturaBadge status={detalhe.assinatura_status} plano={detalhe.assinatura_plano} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cadastro</p>
                  <p className="font-medium">
                    {new Date(detalhe.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetalhe(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input
                  value={editing.nome_completo ?? ""}
                  onChange={(e) => setEditing({ ...editing, nome_completo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Funções de acesso</Label>
                {[
                  { role: "administrador", label: "Administrador", hint: "Acesso total ao painel administrativo." },
                  { role: "aluno", label: "Aluno", hint: "Acesso padrão, conforme assinatura." },
                  { role: "aluno_teste", label: "Aluno teste", hint: "Libera todo o conteúdo sem assinatura paga, por tempo limitado." },
                ].map((opt) => {
                  const roles: string[] = editing.roles ?? [];
                  const checked = roles.includes(opt.role);
                  return (
                    <label
                      key={opt.role}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setEditing({
                            ...editing,
                            roles: v
                              ? [...roles, opt.role]
                              : roles.filter((r) => r !== opt.role),
                          })
                        }
                      />
                      <span className="leading-tight">
                        <span className="block text-sm font-medium">{opt.label}</span>
                        <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                      </span>
                    </label>
                  );
                })}
                {editing.roles?.includes("aluno_teste") && (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <Label htmlFor="dias-teste">Duração do teste (dias)</Label>
                    <Input
                      id="dias-teste"
                      type="number"
                      min={1}
                      max={365}
                      value={editing.dias_teste ?? 5}
                      onChange={(e) =>
                        setEditing({ ...editing, dias_teste: Number(e.target.value) || 5 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {editing.teste_expira_em
                        ? `Prazo atual: ${new Date(editing.teste_expira_em).toLocaleString("pt-BR")}. Marque abaixo para renovar.`
                        : "Ao salvar, o acesso de teste expira nesse prazo."}
                    </p>
                    {editing.teste_expira_em && (
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!editing.reiniciar_teste}
                          onCheckedChange={(v) =>
                            setEditing({ ...editing, reiniciar_teste: !!v })
                          }
                        />
                        Renovar prazo a partir de hoje
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                const roles: string[] = editing.roles?.length ? editing.roles : ["aluno"];
                await edit.mutateAsync({ id: editing.id, nome_completo: editing.nome_completo ?? "" });
                await roleMut.mutateAsync({
                  id: editing.id,
                  roles,
                  dias_teste: Number(editing.dias_teste) || 5,
                  reiniciar_teste: !!editing.reiniciar_teste,
                });
              }}
              disabled={edit.isPending || roleMut.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>

        </DialogContent>

      </Dialog>

      {/* Bloquear */}
      <Dialog open={!!blockDialog} onOpenChange={(v) => !v && setBlockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear usuário</DialogTitle>
            <DialogDescription>
              {blockDialog?.nome_completo} ({blockDialog?.email}) perderá acesso imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => block.mutate({ id: blockDialog.id, bloqueado: true, motivo })}
              disabled={block.isPending}
            >
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssinaturaBadge({ status, plano }: { status: string; plano: string | null }) {
  if (status === "ativa") return <Badge className="bg-green-600 hover:bg-green-600">Ativa{plano ? ` · ${plano}` : ""}</Badge>;
  if (status === "inadimplente") return <Badge variant="destructive">Inadimplente</Badge>;
  if (status === "cancelada") return <Badge variant="secondary">Cancelada</Badge>;
  if (status === "inativa") return <Badge variant="secondary">Inativa</Badge>;
  return <Badge variant="outline">Sem assinatura</Badge>;
}
