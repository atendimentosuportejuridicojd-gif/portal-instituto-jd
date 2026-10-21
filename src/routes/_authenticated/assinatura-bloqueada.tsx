import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, LogOut, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPlataformaConfig } from "@/lib/config.functions";
import { getMinhaAssinatura, ativarTesteComWhatsapp } from "@/lib/assinaturas.functions";
import { toast } from "sonner";
import { PlanosAssinatura } from "@/components/planos-assinatura";

export const Route = createFileRoute("/_authenticated/assinatura-bloqueada")({
  head: () => ({ meta: [{ title: "Acesso bloqueado — Portal J&D" }] }),
  component: AssinaturaBloqueada,
});

function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function AtivarTeste() {
  const ativarFn = useServerFn(ativarTesteComWhatsapp);
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (telefone.replace(/\D/g, "").length < 10) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }
    setEnviando(true);
    try {
      const r = await ativarFn({ data: { telefone } });
      toast.success(`Pronto! Seus ${r.dias} dias grátis foram liberados.`);
      window.location.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível liberar o teste.");
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form onSubmit={enviar} className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Gift className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Libere seus 5 dias grátis</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Informe seu WhatsApp para desbloquear o acesso completo ao Portal do Aluno durante o período de teste.
        </p>
        <Input
          className="mt-6"
          type="tel"
          inputMode="tel"
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          aria-label="WhatsApp"
          required
        />
        <Button type="submit" size="lg" className="mt-3 w-full" disabled={enviando}>
          {enviando ? "Liberando..." : "Liberar meus 5 dias grátis"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="mt-2 w-full"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.replace("/auth");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </Button>
      </form>
    </div>
  );
}

function AssinaturaBloqueada() {
  const navigate = useNavigate();
  const cfgFn = useServerFn(getPlataformaConfig);
  const assFn = useServerFn(getMinhaAssinatura);
  const cfg = useQuery({ queryKey: ["config"], queryFn: () => cfgFn() });
  const ass = useQuery({ queryKey: ["minha-assinatura"], queryFn: () => assFn() });

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/auth", replace: true });
  };

  const status = ass.data?.assinatura?.status ?? "sem_assinatura";
  const bloqueado = ass.data?.bloqueado;
  const motivo = ass.data?.bloqueado_motivo;

  if (ass.data?.podeAtivarTeste) return <AtivarTeste />;

  const titulo = bloqueado
    ? "Sua conta foi bloqueada"
    : status === "inadimplente"
      ? "Assinatura pendente de pagamento"
      : status === "cancelada"
        ? "Assinatura cancelada"
        : "Assinatura inativa";

  const descricao = bloqueado
    ? motivo || "Entre em contato com o suporte para mais informações."
    : "Para continuar acessando o conteúdo do Portal do Aluno, escolha um dos planos abaixo. Assim que o pagamento for confirmado, seu acesso é liberado automaticamente.";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{descricao}</p>

        {!bloqueado && (
          <div className="mt-8">
            <PlanosAssinatura carreira={ass.data?.carreira} />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </div>

        {cfg.data?.email_contato && (
          <p className="mt-6 text-xs text-muted-foreground">
            Dúvidas? Contate{" "}
            <a href={`mailto:${cfg.data.email_contato}`} className="text-primary hover:underline">
              {cfg.data.email_contato}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
