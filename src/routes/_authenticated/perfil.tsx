import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader } from "@/components/page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Portal J&D" }] }),
  component: Perfil,
});

function Perfil() {
  const { user } = Route.useRouteContext();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase
      .from("profiles")
      .update({ nome_completo: nome })
      .eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado.");
  };

  return (
    <>
      <PageHeader title="Perfil" description="Suas informações pessoais." />
      <PageContent>
        <form onSubmit={save} className="surface-card max-w-lg space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={user.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>
            Salvar alterações
          </Button>
        </form>
      </PageContent>
    </>
  );
}
