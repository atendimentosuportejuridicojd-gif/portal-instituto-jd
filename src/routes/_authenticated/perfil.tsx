import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader } from "@/components/page";
import { Kpi } from "@/components/cronograma/visual";
import { BookOpen, Camera, Gauge, ListChecks, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
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
      .select("nome_completo, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNome(data?.nome_completo ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
      });
  }, [user.id]);

  // Reduz a foto para um quadrado de 256 px (JPEG) antes de enviar: leve e sem guardar a imagem original.
  const reduzir = (arquivo: File) =>
    new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Não foi possível processar a imagem."));
        ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível processar a imagem."))), "image/jpeg", 0.88);
      };
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.src = url;
    });

  const trocarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
    if (arquivo.size > 15 * 1024 * 1024) return toast.error("A imagem é grande demais (máximo 15 MB).");
    setEnviandoFoto(true);
    try {
      const blob = await reduzir(arquivo);
      const caminho = `${user.id}/avatar.jpg`;
      const { error: eUp } = await supabase.storage
        .from("avatars")
        .upload(caminho, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (eUp) throw eUp;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(caminho);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: eDb } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (eDb) throw eDb;
      setAvatarUrl(url);
      qc.invalidateQueries({ queryKey: ["meu-avatar"] });
      toast.success("Foto de perfil atualizada.");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  };

  const removerFoto = async () => {
    setEnviandoFoto(true);
    try {
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(null);
      qc.invalidateQueries({ queryKey: ["meu-avatar"] });
      toast.success("Foto removida.");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível remover a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  };

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
      <PageHeader icone={User} rotulo="Minha conta" title="Perfil" description="Suas informações e assinatura." />
      <PageContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface-card space-y-4 p-6 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sua jornada
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi icone={BookOpen} rotulo="Matérias estudadas" valor={jornada.data?.materiais_estudados ?? 0} />
              <Kpi icone={ListChecks} rotulo="Questionários concluídos" valor={jornada.data?.questionarios_concluidos ?? 0} />
              <Kpi
                icone={Gauge}
                rotulo="Aproveitamento geral"
                destaque={(jornada.data?.aproveitamento_geral ?? 0) >= 85}
                valor={
                  jornada.data?.aproveitamento_geral === null || jornada.data === undefined
                    ? "—"
                    : `${jornada.data.aproveitamento_geral}%`
                }
                detalhe="meta de 85% por matéria"
              />
            </div>
          </div>

          <form onSubmit={save} className="surface-card space-y-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dados pessoais</h2>
            <div className="flex items-center gap-4">
              <UserAvatar url={avatarUrl} nome={nome} email={user.email} className="h-20 w-20 text-lg" />
              <div className="space-y-2">
                <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={trocarFoto} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={enviandoFoto} onClick={() => inputFoto.current?.click()}>
                    <Camera className="mr-2 h-4 w-4" />
                    {enviandoFoto ? "Enviando…" : avatarUrl ? "Trocar foto" : "Adicionar foto"}
                  </Button>
                  {avatarUrl && (
                    <Button type="button" variant="ghost" size="sm" disabled={enviandoFoto} onClick={removerFoto}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. A foto é cortada em quadrado.</p>
              </div>
            </div>
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
