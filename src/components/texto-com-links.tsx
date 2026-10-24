import { Fragment } from "react";

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

/**
 * Renderiza texto livre preservando as quebras de linha digitadas
 * e transformando endereços (http/https/www) em links clicáveis.
 */
export function TextoComLinks({ texto, className }: { texto: string; className?: string }) {
  const partes = texto.split(URL_REGEX);
  return (
    <p className={className} style={{ whiteSpace: "pre-line" }}>
      {partes.map((parte, i) => {
        if (/^(https?:\/\/|www\.)/.test(parte)) {
          const href = parte.startsWith("www.") ? `https://${parte}` : parte;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline underline-offset-2 hover:opacity-80"
            >
              {parte}
            </a>
          );
        }
        return <Fragment key={i}>{parte}</Fragment>;
      })}
    </p>
  );
}
