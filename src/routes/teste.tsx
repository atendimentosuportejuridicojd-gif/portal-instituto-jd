import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { criarContaTeste } from "@/lib/teste-gratis.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Scale, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/teste")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Teste grátis — Portal do Aluno J&D" },
      {
        name: "description",
        content:
          "Resgate seu período de teste gratuito no Portal do Aluno do Instituto J&D e acesse o acervo de preparação para a carreira judiciária.",
      },
      { property: "og:title", content: "Teste grátis — Portal do Aluno J&D" },
      {
        property: "og:description",
        content: "Crie sua conta de teste e conheça o Portal do Aluno do Instituto J&D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TestePage,
});

function TestePage() {
  const navigate = useNavigate();
  const criarFn = useServerFn(criarContaTeste);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const criar = useMutation({
    mutationFn: () => criarFn({ data: { nome, email, telefone, senha } }),
    onSuccess: async (r: any) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        toast.success("Conta de teste criada! Faça login para começar.");
        return navigate({ to: "/auth", replace: true });
      }
      toast.success(`Teste de ${r.dias} dias liberado. Bons estudos!`);
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível criar a conta."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) return toast.error("As senhas não coincidem.");
    criar.mutate();
  };

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-gold text-gold-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Instituto J&D</p>
            <p className="text-[10px] uppercase tracking-widest opacity-70">
              Especialistas na Carreira Judiciária
            </p>
          </div>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            "A aprovação é resultado de um estudo silencioso, disciplinado e constante."
          </h2>
          <ul className="mt-8 space-y-3 text-sm opacity-80">
            {[
              "Acesso ao Acervo Base completo durante o teste",
              "Questões comentadas e acompanhamento de desempenho",
              "Cronograma de estudos personalizado",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link
            to="/auth"
            className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para login
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Resgatar período de teste</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha seus dados e libere seu acesso de teste imediatamente.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                placeholder="Digite seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Celular (WhatsApp)</Label>
              <Input
                id="telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                maxLength={20}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                placeholder="Confirme sua senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={criar.isPending}>
              {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta de teste
            </Button>
          </form>

          <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            Ao criar uma conta de teste, seu acesso é liberado por tempo limitado. Ao fim do período,
            será necessário assinar para continuar estudando.
          </p>
        </div>
      </div>
    </div>
  );
}
