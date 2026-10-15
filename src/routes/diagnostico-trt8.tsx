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

export const Route = createFileRoute("/diagnostico-trt8")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diagnóstico: você está preparado para o TRT8? — Instituto J&D" },
      {
        name: "description",
        content: "Responda 6 perguntas rápidas e descubra seu nível de preparação para o concurso do TRT8 2026.",
      },
      { property: "og:title", content: "Diagnóstico: você está preparado para o TRT8?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiagnosticoTrt8,
});

type Respostas = {
  cargo?: "tecnico" | "analista" | "oficial_justica" | "indeciso";
  tempo_estudo?: "nunca" | "menos_6m" | "6_12m" | "mais_1ano";
  dificuldade?: "nao_sei_comecar" | "falta_tempo" | "nao_sei_o_que_cai" | "sem_evolucao";
  questao1?: "a" | "b" | "c" | "d";
  questao2?: "a" | "b" | "c" | "d";
  meta_vida?: "sim" | "nao_certeza";
};

const TOTAL_PASSOS = 7;

function DiagnosticoTrt8() {
  const navigate = useNavigate();
  const criarFn = useServerFn(criarLeadDiagnostico);

  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [resultado, setResultado] = useState<{ pontuacao: number; segmento: string; metaVidaSim: boolean } | null>(null);

  const avancar = () => setPasso((p) => p + 1);

  const enviar = useMutation({
    mutationFn: () =>
      criarFn({
        data: {
          pista: "trt8",
          cargo: respostas.cargo,
          tempo_estudo: respostas.tempo_estudo,
          dificuldade: respostas.dificuldade!,
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
            Você está preparado para o concurso do TRT8?
          </h1>
          <p className="mt-4 text-muted-foreground">
            Responda 6 perguntas rápidas e descubra seu nível de preparação — e o que fazer a partir de hoje.
          </p>
          <Button size="lg" className="mt-8" onClick={avancar}>
            Começar diagnóstico <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </main>
      )}

      {passo === 1 && (
        <TelaPergunta titulo="Qual cargo você pretende prestar?">
          {[
            ["tecnico", "Técnico Judiciário"],
            ["analista", "Analista Judiciário"],
            ["oficial_justica", "Oficial de Justiça"],
            ["indeciso", "Ainda não decidi"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("cargo", v as Respostas["cargo"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 2 && (
        <TelaPergunta titulo="Há quanto tempo você estuda para concursos?">
          {[
            ["nunca", "Nunca estudei"],
            ["menos_6m", "Menos de 6 meses"],
            ["6_12m", "6 meses a 1 ano"],
            ["mais_1ano", "Mais de 1 ano"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("tempo_estudo", v as Respostas["tempo_estudo"])} />
          ))}
        </TelaPergunta>
      )}

      {passo === 3 && (
        <TelaPergunta titulo="Qual sua maior dificuldade hoje?">
          {[
            ["nao_sei_comecar", "Não sei por onde começar"],
            ["falta_tempo", "Não tenho tempo pra estudar todo dia"],
            ["nao_sei_o_que_cai", "Não sei o que realmente cai na prova"],
            ["sem_evolucao", "Já estudo, mas não vejo evolução"],
          ].map(([v, l]) => (
            <OpcaoBotao key={v} label={l} onClick={() => escolher("dificuldade", v as Respostas["dificuldade"])} />
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
          {resultado.segmento === "quente" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Seu perfil mostra que você já está pronto pra acelerar.</h1>
              {resultado.metaVidaSim && (
                <p className="mt-3 text-muted-foreground">Você já deu o passo mais importante: decidiu. Agora falta só o método.</p>
              )}
              <Button
                size="lg"
                className="mt-7 w-full"
                onClick={() => navigate({ to: "/teste", search: { origem: "diagnostico-trt8" } })}
              >
                Começar meu teste grátis de 5 dias <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
          {resultado.segmento === "morno" && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Você está no caminho, mas ainda dá pra fechar lacunas.</h1>
              <p className="mt-3 text-muted-foreground">Comece pelo guia gratuito — ele resume o essencial pra organizar os próximos passos.</p>
              <Button asChild size="lg" className="mt-7 w-full" variant="outline">
                <a href={EBOOK_URL} target="_blank" rel="noreferrer">Baixar guia gratuito</a>
              </Button>
              <Button
                size="lg"
                className="mt-3 w-full"
                onClick={() => navigate({ to: "/teste", search: { origem: "diagnostico-trt8" } })}
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
