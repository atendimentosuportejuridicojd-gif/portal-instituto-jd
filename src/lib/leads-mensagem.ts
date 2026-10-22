/**
 * Mensagem de primeiro contato por WhatsApp com um lead. O texto muda conforme a resposta da carreira:
 * com carreira definida cita a carreira; com "ainda não defini" pergunta qual área e cargo seguir.
 * Vale para os leads de formulário (Meta, Google e do site). Módulo puro, usado pelo painel de leads.
 */
export const ORIGENS_FORMULARIO = ["meta_form", "google_form", "site_form"] as const;

export function ehFormulario(origem?: string | null): boolean {
  return (ORIGENS_FORMULARIO as readonly string[]).includes(origem ?? "");
}

export function mensagemPrimeiroContato(lead: { nome: string; origem?: string | null; carreira?: string | null }): string {
  const primeiro = lead.nome.trim().split(/\s+/)[0] || "tudo bem";
  if (!ehFormulario(lead.origem)) {
    return `Olá, ${primeiro}! Aqui é do Instituto J&D. Vi que você fez nosso diagnóstico de preparação para a carreira judiciária — posso te ajudar a dar o próximo passo?`;
  }
  // A Meta guarda "judiciária", o Google e o site guardam "Judiciária": a frase usa sempre minúsculas.
  const carreira = (lead.carreira ?? "").replace(/_/g, " ").trim().toLowerCase();
  const carreiraDefinida = carreira && !/ainda n[aã]o defini/.test(carreira);
  return carreiraDefinida
    ? `Olá, ${primeiro}! Aqui é da equipe do Instituto J&D.\n\nVi que você preencheu nosso formulário e tem foco na carreira ${carreira}. Vamos te ajudar com os próximos passos!\n\nVocê já tem algum concurso em vista que tenha interesse em fazer? Se sim, qual o cargo?`
    : `Olá, ${primeiro}! Aqui é da equipe do Instituto J&D.\n\nVi que você preencheu nosso formulário. Vamos te ajudar com os próximos passos!\n\nVocê já tem algum concurso em vista que tenha interesse em prestar ou ainda está decidindo qual área e cargo seguir?`;
}
