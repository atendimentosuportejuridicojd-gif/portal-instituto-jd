import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe.server", () => ({ createStripeClient: () => ({}) }));

import { processarEventoAssinatura } from "./assinatura-webhook.server";

/** Banco falso: guarda as linhas por tabela e responde select().eq().maybeSingle() e insert/update/upsert. */
function bancoFalso(inicial: Record<string, any[]> = {}) {
  const tabelas: Record<string, any[]> = { assinaturas: [], conversoes_google_ads: [], admin_logs: [], ...inicial };
  const from = (nome: string) => {
    const linhas = (tabelas[nome] ??= []);
    return {
      select: () => ({
        eq: (campo: string, valor: unknown) => ({
          maybeSingle: async () => ({ data: linhas.find((l) => l[campo] === valor) ?? null, error: null }),
        }),
      }),
      insert: async (l: any) => (linhas.push(l), { error: null }),
      update: (l: any) => ({ eq: async () => ({ error: null, l }) }),
      upsert: async (l: any) => (linhas.push(l), { error: null }),
    };
  };
  return { db: { from }, tabelas };
}

const evento = (metadata: Record<string, string>, extra: Record<string, unknown> = {}) =>
  ({
    type: "checkout.session.completed",
    created: 1_790_000_000,
    data: {
      object: {
        mode: "payment",
        payment_status: "paid",
        payment_intent: "pi_1",
        amount_total: 7690,
        currency: "brl",
        metadata: { service: "assinatura_portal", user_id: "u1", plano: "judiciaria_mensal", carreira: "judiciaria", ...metadata },
        ...extra,
      },
    },
  }) as any;

const perfil = { id: "u1", gclid: "CLICK1", gclid_captured_at: "2026-10-01T00:00:00Z" };

describe("conversão do Google Ads no webhook do Stripe", () => {
  it("grava na fila a primeira compra paga de quem tem gclid", async () => {
    const { db, tabelas } = bancoFalso({ profiles: [perfil] });
    await processarEventoAssinatura(evento({}), "live", db, {} as any);
    expect(tabelas.conversoes_google_ads).toHaveLength(1);
    expect(tabelas.conversoes_google_ads[0]).toMatchObject({
      user_id: "u1", gclid: "CLICK1", hotmart_transaction_id: "pi_1", valor: 76.9, moeda: "BRL",
    });
  });

  it("não grava sem gclid, para o plano de teste, no sandbox nem se o aluno já converteu", async () => {
    const sem = bancoFalso({ profiles: [{ id: "u1", gclid: null }] });
    await processarEventoAssinatura(evento({}), "live", sem.db, {} as any);
    expect(sem.tabelas.conversoes_google_ads).toHaveLength(0);

    const teste = bancoFalso({ profiles: [perfil] });
    await processarEventoAssinatura(evento({ plano: "judiciaria_teste_mensal" }), "live", teste.db, {} as any);
    expect(teste.tabelas.conversoes_google_ads).toHaveLength(0);

    const sandbox = bancoFalso({ profiles: [perfil] });
    await processarEventoAssinatura(evento({}), "sandbox", sandbox.db, {} as any);
    expect(sandbox.tabelas.conversoes_google_ads).toHaveLength(0);

    const repetida = bancoFalso({ profiles: [perfil], conversoes_google_ads: [{ id: "c1", user_id: "u1" }] });
    await processarEventoAssinatura(evento({}), "live", repetida.db, {} as any);
    expect(repetida.tabelas.conversoes_google_ads).toHaveLength(1);
  });

  it("falha na fila vira log e não derruba o webhook", async () => {
    const { db, tabelas } = bancoFalso({ profiles: [perfil] });
    const from = db.from;
    db.from = (n: string) => (n === "conversoes_google_ads" ? { ...from(n), select: () => { throw new Error("banco fora"); } } : from(n)) as any;
    await expect(processarEventoAssinatura(evento({}), "live", db, {} as any)).resolves.toBeUndefined();
    expect(tabelas.admin_logs[0]).toMatchObject({ acao: "stripe.conversao_google_erro" });
    expect(tabelas.assinaturas).toHaveLength(1);
  });
});
