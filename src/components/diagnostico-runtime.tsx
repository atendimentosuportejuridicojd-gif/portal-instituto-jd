import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DiagnosticoHeader, OpcaoBotao, TelaPergunta } from "@/components/diagnostico-ui";
import { criarLeadDiagnostico } from "@/lib/diagnostico.functions";
import { getPistaPublica } from "@/lib/pistas-diagnostico.functions";
import { getStoredClickId } from "@/lib/google-ads";

const EBOOK_URL = "https://e-book.institutojd.ia.br/";

export function DiagnosticoRuntime({ slug, inicio }: { slug: string; inicio?: boolean }) {
  const navigate = useNavigate();
  const pistaFn = useServerFn(getPistaPublica);
  const criarFn = useServerFn(criarLeadDiagnostico);

  const pistaQuery = useQuery({ queryKey: ["diagnostico-pista", slug], queryFn: () => pistaFn({ data: { slug } }) });

  const [passo, setPasso] = useState(inicio ? 1 : 0);
  const [respostasPerfil, setRespostasPerfil] = useState<Record<string, string>>({});
  const [questao1, setQuestao1] = useState<string | null>(null);
  const [questao2, setQuestao2] = useState<string | null>(null);
  const [fechamento, setFechamento] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [resultado, setResultado] = useState<{ pontuacao: number; segmento: string; mensagem: any } | null>(null);

  const avancar = () => setPasso((p) => p + 1);

  const enviar = useMutation({
    mutationFn: () =>
      criarFn({
        data: {
          pista_slug: slug,
          respostas_perfil: respostasPerfil,
          questao1: questao1!,
          questao2: questao2!,
          fechamento: fechamento!,
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

  if (pistaQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pistaQuery.isError || !pistaQuery.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {(pistaQuery.error as any)?.message ?? "Diagnóstico não encontrado."}
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    );
  }

  const pista = pistaQuery.data;
  const perguntasPerfil = pista.perguntas_perfil as { campo: string; pergunta: string; opcoes: { valor: string; label: string }[] }[];
  const fechamentoPergunta = pista.pergunta_fechamento as { pergunta: string; opcoes: { valor: string; label: string }[] };
  const totalPassos = perguntasPerfil.length + 4; // perfil + 2 questões + fechamento + captura

  const passoQuestao1 = perguntasPerfil.length + 1;
  const passoQuestao2 = passoQuestao1 + 1;
  const passoFechamento = passoQuestao2 + 1;
  const passoCaptura = passoFechamento + 1;
  const passoResultado = passoCaptura + 1;

  return (
    <div className="min-h-screen bg-background">
      <DiagnosticoHeader passo={passo} total={totalPassos} />

      {passo === 0 && (
        <main className="mx-auto max-w-xl px-6 py-14 text-center">
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{pista.gancho_titulo}</h1>
          <p className="mt-4 text-muted-foreground">{pista.gancho_subtexto}</p>
          <Button size="lg" className="mt-8" onClick={avancar}>
            {pista.cta_texto} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </main>
      )}

      {perguntasPerfil.map((pergunta, i) => (
        passo === i + 1 && (
          <TelaPergunta key={pergunta.campo} titulo={pergunta.pergunta}>
            {pergunta.opcoes.map((op) => (
              <OpcaoBotao
                key={op.valor}
                label={op.label}
                onClick={() => {
                  setRespostasPerfil((r) => ({ ...r, [pergunta.campo]: op.valor }));
                  setTimeout(avancar, 150);
                }}
              />
            ))}
          </TelaPergunta>
        )
      ))}

      {passo === passoQuestao1 && (
        <TelaPergunta titulo={(pista.questao1 as any).pergunta}>
          {(pista.questao1 as any).opcoes.map((op: any) => (
            <OpcaoBotao key={op.valor} label={op.label} onClick={() => { setQuestao1(op.valor); setTimeout(avancar, 150); }} />
          ))}
        </TelaPergunta>
      )}

      {passo === passoQuestao2 && (
        <TelaPergunta titulo={(pista.questao2 as any).pergunta}>
          {(pista.questao2 as any).opcoes.map((op: any) => (
            <OpcaoBotao key={op.valor} label={op.label} onClick={() => { setQuestao2(op.valor); setTimeout(avancar, 150); }} />
          ))}
        </TelaPergunta>
      )}

      {passo === passoFechamento && (
        <TelaPergunta titulo={fechamentoPergunta.pergunta}>
          {fechamentoPergunta.opcoes.map((op) => (
            <OpcaoBotao key={op.valor} label={op.label} onClick={() => { setFechamento(op.valor); setTimeout(avancar, 150); }} />
          ))}
        </TelaPergunta>
      )}

      {passo === passoCaptura && (
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

      {passo === passoResultado && resultado && (
        <main className="mx-auto max-w-xl px-6 py-12">
          {resultado.segmento === "quente" && <CheckCircle2 className="h-10 w-10 text-emerald-600" />}
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{resultado.mensagem.titulo}</h1>
          {resultado.mensagem.subtitulo && (
            <p className="mt-3 text-muted-foreground">{resultado.mensagem.subtitulo}</p>
          )}
          {resultado.mensagem.cta_acao === "teste_gratis" && (
            <Button size="lg" className="mt-7 w-full" onClick={() => navigate({ to: "/teste", search: { origem: `diagnostico-${slug}` } })}>
              {resultado.mensagem.cta_label} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {resultado.mensagem.cta_acao === "guia_gratuito" && (
            <>
              <Button asChild size="lg" className="mt-7 w-full" variant="outline">
                <a href={EBOOK_URL} target="_blank" rel="noreferrer">{resultado.mensagem.cta_label}</a>
              </Button>
              <Button size="lg" className="mt-3 w-full" onClick={() => navigate({ to: "/teste", search: { origem: `diagnostico-${slug}` } })}>
                Ou já começar o teste grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
          {resultado.mensagem.cta_acao === "nenhum" && (
            <Button asChild size="lg" className="mt-7 w-full" variant="outline">
              <Link to="/">{resultado.mensagem.cta_label}</Link>
            </Button>
          )}
        </main>
      )}
    </div>
  );
}
