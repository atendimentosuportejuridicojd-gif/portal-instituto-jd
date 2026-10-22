import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function iniciais(nome?: string | null, email?: string | null) {
  const base = (nome ?? "").trim() || (email ?? "").trim();
  if (!base) return "?";
  const partes = base.split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

/** Foto de perfil do aluno; sem foto, mostra as iniciais. */
export function UserAvatar({
  url,
  nome,
  email,
  className,
}: {
  url?: string | null;
  nome?: string | null;
  email?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {url && <AvatarImage src={url} alt={nome ?? "Foto de perfil"} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {iniciais(nome, email)}
      </AvatarFallback>
    </Avatar>
  );
}
