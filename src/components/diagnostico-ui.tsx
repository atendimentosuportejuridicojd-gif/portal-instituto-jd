import { Scale } from "lucide-react";

export function DiagnosticoHeader({ passo, total }: { passo: number; total: number }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto max-w-xl px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gold text-gold-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium">Instituto J&D</p>
        </div>
        {passo > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${Math.min(100, (passo / total) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

export function OpcaoBotao({
  label,
  selecionado,
  onClick,
}: {
  label: string;
  selecionado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left text-sm font-medium transition ${
        selecionado ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}

export function TelaPergunta({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{titulo}</h1>
      <div className="mt-6 space-y-3">{children}</div>
    </main>
  );
}
