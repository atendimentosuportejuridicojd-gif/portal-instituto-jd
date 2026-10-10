import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminDefinirMateriaisExcecao } from "@/lib/trilhas.functions";

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * "Vincular materiais exceção": escolhe matérias de OUTRAS disciplinas e as faz contar dentro de uma disciplina da
 * estrutura da prova do concurso (no cronograma e nos simulados). Ex.: Lei de Acesso à Informação dentro de
 * Direito Administrativo. Só vale para este concurso; no Acervo Base nada muda.
 */
export function VincularExcecao({
  concurso,
  materiais,
  disciplinas,
  onDone,
}: {
  concurso: any;
  materiais: any[];
  disciplinas: any[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [destino, setDestino] = useState("");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const fn = useServerFn(adminDefinirMateriaisExcecao);

  const nomeDisc = (id: string) => disciplinas.find((d: any) => d.id === id)?.nome ?? "Disciplina";
  const destinos: { id: string; nome: string }[] = (concurso.estrutura ?? []).map((e: any) => ({
    id: e.disciplina_id,
    nome: nomeDisc(e.disciplina_id),
  }));
  const excecoes = new Map<string, string>((concurso.excecoes ?? []).map((x: any) => [x.material_id, x.disciplina_id]));

  const escolherDestino = (id: string) => {
    setDestino(id);
    setSel(
      new Set<string>((concurso.excecoes ?? []).filter((x: any) => x.disciplina_id === id).map((x: any) => x.material_id)),
    );
  };

  // Matérias da própria disciplina de destino (e das específicas vinculadas a ela) já contam nela: não entram na lista.
  const candidatas = useMemo(() => {
    if (!destino) return [];
    const juntas = new Set(
      disciplinas
        .filter((d: any) => d.especifica && d.disciplina_base_id === destino && d.concurso_id === concurso.id)
        .map((d: any) => d.id),
    );
    const termo = semAcento(busca.trim());
    return materiais.filter(
      (m: any) =>
        m.disciplina_id !== destino &&
        !juntas.has(m.disciplina_id) &&
        (!termo || semAcento(`${m.titulo} ${m.disciplina}`).includes(termo)),
    );
  }, [destino, busca, materiais, disciplinas, concurso.id]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, any[]>();
    for (const m of candidatas) {
      const l = mapa.get(m.disciplina) ?? [];
      l.push(m);
      mapa.set(m.disciplina, l);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [candidatas]);

  const mut = useMutation({
    mutationFn: () =>
      fn({ data: { concurso_id: concurso.id, disciplina_id: destino, material_ids: [...sel] } }),
    onSuccess: (r: any) => {
      toast.success(`${r.incluidas} matéria(s) contam em ${nomeDisc(destino)}; ${r.devolvidas} devolvida(s).`);
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const alternar = (id: string, marcado: boolean) =>
    setSel((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setBusca("");
          setDestino("");
          setSel(new Set());
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
          Vincular materiais exceção
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Materiais exceção — {concurso.nome}</DialogTitle>
          <DialogDescription>
            Escolha uma disciplina da estrutura da prova e marque matérias de outras disciplinas que devem contar nela
            no cronograma e nos simulados deste concurso. Nada muda no Acervo Base.
          </DialogDescription>
        </DialogHeader>

        {destinos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre primeiro a <strong>Estrutura da prova</strong> deste concurso para escolher a disciplina de destino.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Disciplina de destino (da estrutura da prova)</Label>
              <Select value={destino} onValueChange={escolherDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher disciplina…" />
                </SelectTrigger>
                <SelectContent>
                  {destinos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {destino && (
              <>
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar matéria ou disciplina…"
                  aria-label="Buscar matéria"
                />
                <p className="text-xs text-muted-foreground">
                  {sel.size} matéria(s) marcada(s) para contar em <strong>{nomeDisc(destino)}</strong>.
                </p>
                <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
                  {grupos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma matéria encontrada.</p>
                  )}
                  {grupos.map(([disciplina, lista]) => (
                    <div key={disciplina} className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {disciplina}
                      </p>
                      {lista.map((m: any) => {
                        const outro = excecoes.get(m.id);
                        return (
                          <label
                            key={m.id}
                            className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={sel.has(m.id)}
                              onCheckedChange={(v) => alternar(m.id, !!v)}
                              aria-label={`Contar ${m.titulo} em ${nomeDisc(destino)}`}
                            />
                            <span className="min-w-0 flex-1 truncate">{m.titulo}</span>
                            {!m.publicado && <Badge variant="outline">Rascunho</Badge>}
                            {outro && outro !== destino && (
                              <Badge variant="secondary">hoje conta em {nomeDisc(outro)}</Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!destino || mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
