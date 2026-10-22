import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { registrarLeadSite } from "@/lib/leads-site.functions";
import { PERGUNTAS_SITE } from "@/lib/leads-site";
import { CARREIRAS } from "@/lib/carreiras";
import { getStoredClickId, trackConversion } from "@/lib/google-ads";
import { BrandLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Scale, Landmark, Shield, Target } from "lucide-react";

// Conversão "Formulário Escolha sua carreira (site)" do Google Ads.
const CONVERSAO_LEAD = "AW-18069973013/s-PGCKaDzKUdEJXQt6hD";
const POLITICA_URL = "https://www.institutojd.ia.br/politica-de-privacidade";

const titulo = "Escolha sua carreira — Instituto J&D";
const descricao =
  "Só estuda quando sai edital e tenta várias provas ao mesmo tempo? Escolha uma carreira e comece uma preparação contínua.";

const ICONES = { judiciaria: Scale, fiscal: Landmark, policial: Shield } as const;

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

function Etapa({ n, titulo }: { n: number; titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-bold text-gold-foreground">{n}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{titulo}</h2>
    </div>
  );
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    <div className="grid min-h-screen bg-background lg:grid-cols-[5fr_6fr]">
      {/* Painel da marca: no celular vira um cabeçalho compacto */}
      <aside className="flex flex-col justify-between bg-sidebar px-6 py-8 text-sidebar-foreground lg:px-14 lg:py-14">
        <div className="flex items-center gap-3">
          <BrandLogo size={44} className="rounded-md bg-white p-0.5" />
          <div>
            <p className="text-sm font-bold">Instituto J&D</p>
            <p className="text-[10px] uppercase tracking-widest opacity-70">Sua Carreira 360</p>
          </div>
        </div>

        <div className="mt-8 lg:mt-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold-foreground">
            <Target className="h-3.5 w-3.5" /> Método J&D
          </span>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight lg:text-5xl">
            Escolha sua carreira e comece <span className="text-gold">hoje</span>.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 opacity-80 lg:text-base lg:leading-7">{descricao}</p>

          <ul className="mt-8 hidden space-y-3 lg:block">
            {CARREIRAS.map((c) => {
              const Icone = ICONES[c.id];
              return (
                <li key={c.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gold text-gold-foreground"><Icone className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-sm font-semibold">{c.nome}</span>
                    <span className="block text-xs leading-5 opacity-70">{c.descricao}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-10 hidden max-w-sm text-sm italic leading-6 opacity-70 lg:block">
          “A aprovação é resultado de um estudo silencioso, disciplinado e constante.”
        </p>
      </aside>

      <main className="px-6 pb-40 pt-8 lg:flex lg:items-center lg:justify-center lg:px-14 lg:py-14">
        <div className="mx-auto w-full max-w-xl">
          {enviado ? (
            <div className="surface-card p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-gold" />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Recebemos suas respostas!</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Obrigado por escolher sua carreira. Em breve entraremos em contato pelo WhatsApp informado.
                Enquanto isso, conheça o Portal do Aluno com o teste gratuito.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90"><a href="/teste">Testar gratuitamente</a></Button>
                <Button asChild variant="outline"><a href="https://www.institutojd.ia.br/">Conhecer o Instituto</a></Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="surface-card space-y-8 p-6 sm:p-8">
              <section className="space-y-4">
                <Etapa n={1} titulo="Seus dados" />
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoComplete="name" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoComplete="email" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
                    <Input id="telefone" type="tel" inputMode="tel" placeholder="(00) 00000-0000" value={telefone}
                      onChange={(e) => setTelefone(mascararTelefone(e.target.value))} autoComplete="tel" required />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <Etapa n={2} titulo="Seu momento" />
                {PERGUNTAS_SITE.map((p) => (
                  <fieldset key={p.id} className="space-y-2.5">
                    <legend className="text-sm font-medium">{p.pergunta}</legend>
                    <RadioGroup value={respostas[p.id] ?? ""} onValueChange={(v) => setRespostas((r) => ({ ...r, [p.id]: v }))} className="grid grid-cols-2 gap-2">
                      {p.opcoes.map((op) => {
                        const marcada = respostas[p.id] === op;
                        return (
                          <Label
                            key={op}
                            htmlFor={`${p.id}-${op}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2.5 text-[13px] font-normal leading-4 transition-colors sm:gap-2.5 sm:px-3 sm:text-sm",
                              marcada ? "border-gold bg-gold/10 font-medium" : "border-border bg-background hover:border-gold/60",
                            )}
                          >
                            <RadioGroupItem value={op} id={`${p.id}-${op}`} />
                            {op}
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </fieldset>
                ))}
              </section>

              {/* Campo-isca: invisível para pessoas; robôs costumam preencher. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label>Site<input tabIndex={-1} autoComplete="off" value={isca} onChange={(e) => setIsca(e.target.value)} /></label>
              </div>

              <div className="flex items-start gap-2.5">
                <Checkbox id="consentimento" checked={consentimento} onCheckedChange={(v) => setConsentimento(v === true)} className="mt-0.5" />
                <Label htmlFor="consentimento" className="cursor-pointer text-xs font-normal leading-5 text-muted-foreground">
                  Concordo com a{" "}
                  <a href={POLITICA_URL} target="_blank" rel="noopener noreferrer" className="underline" onClick={(e) => e.stopPropagation()}>Política de Privacidade</a>{" "}
                  e em receber contato do Instituto J&D por WhatsApp e e-mail.
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full bg-gold text-gold-foreground hover:bg-gold/90" disabled={enviar.isPending}>
                {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar respostas"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
