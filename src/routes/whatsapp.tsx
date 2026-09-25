import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MessageCircle } from "lucide-react";

import lockupAsset from "@/assets/lockup-jd.png.asset.json";
import { Button } from "@/components/ui/button";
import { trackConversion } from "@/lib/google-ads";

const WHATSAPP_URL =
  "https://wa.me/5548991119813?text=Ol%C3%A1!%20Vi%20o%20an%C3%BAncio%20e%20quero%20fazer%20minha%20avalia%C3%A7%C3%A3o%20de%20desempenho%20gratuita%20e%20tamb%C3%A9m%20conhecer%20outros%20benef%C3%ADcios%20gratuitos.";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "Fale com o Instituto J&D pelo WhatsApp" },
      {
        name: "description",
        content:
          "Converse com o Instituto J&D e solicite sua avaliação de desempenho gratuita pelo WhatsApp.",
      },
      { property: "og:title", content: "Fale com o Instituto J&D pelo WhatsApp" },
      {
        property: "og:description",
        content:
          "Solicite sua avaliação de desempenho gratuita e conheça outros benefícios do Instituto J&D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-primary px-5 py-10 text-primary-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gold"
      />

      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <img
          src={lockupAsset.url}
          alt="Instituto J&D — Carreira Judiciária 360"
          width={420}
          height={138}
          loading="eager"
          decoding="async"
          className="h-auto w-full max-w-sm rounded-md object-contain sm:max-w-md"
        />

        <div className="mt-10 h-px w-16 bg-gold" aria-hidden="true" />

        <p className="mt-8 text-xs font-semibold uppercase text-gold">
          Atendimento Instituto J&D
        </p>
        <h1 className="mt-4 max-w-xl text-3xl font-bold sm:text-5xl">
          Sua avaliação gratuita começa por aqui.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/75 sm:text-lg">
          Fale com nossa equipe pelo WhatsApp para fazer sua avaliação de desempenho e conhecer outros benefícios gratuitos.
        </p>

        <Button
          asChild
          size="lg"
          className="mt-9 h-14 bg-gold px-7 text-base font-semibold text-gold-foreground shadow-lg hover:bg-gold/90"
        >
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              event.preventDefault();
              const whatsappWindow = window.open("", "_blank");
              trackConversion("AW-18069973013/8z4nCIismIUdEJXQt6hD", () => {
                if (whatsappWindow) {
                  whatsappWindow.opener = null;
                  whatsappWindow.location.href = WHATSAPP_URL;
                  return;
                }
                window.location.href = WHATSAPP_URL;
              });
            }}
          >
            <MessageCircle className="size-6" aria-hidden="true" />
            Conversar pelo WhatsApp
            <ExternalLink className="size-4 opacity-70" aria-hidden="true" />
          </a>
        </Button>

        <p className="mt-5 text-xs text-primary-foreground/55">
          Você será direcionado ao WhatsApp com a mensagem pronta.
        </p>
      </section>
    </main>
  );
}