import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { registrarLeadSite } from "@/lib/leads-site.functions";
import { PERGUNTAS_SITE } from "@/lib/leads-site";
import { getStoredClickId, trackConversion } from "@/lib/google-ads";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

// Conversão "Formulário Escolha sua carreira (site)" do Google Ads.
const CONVERSAO_LEAD = "AW-18069973013/s-PGCKaDzKUdEJXQt6hD";
const POLITICA_URL = "https://www.institutojd.ia.br/politica-de-privacidade";

const titulo = "Escolha sua carreira — Instituto J&D";
const descricao =
  "Só estuda quando sai edital e tenta várias provas ao mesmo tempo? Escolha uma carreira e comece uma preparação contínua.";

export const Route = createFileRoute("/escolha-sua-carreira")({
  ssr: false,
  head: () => ({
    meta: [
      { title: titulo },
      { name: "description", content: descricao },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descricao },
    ],
  }),
  component: EscolhaSuaCarreira,
});

function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function EscolhaSuaCarreira() {
  const enviarFn = useServerFn(registrarLeadSite);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [consentimento, setConsentimento] = useState(false);
  const [isca, setIsca] = useState("");
  const [enviado, setEnviado] = useState(false);

  const enviar = useMutation({
    mutationFn: () =>
      enviarFn({
        data: {
          nome, email, telefone,
          carreira: respostas.carreira, como_estuda: respostas.como_estuda,
          horas_dia: respostas.horas_dia, prazo_prova: respostas.prazo_prova,
          consentimento: true as const, site: isca, gclid: getStoredClickId(),
        },
      }),
    onSuccess: () => {
      trackConversion(CONVERSAO_LEAD);
      setEnviado(true);
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível enviar agora."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const faltando = PERGUNTAS_SITE.find((p) => !respostas[p.id]);
    if (faltando) return toast.error(`Responda: ${faltando.pergunta}`);
    if (!consentimento) return toast.error("Para enviar, concorde com a Política de Privacidade.");
    enviar.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <BrandLogo size={40} className="rounded-md" />
          <div>
            <p className="text-sm font-bold">Instituto J&D</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sua Carreira 360</p>
          </div>
        </div>
      </header>

      {/* pb-40: o banner de cookies fica fixo no rodapé e não pode cobrir o botão de envio */}
      <main className="mx-auto max-w-2xl px-6 pb-40 pt-10">
        {enviado ? (
          <div className="surface-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gold" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Recebemos suas respostas!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Obrigado por escolher sua carreira. Em breve entraremos em contato pelo WhatsApp informado.
              Enquanto isso, conheça o Portal do Aluno com o teste gratuito.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild><a href="/teste">Testar gratuitamente</a></Button>
              <Button asChild variant="outline"><a href="https://www.institutojd.ia.br/">Conhecer o Instituto</a></Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">Escolha sua carreira</h1>
            <p className="mt-3 text-muted-foreground">{descricao}</p>

            <form onSubmit={submit} className="mt-8 space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoComplete="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoComplete="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
                <Input id="telefone" type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={telefone}
                  onChange={(e) => setTelefone(mascararTelefone(e.target.value))} autoComplete="tel" required />
              </div>

              {PERGUNTAS_SITE.map((p) => (
                <fieldset key={p.id} className="space-y-3">
                  <legend className="text-sm font-medium">{p.pergunta}</legend>
                  <RadioGroup value={respostas[p.id] ?? ""} onValueChange={(v) => setRespostas((r) => ({ ...r, [p.id]: v }))}>
                    {p.opcoes.map((op) => (
                      <div key={op} className="flex items-center gap-2.5">
                        <RadioGroupItem value={op} id={`${p.id}-${op}`} />
                        <Label htmlFor={`${p.id}-${op}`} className="cursor-pointer font-normal">{op}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </fieldset>
              ))}

              {/* Campo-isca: invisível para pessoas; robôs costumam preencher. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label>Site<input tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} /></label>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox id="consentimento" checked={consentimento} onCheckedChange={(v) => setConsentimento(v === true)} className="mt-0.5" />
                <Label htmlFor="consentimento" className="cursor-pointer text-sm font-normal leading-5 text-muted-foreground">
                  Concordo com a{" "}
                  <a href={POLITICA_URL} target="_blank" rel="noopener noreferrer" className="underline" onClick={(e) => e.stopPropagation()}>Política de Privacidade</a>{" "}
                  e em receber contato do Instituto J&D por WhatsApp e e-mail.
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={enviar.isPending}>
                {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar respostas"}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
