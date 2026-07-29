import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Scale, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir senha — Portal J&D" },
      { name: "description", content: "Defina uma nova senha para acessar o Portal do Aluno." },
      { property: "og:title", content: "Definir senha — Portal J&D" },
      { property: "og:description", content: "Defina sua senha de acesso." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Supabase parses tokens from URL hash automatically. Ensure we have a session.
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return toast.error("Use pelo menos 8 caracteres.");
    if (senha !== confirma) return toast.error("As senhas não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha definida com sucesso! Bem-vindo(a) ao Portal.");
    navigate({ to: "/dashboard", replace: true });
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
            <p className="text-[10px] uppercase tracking-widest opacity-70">Especialistas na Carreira Judiciária</p>
          </div>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Defina sua senha de acesso</h2>
          <p className="mt-6 text-sm opacity-70">
            Após confirmar, você será direcionado ao Portal do Aluno.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Definir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma senha forte, com pelo menos 8 caracteres.
          </p>

          {hasSession === false && (
            <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Link inválido ou expirado. Solicite um novo link de recuperação na tela de login.
            </p>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirma">Confirmar senha</Label>
              <Input
                id="confirma"
                type="password"
                autoComplete="new-password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || hasSession === false}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar senha e entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground">Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
