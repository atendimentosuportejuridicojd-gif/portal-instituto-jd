import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageContent, PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Target, Plus, Trash2, Link2, PencilLine, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  adminListTrilhas,
  adminUpsertTrilha,
  adminDeleteTrilha,
  adminToggleMaterialTrilha,
  adminToggleConcursoTrilha,
} from "@/lib/trilhas.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CarreirasPicker } from "@/components/carreiras-picker";
import { nomeCarreira } from "@/lib/carreiras";

export const Route = createFileRoute("/_authenticated/admin/trilhas")({
  head: () => ({
    meta: [
      { title: "Trilhas — Admin J&D" },
      { name: "description", content: "Monte as trilhas de preparação vinculando materiais do acervo." },
    ],
  }),
  component: AdminTrilhas,
});

function AdminTrilhas() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListTrilhas);
  const q = useQuery({ queryKey: ["admin", "trilhas"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "trilhas"] });

  const trilhas = q.data?.trilhas ?? [];
  const materiais = q.data?.materiais ?? [];
  const concursos = q.data?.concursos ?? [];
  const ids = new Set(trilhas.map((t: any) => t.id));
  // Raiz = sem pai (ou com pai fora da lista). Filhas ficam agrupadas dentro do pai.
  const raizes = trilhas.filter((t: any) => !t.trilha_pai_id || !ids.has(t.trilha_pai_id));
  const filhasDe = new Map<string, any[]>();
  for (const t of trilhas as any[]) {
    if (t.trilha_pai_id && ids.has(t.trilha_pai_id)) {
      filhasDe.set(t.trilha_pai_id, [...(filhasDe.get(t.trilha_pai_id) ?? []), t]);
    }
  }

  return (
    <>
      <PageHeader
        title="Trilhas de Preparação"
        description="Vincule materiais do acervo. O arquivo permanece único — a trilha apenas cria o vínculo."
        actions={<TrilhaDialog pais={raizes} onDone={invalidate} />}
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : trilhas.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma trilha cadastrada"
            description="Crie as trilhas Técnico e Analista para organizar o estudo."
          />
        ) : (
          <div className="space-y-6">
            {raizes.map((t: any) => {
              const filhas = filhasDe.get(t.id) ?? [];
              return (
                <div key={t.id} className="space-y-3">
                  <TrilhaCard t={t} materiais={materiais} concursos={concursos} pais={raizes} temFilhas={filhas.length > 0} onDone={invalidate} />
                  {filhas.length > 0 && (
                    <div className="ml-4 space-y-3 border-l-2 border-primary/20 pl-4 sm:ml-8 sm:pl-6">
                      {filhas.map((f: any) => (
                        <TrilhaCard key={f.id} t={f} materiais={materiais} concursos={concursos} pais={raizes} temFilhas={false} filha onDone={invalidate} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PageContent>
    </>
  );
}

function TrilhaCard({
  t,
  materiais,
  concursos,
  pais,
  temFilhas,
  filha,
  onDone,
}: {
  t: any;
  materiais: any[];
  concursos: any[];
  pais: any[];
  temFilhas: boolean;
  filha?: boolean;
  onDone: () => void;
}) {
  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{t.nome}</h2>
          <p className="text-xs text-muted-foreground">
            {filha ? "Subtrilha · " : temFilhas ? "Órgão · " : ""}
            {t.materiais.length} material(is) vinculado(s)
            {(t.concurso_ids ?? []).length > 0 && ` · ${t.concurso_ids.length} concurso(s)`} ·{" "}
            {(t.carreiras ?? []).map((c: string) => nomeCarreira(c)).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VincularDialog
            titulo={t.nome}
            materiais={materiais}
            vinculados={t.materiais.filter((m: any) => !m.via_concurso).map((m: any) => m.id)}
            onToggle={(materialId, vincular) => ({
              trilha_id: t.id,
              material_id: materialId,
              vincular,
            })}
            onDone={onDone}
          />
          <VincularConcursosDialog trilha={t} concursos={concursos} onDone={onDone} />
          <TrilhaDialog trilha={t} pais={pais} onDone={onDone} />
          <DeleteTrilha id={t.id} onDone={onDone} />
        </div>
      </div>
      {t.materiais.length > 0 && (
        <ul className="mt-4 space-y-2">
          {t.materiais.map((m: any) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <span className="truncate">
                {m.titulo} <span className="text-xs text-muted-foreground">· {m.disciplina}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {m.via_concurso && <Badge variant="secondary">via concurso</Badge>}
                {!m.tem_arquivo && <Badge variant="outline" className="text-destructive">Sem arquivo</Badge>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeleteTrilha({ id, onDone }: { id: string; onDone: () => void }) {
  const fn = useServerFn(adminDeleteTrilha);
  const mut = useMutation({
    mutationFn: () => fn({ data: { id } }),
    onSuccess: () => {
      toast.success("Trilha removida.");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      onClick={() => confirm("Excluir esta trilha?") && mut.mutate()}
      disabled={mut.isPending}
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      Excluir
    </Button>
  );
}

function TrilhaDialog({ trilha, pais = [], onDone }: { trilha?: any; pais?: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(trilha?.nome ?? "");
  const [descricao, setDescricao] = useState(trilha?.descricao ?? "");
  const [ordem, setOrdem] = useState(String(trilha?.ordem ?? 0));
  const [carreiras, setCarreiras] = useState<string[]>(trilha?.carreiras ?? ["judiciaria"]);
  const [paiId, setPaiId] = useState<string>(trilha?.trilha_pai_id ?? "none");
  const fn = useServerFn(adminUpsertTrilha);

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          id: trilha?.id,
          nome,
          descricao,
          ordem: Number(ordem) || 0,
          carreiras: carreiras as any,
          trilha_pai_id: paiId === "none" ? null : paiId,
        },
      }),
    onSuccess: () => {
      toast.success("Trilha salva.");
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trilha ? (
          <Button variant="ghost" size="sm">
            <PencilLine className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Nova trilha
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{trilha ? "Editar trilha" : "Nova trilha"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-nome">Nome</Label>
            <Input
              id="t-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Técnico Judiciário"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea id="t-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-ordem">Ordem</Label>
            <Input id="t-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Trilha-pai (órgão)</Label>
            <Select value={paiId} onValueChange={setPaiId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (trilha principal)</SelectItem>
                {pais
                  .filter((p: any) => p.id !== trilha?.id)
                  .map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <CarreirasPicker value={carreiras} onChange={setCarreiras} />
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !nome.trim() || carreiras.length === 0}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VincularDialog({
  titulo,
  materiais,
  vinculados,
  onToggle,
  onDone,
}: {
  titulo: string;
  materiais: any[];
  vinculados: string[];
  onToggle: (materialId: string, vincular: boolean) => any;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(adminToggleMaterialTrilha);
  const mut = useMutation({
    mutationFn: (payload: any) => fn({ data: payload }),
    onSuccess: () => onDone(),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="mr-1 h-3.5 w-3.5" />
          Vincular materiais
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Materiais de {titulo}</DialogTitle>
          <DialogDescription>
            Marque os materiais do acervo que fazem parte desta trilha.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {materiais.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum material no acervo ainda.</p>
          )}
          {agruparPorDisciplina(materiais).map((grupo) => (
            <div key={grupo.disciplina} className="rounded-lg border border-border/60">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2">
                <p className="text-sm font-semibold">{grupo.disciplina}</p>
                <span className="text-xs text-muted-foreground">
                  {grupo.materiais.filter((m: any) => vinculados.includes(m.id)).length}/
                  {grupo.materiais.length}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {grupo.materiais.map((m: any) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <Checkbox
                      checked={vinculados.includes(m.id)}
                      onCheckedChange={(v) => mut.mutate(onToggle(m.id, !!v))}
                    />
                    <span className="min-w-0 flex-1 truncate">{m.titulo}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VincularConcursosDialog({
  trilha,
  concursos,
  onDone,
}: {
  trilha: any;
  concursos: any[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fn = useServerFn(adminToggleConcursoTrilha);
  const vinculados: string[] = trilha.concurso_ids ?? [];
  const mut = useMutation({
    mutationFn: (payload: { concurso_id: string; vincular: boolean }) =>
      fn({ data: { trilha_id: trilha.id, ...payload } }),
    onSuccess: () => onDone(),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trophy className="mr-1 h-3.5 w-3.5" />
          Vincular concursos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Concursos de {trilha.nome}</DialogTitle>
          <DialogDescription>
            Marque os concursos desta trilha. As matérias vinculadas a cada concurso passam a fazer parte da
            trilha automaticamente — nada é copiado, então acompanha mudanças futuras no concurso.
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border/60 rounded-lg border border-border/60">
          {concursos.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Nenhum concurso cadastrado.</p>
          )}
          {concursos.map((c: any) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
              <Checkbox
                checked={vinculados.includes(c.id)}
                onCheckedChange={(v) => mut.mutate({ concurso_id: c.id, vincular: !!v })}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{c.nome}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[c.orgao, c.banca, c.ano].filter(Boolean).join(" · ")}
                  {" · "}
                  {c.total_materias} matéria(s)
                </span>
              </span>
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function agruparPorDisciplina(materiais: any[]) {
  const mapa = new Map<string, any[]>();
  for (const m of materiais) {
    const chave = m.disciplina ?? "Sem disciplina";
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave)!.push(m);
  }
  return [...mapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([disciplina, itens]) => ({ disciplina, materiais: itens }));
}
