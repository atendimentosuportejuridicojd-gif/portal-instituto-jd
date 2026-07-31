import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader } from "@/components/page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getMinhaAssinatura } from "@/lib/assinaturas.functions";
import { getResumoJornada } from "@/lib/aluno.functions";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Portal J&D" }] }),
  component: Perfil,
});

function Perfil() {
  const { user } = Route.useRouteContext();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);

  const assFn = useServerFn(getMinhaAssinatura);
  const ass = useQuery({ queryKey: ["minha-assinatura"], queryFn: () => assFn() });
  const jornadaFn = useServerFn(getResumoJornada);
  const jornada = useQuery({ queryKey: ["perfil", "jornada"], queryFn: () => jornadaFn() });

  useEffect(() => {
    supabase
      .from("profiles")
      .select("nome_completo")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setNome(data?.nome_completo ?? ""));
  }, [user.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ nome_completo: nome }).eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado.");
  };

  const alterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 8) return toast.error("Use pelo menos 8 caracteres.");
    if (novaSenha !== confirmaSenha) return toast.error("As senhas não coincidem.");
    setSavingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingSenha(false);
    if (error) return toast.error(error.message);
    setNovaSenha("");
    setConfirmaSenha("");
    toast.success("Senha atualizada.");
  };

  const a = ass.data?.assinatura;

  return (
    <>
      <PageHeader title="Perfil" description="Suas informações e assinatura." />
      <PageContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface-card space-y-4 p-6 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sua jornada
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Info label="PDFs estudados">
                <span className="text-2xl font-semibold tabular-nums">
                  {jornada.data?.materiais_estudados ?? 0}
                </span>
              </Info>
              <Info label="Questionários concluídos">
                <span className="text-2xl font-semibold tabular-nums">
                  {jornada.data?.questionarios_concluidos ?? 0}
                </span>
              </Info>
              <Info label="Aproveitamento geral">
                <span className="text-2xl font-semibold tabular-nums">
                  {jornada.data?.aproveitamento_geral === null || jornada.data === undefined
                    ? "—"
                    : `${jornada.data.aproveitamento_geral}%`}
                </span>
              </Info>
            </div>
          </div>

          <form onSubmit={save} className="surface-card space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dados pessoais</h2>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={user.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>Salvar alterações</Button>
          </form>

          <form onSubmit={alterarSenha} className="surface-card space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Alterar senha</h2>
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar</Label>
              <Input
                type="password"
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={savingSenha}>Atualizar senha</Button>
          </form>

          <div className="surface-card space-y-3 p-6 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assinatura</h2>
            {!a ? (
              <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                <Info label="Status">
                  {a.status === "ativa" ? (
                    <Badge className="bg-green-600 hover:bg-green-600">Ativa</Badge>
                  ) : a.status === "inadimplente" ? (
                    <Badge variant="destructive">Inadimplente</Badge>
                  ) : (
                    <Badge variant="secondary">{a.status}</Badge>
                  )}
                </Info>
                <Info label="Plano">{a.plano ?? a.produto ?? "—"}</Info>
                <Info label="Início">
                  {a.inicio ? new Date(a.inicio).toLocaleDateString("pt-BR") : "—"}
                </Info>
                <Info label="Válida até">
                  {a.fim ? new Date(a.fim).toLocaleDateString("pt-BR") : "—"}
                </Info>
              </div>
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
