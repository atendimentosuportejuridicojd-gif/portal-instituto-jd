import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Crown, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutSimulado } from "@/components/checkout-simulado";
import { criarCheckoutAssinatura } from "@/lib/assinatura-checkout.functions";
import { ambientePagamentos } from "@/lib/simulado-pagamento";
import { brl, precosPlano, type Periodo } from "@/lib/assinatura-planos";
import { nomeCarreira } from "@/lib/carreiras";
import { toast } from "sonner";

const BENEFICIOS = [
  "Acervo completo de matérias da sua carreira",
  "Banco de questões com comentários do professor",
  "Cronograma personalizado por edital",
  "Comunidade exclusiva no Telegram",
];

export function PlanosAssinatura({ carreira }: { carreira?: string | null }) {
  const checkoutFn = useServerFn(criarCheckoutAssinatura);
  const [carregando, setCarregando] = useState<Periodo | "teste" | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [modoTeste, setModoTeste] = useState(false);
  useEffect(() => {
    setModoTeste(new URLSearchParams(window.location.search).get("teste") === "1");
  }, []);
  const p = precosPlano(carreira);

  const escolher = async (periodo: Periodo | "teste") => {
    setCarregando(periodo);
    try {
      const environment = ambientePagamentos(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN);
      const r = await checkoutFn({ data: { periodo, environment } });
      if ("error" in r) throw new Error(r.error);
      setClientSecret(r.clientSecret);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o pagamento.");
    } finally {
      setCarregando(null);
    }
  };

  if (clientSecret) {
    return (
      <div className="w-full">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => setClientSecret(null)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar aos planos
        </Button>
        <CheckoutSimulado clientSecret={clientSecret} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{nomeCarreira(carreira)}</p>
        <h2 className="mt-2 font-[family-name:var(--font-course-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
          Escolha como quer estudar
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Acesso imediato após a confirmação do pagamento.</p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {/* Mensal */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm">
          <h3 className="text-lg font-semibold">Assinatura Mensal</h3>
          <p className="mt-1 text-sm text-muted-foreground">Sem fidelidade. Cancele quando quiser.</p>
          <p className="mt-5">
            <span className="text-4xl font-bold tracking-tight text-primary">{brl(p.mensal)}</span>
            <span className="text-sm text-muted-foreground"> /mês</span>
          </p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{b}</li>
            ))}
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />Sem juros nem multa para voltar</li>
          </ul>
          <Button variant="outline" size="lg" className="mt-6 w-full border-primary text-primary" disabled={!!carregando} onClick={() => escolher("mensal")}>
            {carregando === "mensal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assinar mensal"}
          </Button>
        </div>

        {/* Anual */}
        <div className="relative flex flex-col rounded-2xl border-2 border-gold bg-primary p-6 text-left text-primary-foreground shadow-xl">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-foreground">
            15% OFF · Mais vantajoso
          </span>
          <h3 className="flex items-center gap-2 text-lg font-semibold"><Crown className="h-5 w-5 text-gold" />Plano Anual</h3>
          <p className="mt-1 text-sm opacity-80">1 ano de acesso completo, pagamento único.</p>
          <p className="mt-5">
            <span className="text-sm line-through opacity-60">{brl(p.anualCheio)}</span>
            <br />
            <span className="text-4xl font-bold tracking-tight text-gold">{brl(p.anual)}</span>
          </p>
          <p className="text-xs opacity-80">equivale a {brl(p.anualMes)}/mês</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{b}</li>
            ))}
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />12 meses sem se preocupar com renovação</li>
          </ul>
          <Button size="lg" className="mt-6 w-full bg-gold font-semibold text-gold-foreground hover:bg-gold/90" disabled={!!carregando} onClick={() => escolher("anual")}>
            {carregando === "anual" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Garantir plano anual"}
          </Button>
        </div>
      </div>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Pagamento seguro processado pela Stripe.
      </p>
      {modoTeste && (
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" disabled={!!carregando} onClick={() => escolher("teste")}>
            {carregando === "teste" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Plano de teste (R$ 0,50/mês)"}
          </Button>
        </div>
      )}
    </div>
  );
}
