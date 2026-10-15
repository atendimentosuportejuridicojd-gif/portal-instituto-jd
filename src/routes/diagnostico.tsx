import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DiagnosticoHeader, OpcaoBotao, TelaPergunta } from "@/components/diagnostico-ui";
import { criarLeadDiagnostico } from "@/lib/diagnostico.functions";
import { getStoredClickId } from "@/lib/google-ads";

const EBOOK_URL = "https://e-book.institutojd.ia.br/";

export const Route = createFileRoute("/diagnostico")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { inicio?: boolean } => ({
    inicio: search.inicio === "1" || search.inicio === 1,
  }),
  head: () => ({
    meta: [
      { title: "O erro de todo concurseiro — Instituto J&D" },
      {
        name: "description",
        content: "Erro de todo concurseiro: estudar só quando o edital sai. Responda 6 perguntas e descubra se você está cometendo esse erro.",
      },
      { property: "og:title", content: "O erro de todo concurseiro" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiagnosticoErroConcurseiro,
});

type Respostas = {
  area?: "tribunais" | "mps" | "indeciso" | "outra";
  habito_estudo?: "so_edital" | "de_vez_em_quando" | "todos_dias" | "nao_comecei";
  tempo_semanal?: "menos_5h" | "5_10h" | "10_20h" | "mais_20h";
  questao1?: "a" | "b" | "c" | "d";
  questao2?: "a" | "b" | "c" | "d";
  meta_vida?: "sim" | "nao_certeza";
};

const TOTAL_PASSOS = 7;

function DiagnosticoErroConcurseiro() {
  const navigate = useNavigate();
  const criarFn = useServerFn(criarLeadDiagnostico);
  const { inicio } = Route.useSearch();

  const [passo, setPasso] = useState(inicio ? 1 : 0);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [resultado, setResultado] = useState<{ pontuacao: number; segmento: string; metaVidaSim: boolean; confirmouErro: boolean } | null>(null);

  const avancar = () => setPasso((p) => p + 1);

  const enviar = useMutation({
    mutationFn: () =>
      criarFn({
        data: {
          pista: "erro_concurseiro",
          area: respostas.area,
          habito_estudo: respostas.habito_estudo,
          tempo_semanal: respostas.tempo_semanal,
          questao1: respostas.questao1!,
          questao2: respostas.questao2!,
          meta_vida: respostas.meta_vida!,
          nome,
          telefone,
          gclid: getStoredClickId(),
        },
      }),
    onSuccess: (r) => {
      setResultado(r);
      avancar();
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível enviar. Tente de novo."),
  });

  const escolher = <K extends keyof Respostas>(campo: K, valor: Respostas[K]) => {
    setRespostas((r) => ({ ...r, [campo]: valor }));
    setTimeout(avancar, 150);
  };

  return (
    <div className="min-h-screen bg-background">
      <DiagnosticoHeader passo={passo} total={TOTAL_PASSOS} />

      {passo === 0 && (
        <main className="mx-auto max-w-xl px-6 py-14 text-center">
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Erro de todo concurseiro: estudar só quando o edital sai. Mude isso na sua vida agora.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Responda 6 perguntas e descubra se você está cometendo esse erro — e o que fazer a partir de hoje.
          </p>
          <Button size="lg" className="mt-8" onClick={avancar}>
            Fazer o diagnóstico <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </main>
      )}

      {passo === 1 && (
        <TelaPergunta titulo="Qual área você tem em mente pra concurso?">
          {[
            ["tribunais", "Tribunais (TJ, TRT, TRF, TST, TSE)"],
            ["mps", "Ministérios Públicos"],
            ["indeciso", "Ainda não decidi, mas quero carreira judiciária"],
            ["outra", "Outra área"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("area", v as Respostas["area"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 2 && (
        <TelaPergunta titulo="Como você estuda hoje?">
          {[
            ["so_edital", "Só estudo quando sai edital de algum concurso"],
            ["de_vez_em_quando", "Estudo de vez em quando, sem rotina fixa"],
            ["todos_dias", "Estudo todos os dias, mesmo sem edital aberto"],
            ["nao_comecei", "Ainda não comecei"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("habito_estudo", v as Respostas["habito_estudo"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 3 && (
        <TelaPergunta titulo="Quanto tempo por semana você consegue dedicar aos estudos?">
          {[
            ["menos_5h", "Menos de 5h"],
            ["5_10h", "5 a 10h"],
            ["10_20h", "10 a 20h"],
            ["mais_20h", "Mais de 20h"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("tempo_semanal", v as Respostas["tempo_semanal"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 4 && (
        <TelaPergunta titulo="Qual alternativa NÃO é um princípio expresso no art. 37 da Constituição Federal?">
          {[
            ["a", "Legalidade"],
            ["b", "Impessoalidade"],
            ["c", "Moralidade"],
            ["d", "Subsidiariedade"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("questao1", v as Respostas["questao1"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 5 && (
        <TelaPergunta titulo="Qual frase está de acordo com a norma-padrão?">
          {[
            ["a", "Fazem dois anos que não vejo meus colegas de trabalho."],
            ["b", "Faz dois anos que não vejo meus colegas de trabalho."],
            ["c", "Fazem dois anos que não vejo meus colega de trabalho."],
            ["d", "Havem dois anos que não vejo meus colegas de trabalho."],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("questao2", v as Respostas["questao2"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 6 && (
        <TelaPergunta titulo="Você já escolheu como meta de vida ser servidor da carreira judiciária?">
          {[
            ["sim", "Sim, essa é minha meta"],
            ["nao_certeza", "Ainda não tenho certeza, mas quero saber mais"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("meta_vida", v as Respostas["meta_vida"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 7 && (
        <TelaPergunta titulo="Pronto! Para onde enviamos seu resultado?">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">WhatsApp</Label>
              <Input
                id="telefone"
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                maxLength={20}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={enviar.isPending}>
              {enviar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ver meu resultado
            </Button>
          </form>
        </TelaPergunta>
      )}

      {passo === 8 && resultado && (
        <main className="mx-auto max-w-xl px-6 py-12">
          {resultado.confirmouErro && (
            <p className="mb-5 border-l-4 border-gold bg-muted p-4 text-sm leading-6">
              Você confirmou: está no grupo que só começa a estudar quando o edital sai — e é exatamente isso que atrasa a aprovação da maioria dos concurseiros.
            </p>
          )}
          {resultado.segmento === "quente" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight">
                Enquanto a maioria só começa quando o edital sai, você já está na frente.
              </h1>
              {resultado.metaVidaSim && (
                <p className="mt-3 text-muted-foreground">Você já deu o passo mais importante: decidiu. Agora falta só o método.</p>
              )}
              <Button
                size="lg"
                className="mt-7 w-full"
                onClick={() => navigate({ to: "/teste", search: { origem: "diagnostico-erro-concurseiro" } })}
              >
                Conhecer a preparação contínua <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
          {resultado.segmento === "morno" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Você tem potencial, mas ainda está no erro que a maioria comete.</h1>
              <p className="mt-3 text-muted-foreground">Comece pelo guia gratuito — ele ajuda a montar uma rotina antes mesmo do edital sair.</p>
              <Button asChild size="lg" className="mt-7 w-full" variant="outline">
                <a href={EBOOK_URL} target="_blank" rel="noreferrer">Baixar guia gratuito</a>
              </Button>
              <Button
                size="lg"
                className="mt-3 w-full"
                onClick={() => navigate({ to: "/teste", search: { origem: "diagnostico-erro-concurseiro" } })}
              >
                Ou já começar o teste grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
          {resultado.segmento === "frio" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Ainda é cedo — e está tudo bem.</h1>
              <p className="mt-3 text-muted-foreground">
                Comece conhecendo a carreira com calma antes de decidir qualquer coisa.
              </p>
              <Button asChild size="lg" className="mt-7 w-full" variant="outline">
                <Link to="/">Conhecer o Instituto J&D</Link>
              </Button>
            </>
          )}
        </main>
      )}
    </div>
  );
}
