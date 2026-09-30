import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  MessageCircle,
  MessageCircleQuestion,
  MonitorSmartphone,
} from "lucide-react";
import lockupAsset from "@/assets/lockup-jd.png.asset.json";
import perfilJohnLucasAsset from "@/assets/perfil-john-lucas.jpeg.asset.json";
import { Button } from "@/components/ui/button";

const PAGE_URL = "https://portal.institutojd.ia.br/curso-carreira-judiciaria";

const COMO_FUNCIONA = [
  "Leia o artigo do tema, escrito direto no portal. Sem vídeo, sem PDF, nada para baixar.",
  "Marque como lido.",
  "Vá direto às questões comentadas daquele tema, de bancas reais.",
  "Acompanhe seu desempenho: o monitor mostra como você está a cada tema fechado.",
];

const BENEFICIOS = [
  { icon: BookOpen, text: "Acesso a todo o acervo do portal" },
  { icon: Clock3, text: "Conteúdo atualizado todos os dias, em tempo real" },
  { icon: MonitorSmartphone, text: "Estudo pelo celular ou pelo computador" },
  { icon: MessageCircleQuestion, text: "Suporte para tirar dúvidas" },
];

const FAQ = [
  {
    question: "Estudar só por artigo, sem videoaula, funciona?",
    answer:
      "O conteúdo é escrito em artigos diretos, seguidos das questões comentadas do mesmo tema, para você ler e praticar logo depois. No teste de 5 dias você experimenta o método antes de decidir.",
  },
  { question: "Posso estudar pelo celular?", answer: "Sim, pelo celular e pelo computador." },
  { question: "Preciso baixar ou imprimir algo?", answer: "Não. Tudo abre direto no portal." },
  { question: "Preciso de cartão para testar?", answer: "Não. É um cadastro sem compromisso." },
  {
    question: "O que acontece depois dos 5 dias?",
    answer: "O acesso ao conteúdo é bloqueado e você decide se quer assinar. Seu progresso não se perde.",
  },
  { question: "Quanto custa? Tem fidelidade?", answer: "R$ 76,90 por mês, sem fidelidade." },
  {
    question: "Como cancelo ou peço reembolso?",
    answer: "Tudo pela Hotmart, dentro da garantia de 7 dias.",
  },
  { question: "O conteúdo é atualizado?", answer: "Sim, todos os dias e em tempo real." },
  { question: "Tem suporte?", answer: "Sim, você pode tirar dúvidas sobre as questões." },
];

export const Route = createFileRoute("/curso-carreira-judiciaria")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Curso Carreira Judiciária 360 | Teste grátis 5 dias" },
      {
        name: "description",
        content:
          "Curso Carreira Judiciária 360 para Técnico, Analista e Oficial de Justiça. Teste grátis por 5 dias, sem cartão, com acesso imediato.",
      },
      { property: "og:title", content: "Curso Carreira Judiciária 360 | Teste grátis 5 dias" },
      {
        property: "og:description",
        content:
          "Preparação contínua para Técnico, Analista e Oficial de Justiça, com teste grátis por 5 dias.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: CursoCarreiraJudiciariaPage,
});

function CursoCarreiraJudiciariaPage() {
  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground">
      <header className="border-b border-sidebar-border bg-sidebar/95">
        <div className="mx-auto flex max-w-6xl justify-center px-5 py-8 sm:py-10">
          <img src={lockupAsset.url} alt="Instituto J&D — Carreira Judiciária 360" width={840} height={276} className="h-36 w-auto object-contain sm:h-44" />
        </div>
      </header>

      <main>
        <section className="border-b border-sidebar-border">
          <div className="mx-auto max-w-5xl px-5 py-12 text-center sm:py-16">
            <div className="mx-auto max-w-4xl">
              <p className="text-sm font-bold uppercase text-gold">Curso Carreira Judiciária 360</p>
              <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-sidebar-foreground sm:text-6xl">
                Sua <span className="text-gold">preparação continuada</span> antes do edital sair
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-sidebar-foreground/75 sm:text-lg">
                Técnico, Analista e Oficial de Justiça (Tribunais e MPs). Preparação contínua, atualizada todos os dias e em tempo real.
              </p>
              <div className="mt-8">
                <Button asChild size="lg" className="bg-gold font-bold text-gold-foreground hover:bg-gold/90">
                  <Link to="/teste">Começar meu teste grátis de 5 dias <ArrowRight /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <p className="text-sm font-bold uppercase text-gold">Como funciona</p>
                <h2 className="mt-3 text-3xl font-bold text-primary sm:text-4xl">Um ciclo direto de estudo e prática</h2>
                <ol className="mt-8 space-y-5">
                  {COMO_FUNCIONA.map((item, index) => (
                    <li key={item} className="flex gap-4">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold font-bold text-gold-foreground">{index + 1}</span>
                      <p className="pt-1 leading-7 text-muted-foreground">{item}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-sm font-bold uppercase text-gold">No teste de 5 dias você tem</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {BENEFICIOS.map(({ icon: Icon, text }) => (
                    <div key={text} className="rounded-md border border-border bg-card p-5 shadow-sm">
                      <Icon className="size-6 text-gold" />
                      <p className="mt-4 font-semibold leading-6 text-card-foreground">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-sidebar-border bg-sidebar">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-gold">Depois do teste</p>
              <p className="mt-3 max-w-4xl text-lg leading-8 text-sidebar-foreground/80">
                Se gostar, assine por R$ 76,90 por mês, sem fidelidade. A assinatura tem garantia de 7 dias e o seu progresso fica salvo. Assinatura, cancelamento e reembolso são feitos pela Hotmart.
              </p>
            </div>
            <CheckCircle2 className="hidden size-12 text-gold md:block" />
          </div>
        </section>

        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
              <div className="grid gap-7 sm:grid-cols-[180px_1fr] sm:items-center lg:grid-cols-1 lg:items-start xl:grid-cols-[200px_1fr] xl:items-center">
                <img
                  src={perfilJohnLucasAsset.url}
                  alt="John Lucas Rodrigues, fundador do Instituto J&D"
                  width={847}
                  height={768}
                  className="aspect-[4/5] w-full max-w-[220px] rounded-md border border-gold/30 object-cover object-top shadow-lg"
                />
                <div>
                <p className="text-sm font-bold uppercase text-gold">Quem está por trás</p>
                <h2 className="mt-3 text-3xl font-bold text-primary">Sobre o autor</h2>
                <div className="mt-5 border-l-4 border-gold pl-5">
                  <p className="text-xl font-bold text-primary">John Lucas Rodrigues</p>
                  <p className="mt-1 text-muted-foreground">Fundador do Instituto J&D</p>
                </div>
                <p className="mt-5 leading-7 text-muted-foreground">
                  Especialista na Carreira Judiciária, dedica-se a ensinar candidatos a construírem uma preparação inteligente para os concursos dos Tribunais e Ministérios Públicos. Sua metodologia é baseada em estratégia, constância e visão profunda da carreira.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase text-primary">
                  <span className="border border-gold/40 bg-gold/10 px-3 py-2">Especialista</span>
                  <span className="border border-gold/40 bg-gold/10 px-3 py-2">Método próprio</span>
                  <span className="border border-gold/40 bg-gold/10 px-3 py-2">Autor J&D</span>
                </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CircleHelp className="size-7 text-gold" />
                  <h2 className="text-3xl font-bold text-primary">Perguntas frequentes</h2>
                </div>
                <div className="mt-6 divide-y divide-border border-y border-border">
                  {FAQ.map((item) => (
                    <details key={item.question} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-primary">
                        {item.question}
                        <span className="text-xl text-gold transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-3 pr-8 leading-7 text-muted-foreground">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-sidebar-border bg-sidebar">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-5 py-14 text-center">
            <Check className="size-9 text-gold" />
            <Button asChild size="lg" className="mt-7 bg-gold font-bold text-gold-foreground hover:bg-gold/90">
               <Link to="/teste">Começar meu teste grátis de 5 dias <ArrowRight /></Link>
            </Button>
          </div>
        </section>
      </main>
       <Button asChild size="lg" className="fixed bottom-5 right-5 z-50 bg-gold font-bold text-gold-foreground shadow-2xl hover:bg-gold/90 sm:bottom-7 sm:right-7">
         <a href="https://wa.me/5548991119813" target="_blank" rel="noreferrer">
           <MessageCircle />
           Fale com a nossa equipe
         </a>
       </Button>
    </div>
  );
}