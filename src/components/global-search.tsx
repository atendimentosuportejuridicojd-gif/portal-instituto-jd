import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { buscaGlobal, type BuscaResultado } from "@/lib/busca.functions";

const tipoLabel: Record<BuscaResultado["tipo"], string> = {
  disciplina: "Disciplina",
  modulo: "Módulo",
  material: "Material",
  concurso: "Concurso",
  noticia: "Notícia",
  cronograma: "Cronograma",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BuscaResultado[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const searchFn = useServerFn(buscaGlobal);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchFn({ data: { q: query.trim() } });
        if (!cancel) setResults(data);
      } catch {
        if (!cancel) setResults([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 180);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [query, open, searchFn]);

  const groups = results.reduce<Record<string, BuscaResultado[]>>((acc, r) => {
    (acc[r.tipo] ??= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Buscar na plataforma"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="ml-2 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          Ctrl+K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar disciplinas, materiais, notícias, concursos…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && <div className="py-6 text-center text-xs text-muted-foreground">Buscando…</div>}
          {!loading && query.trim().length < 2 && (
            <div className="py-6 text-center text-xs text-muted-foreground">Digite pelo menos 2 caracteres.</div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
          )}
          {Object.entries(groups).map(([tipo, arr]) => (
            <CommandGroup key={tipo} heading={tipoLabel[tipo as BuscaResultado["tipo"]]}>
              {arr.map((r) => (
                <CommandItem
                  key={`${tipo}-${r.id}`}
                  value={`${tipo}-${r.id}-${r.titulo}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: r.link });
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{r.titulo}</div>
                    {r.subtitulo && (
                      <div className="truncate text-xs text-muted-foreground">{r.subtitulo}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
