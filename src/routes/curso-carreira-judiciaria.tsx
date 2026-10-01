import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  MessageCircleQuestion,
  MonitorSmartphone,
} from "lucide-react";
import lockupAsset from "@/assets/lockup-jd.png.asset.json";
import perfilJohnLucasAsset from "@/assets/perfil-john-lucas.jpeg.asset.json";
import { Button } from "@/components/ui/button";

const PAGE_URL = "https://portal.institutojd.ia.br/curso-carreira-judiciaria";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.04 3C8.86 3 3.02 8.77 3.02 15.87c0 2.27.6 4.48 1.74 6.42L3 28.72l6.63-1.72a13.14 13.14 0 0 0 6.4 1.64h.01c7.18 0 13.02-5.77 13.02-12.87C29.06 8.77 23.22 3 16.04 3Zm0 23.47h-.01a10.9 10.9 0 0 1-5.55-1.5l-.4-.24-3.93 1.02 1.05-3.79-.26-.4a10.58 10.58 0 0 1-1.67-5.69c0-5.9 4.83-10.7 10.77-10.7 5.94 0 10.77 4.8 10.77 10.7 0 5.85-4.83 10.6-10.77 10.6Zm5.91-7.94c-.32-.16-1.92-.94-2.22-1.05-.3-.11-.51-.16-.73.16-.22.32-.84 1.05-1.03 1.26-.19.22-.38.24-.7.08-.33-.16-1.37-.5-2.61-1.59a9.78 9.78 0 0 1-1.81-2.23c-.19-.32-.02-.5.14-.66.15-.14.33-.38.49-.57.16-.19.22-.32.32-.54.11-.21.06-.4-.02-.56-.08-.16-.73-1.74-1-2.39-.27-.63-.54-.55-.73-.56h-.62c-.22 0-.57.08-.87.4-.3.32-1.14 1.1-1.14 2.69 0 1.58 1.17 3.12 1.33 3.33.16.22 2.3 3.48 5.57 4.88.78.33 1.39.53 1.86.68.78.25 1.49.21 2.05.13.63-.09 1.92-.78 2.19-1.53.27-.75.27-1.4.19-1.53-.08-.14-.3-.22-.62-.38Z" />
    </svg>
  );
}

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
    <div className="min-h-screen bg-background font-course-body text-foreground">
      <header className="border-b border-sidebar-border bg-sidebar">
        <div className="mx-auto flex max-w-7xl justify-center px-5 py-8 sm:py-10">
          <img src={lockupAsset.url} alt="Instituto J&D — Carreira Judiciária 360" width={840} height={276} className="h-32 w-auto object-contain sm:h-40" />
        </div>
      </header>

      <main>
        <section className="border-b border-border bg-background">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:py-24">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-bold uppercase text-primary">
                <span className="size-2 rounded-full bg-gold" /> Curso Carreira Judiciária 360
              </div>
              <h1 className="mt-7 font-course-heading text-4xl font-bold leading-tight text-primary sm:text-6xl">
                Sua <span className="text-gold">preparação continuada</span> antes do edital sair
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground lg:mx-0">
                Técnico, Analista e Oficial de Justiça (Tribunais e MPs). Preparação contínua, atualizada todos os dias e em tempo real.
              </p>
              <div className="mt-9">
                <Button asChild size="lg" className="min-h-14 bg-primary px-8 font-bold text-primary-foreground shadow-xl hover:bg-primary/90">
                  <Link to="/teste">Começar meu teste grátis de 5 dias <ArrowRight /></Link>
                </Button>
              </div>
            </div>
            <div className="border border-border bg-card p-5 shadow-2xl sm:p-7">
              <p className="text-xs font-bold uppercase text-gold">O que você encontra</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {BENEFICIOS.map(({ icon: Icon, text }, index) => (
                  <div key={text} className={index === 1 ? "bg-primary p-5 text-primary-foreground" : "border border-border bg-background p-5 text-card-foreground"}>
                    <Icon className={index === 1 ? "size-7 text-gold" : "size-7 text-primary"} />
                    <p className="mt-5 font-semibold leading-6">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between gap-4 bg-gold px-5 py-4 text-gold-foreground">
                <div><p className="text-xs font-semibold uppercase">Comece hoje</p><p className="mt-1 font-bold">5 dias para conhecer o portal</p></div>
                <ArrowRight className="size-6 shrink-0" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
              <div>
                <p className="text-sm font-bold uppercase text-gold">Como funciona</p>
                <h2 className="mt-3 font-course-heading text-3xl font-bold text-primary sm:text-4xl">Um ciclo direto de estudo e prática</h2>
                <ol className="mt-8 space-y-5">
                  {COMO_FUNCIONA.map((item, index) => (
                    <li key={item} className="flex gap-4">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold font-bold text-gold-foreground">{index + 1}</span>
                      <p className="pt-1 leading-7 text-muted-foreground">{item}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="border-l border-gold/40 pl-7 sm:pl-10">
                <p className="text-sm font-bold uppercase text-gold">Método Instituto J&D</p>
                <p className="mt-4 font-course-heading text-2xl font-semibold leading-9 text-primary">Conteúdo e prática reunidos em uma rotina simples, clara e mensurável.</p>
                <p className="mt-5 leading-7 text-muted-foreground">Cada tema leva você da leitura às questões comentadas e ao acompanhamento do próprio desempenho.</p>
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
                <h2 className="mt-3 font-course-heading text-3xl font-bold text-primary">Sobre o autor</h2>
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
                  <h2 className="font-course-heading text-3xl font-bold text-primary">Perguntas frequentes</h2>
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
       <Button asChild size="lg" className="fixed bottom-5 right-5 z-50 min-h-14 bg-whatsapp px-5 font-bold text-whatsapp-foreground shadow-2xl hover:bg-whatsapp/90 sm:bottom-7 sm:right-7">
         <a href="https://wa.me/5548991119813" target="_blank" rel="noreferrer">
           <WhatsAppIcon className="size-6" />
           Fale com a nossa equipe
         </a>
       </Button>
    </div>
  );
}