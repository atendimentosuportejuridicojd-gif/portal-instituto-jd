import type { ComponentType, ReactNode } from "react";

/**
 * Cabeçalho padrão das páginas do portal (aluno e administrador). Faixa com a cor da marca, ícone opcional,
 * rótulo pequeno acima do título e ações à direita.
 */
export function PageHeader({
  title,
  description,
  actions,
  icone: Icone,
  rotulo,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Ícone ao lado do título (aparece a partir de telas médias). */
  icone?: ComponentType<{ className?: string }>;
  /** Texto pequeno em caixa-alta acima do título. */
  rotulo?: string;
}) {
  return (
    <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-r from-primary/[0.06] via-background to-gold/[0.10] px-6 py-7 sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-gold/15 blur-3xl"
      />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {Icone && (
            <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:grid">
              <Icone className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            {rotulo && (
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-gold-foreground/80 dark:text-gold">
                {rotulo}
              </p>
            )}
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  return <div className="animate-in fade-in px-6 py-8 duration-300 sm:px-8">{children}</div>;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-gold/20 ring-1 ring-border">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/** Título de seção com ícone, usado para separar blocos dentro de uma página. */
export function SecaoTitulo({
  icone: Icone,
  children,
  acao,
}: {
  icone?: ComponentType<{ className?: string }>;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        {Icone && (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icone className="h-4 w-4" />
          </span>
        )}
        {children}
      </h2>
      {acao}
    </div>
  );
}
