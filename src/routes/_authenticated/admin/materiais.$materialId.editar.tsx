import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageContent, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Eye, Loader2, Save, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { MateriaMarkdown } from "@/lib/materia-markdown";
import {
  adminGetMaterialConteudo,
  adminSalvarMaterialConteudo,
} from "@/lib/acervo.functions";

export const Route = createFileRoute("/_authenticated/admin/materiais/$materialId/editar")({
  head: () => ({
    meta: [
      { title: "Editar matéria — Admin J&D" },
      {
        name: "description",
        content: "Escreva e revise o texto da matéria do acervo base.",
      },
    ],
  }),
  component: AdminEditarMateria,
});

function AdminEditarMateria() {
  const { materialId } = Route.useParams();
  const getFn = useServerFn(adminGetMaterialConteudo);
  const saveFn = useServerFn(adminSalvarMaterialConteudo);

  const q = useQuery({
    queryKey: ["admin", "material-conteudo", materialId],
    queryFn: () => getFn({ data: { material_id: materialId } }),
  });

  const [texto, setTexto] = useState("");
  const [resumo, setResumo] = useState("");
  const [publicado, setPublicado] = useState(true);
  const [aba, setAba] = useState<"editar" | "previa">("editar");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (q.data && !carregado) {
      setTexto(q.data.conteudo_md);
      setResumo(q.data.resumo);
      setPublicado(q.data.publicado);
      setCarregado(true);
    }
  }, [q.data, carregado]);

  const salvar = useMutation({
    mutationFn: () =>
      saveFn({
        data: { material_id: materialId, conteudo_md: texto, resumo, publicado },
      }),
    onSuccess: () => toast.success("Matéria salva."),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title={q.data?.titulo ?? "Editar matéria"}
        description={
          q.data ? `${q.data.disciplina} · edição do texto da matéria` : "Carregando…"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/acervo">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Voltar ao acervo
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => salvar.mutate()}
              disabled={salvar.isPending || !carregado}
            >
              {salvar.isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1 h-3.5 w-3.5" />
              )}
              Salvar
            </Button>
          </div>
        }
      />
      <PageContent>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : q.isError ? (
          <div className="text-sm text-destructive">{(q.error as any)?.message}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={aba === "editar" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setAba("editar")}
                >
                  <PencilLine className="mr-1 h-3.5 w-3.5" />
                  Escrever
                </Button>
                <Button
                  variant={aba === "previa" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setAba("previa")}
                >
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Pré-visualizar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="publicado" className="text-xs">
                  Publicado
                </Label>
                <Switch id="publicado" checked={publicado} onCheckedChange={setPublicado} />
              </div>
            </div>

            {aba === "editar" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resumo">Resumo (opcional)</Label>
                  <Textarea
                    id="resumo"
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conteudo">Texto da matéria (markdown)</Label>
                  <Textarea
                    id="conteudo"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={30}
                    className="font-mono text-sm leading-relaxed"
                    placeholder={"# Título da matéria\n\n## Subitem\n\n### Seção\n\nTexto…"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Títulos: H1 (matéria), H2 (subitem), H3 (seção). Diretivas aceitas:
                    :::legislacao, :::atencao e :::exemplo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="surface-card p-5">
                {texto.trim() ? (
                  <MateriaMarkdown markdown={texto} />
                ) : (
                  <p className="text-sm text-muted-foreground">Nada escrito ainda.</p>
                )}
              </div>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}
