import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Lock, LogOut, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPlataformaConfig } from "@/lib/config.functions";
import { getMinhaAssinatura } from "@/lib/assinaturas.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assinatura-bloqueada")({
  head: () => ({ meta: [{ title: "Acesso bloqueado — Portal J&D" }] }),
  component: AssinaturaBloqueada,
});

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
  const regularizarUrl =
    cfg.data?.hotmart_regularizacao_url || "https://pay.hotmart.com/W105831049I";

  const titulo = bloqueado
    ? "Sua conta foi bloqueada"
    : status === "inadimplente"
      ? "Assinatura pendente de pagamento"
      : status === "cancelada"
        ? "Assinatura cancelada"
        : "Assinatura inativa";

  const descricao = bloqueado
    ? motivo || "Entre em contato com o suporte para mais informações."
    : "Para continuar acessando o conteúdo do Portal do Aluno, regularize sua assinatura na Hotmart. Assim que o pagamento for confirmado, seu acesso será liberado automaticamente.";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{descricao}</p>

        <div className="mt-8 flex flex-col gap-2">
          {regularizarUrl && !bloqueado && (
            <Button asChild size="lg">
              <a href={regularizarUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Regularizar na Hotmart
              </a>
            </Button>
          )}
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
