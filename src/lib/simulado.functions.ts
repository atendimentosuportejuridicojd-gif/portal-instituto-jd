import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TOTAL_PADRAO = 80;

const gclidSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 200 && /^[A-Za-z0-9_-]+$/.test(normalized)
    ? normalized
    : undefined;
}, z.string().optional());

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z
    .string()
    .trim()
    .min(10, "Telefone inválido")
    .max(20)
    .regex(/^[0-9()+\-\s]+$/, "Telefone inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(72),
  gclid: gclidSchema,
});

/**
 * Cadastro dedicado ao funil do simulado.
 * Mesma criação de conta do cadastro-teste, MAS sem conceder o prazo de teste:
 * o papel `aluno_teste` (com expiração) só é criado quando a pessoa clica em
 * "Acessar o seu Portal" (ver `ativarAcessoPortal`).
 */
export const criarContaSimulado = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => cadastroSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const telefoneDigitos = data.telefone.replace(/\D/g, "");

    const { data: jaExiste } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (jaExiste) {
      throw new Error(
        "Já existe uma conta com este e-mail. Faça login ou use a opção 'Esqueci minha senha'.",
      );
    }

    const { data: mesmoTelefone } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("telefone", telefoneDigitos)
      .maybeSingle();
    if (mesmoTelefone) throw new Error("Este telefone já foi utilizado.");

    const { data: created, error: errCreate } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.nome, telefone: telefoneDigitos, origem: "simulado" },
    });
    if (errCreate || !created?.user) {
      const msg = errCreate?.message ?? "Não foi possível criar a conta.";
      throw new Error(/already/i.test(msg) ? "Já existe uma conta com este e-mail." : msg);
    }
    const userId = created.user.id;

    await supabaseAdmin
      .from("profiles")
      .update({
        nome_completo: data.nome,
        telefone: telefoneDigitos,
        origem: "simulado",
        simulado_status: "pendente",
        ...(data.gclid
          ? { gclid: data.gclid, gclid_captured_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", userId);

    await supabaseAdmin.from("admin_logs").insert({
      acao: "simulado.cadastro",
      entidade: "profiles",
      entidade_id: userId,
      metadata: { email, telefone: telefoneDigitos },
    });

    return { ok: true };
  });

/** Situação da conta no funil do simulado (usada pela trava de acesso). */
export const getSimuladoStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: perfil }, { data: isAdmin }] = await Promise.all([
      supabase
        .from("profiles")
        .select("simulado_status, simulado_ativado_em, origem")
        .eq("id", userId)
        .maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "administrador" }),
    ]);
    return {
      status: (perfil?.simulado_status as string | null) ?? null,
      ativado: !!perfil?.simulado_ativado_em,
      isAdmin: !!isAdmin,
    };
  });

/** Inicia (ou retoma) a tentativa e devolve as 80 questões, sem gabarito. */
export const iniciarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: questoes, error } = await supabase
      .from("simulado_questoes")
      .select("id, questao_id, materia, enunciado, simulado_alternativas(id, letra, texto, ordem)")
      .eq("publicado", true)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    if (!questoes || questoes.length === 0)
      throw new Error("O simulado ainda não possui questões cadastradas.");

    let tentativaId: string;
    const { data: emAndamento } = await supabase
      .from("simulado_tentativas")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "em_andamento")
      .order("iniciada_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (emAndamento) {
      tentativaId = emAndamento.id;
    } else {
      const { data: nova, error: errT } = await supabase
        .from("simulado_tentativas")
        .insert({
          user_id: userId,
          status: "em_andamento",
          total_questoes: questoes.length || TOTAL_PADRAO,
        })
        .select("id")
        .single();
      if (errT) throw new Error(errT.message);
      tentativaId = nova.id;
    }

    const { data: respostas } = await supabase
      .from("simulado_respostas")
      .select("questao_id")
      .eq("tentativa_id", tentativaId);
    const respondidas = new Set((respostas ?? []).map((r: any) => r.questao_id));

    return {
      tentativaId,
      total: questoes.length,
      questoes: questoes.map((q: any, i: number) => ({
        id: q.id,
        numero: i + 1,
        materia: q.materia,
        enunciado: q.enunciado,
        respondida: respondidas.has(q.id),
        alternativas: (q.simulado_alternativas ?? [])
          .slice()
          .sort((a: any, b: any) => String(a.letra).localeCompare(String(b.letra)))
          .map((a: any) => ({ id: a.id, letra: String(a.letra).toUpperCase(), texto: a.texto })),
      })),
    };
  });

export const responderSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tentativa_id: z.string().uuid(),
        questao_id: z.string().uuid(),
        alternativa_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: tentativa, error: errT } = await supabase
      .from("simulado_tentativas")
      .select("id, status, total_questoes")
      .eq("id", data.tentativa_id)
      .eq("user_id", userId)
      .single();
    if (errT) throw new Error(errT.message);
    if (tentativa.status !== "em_andamento") throw new Error("Simulado já finalizado.");

    const { data: alt, error: errA } = await supabase
      .from("simulado_alternativas")
      .select("id, correta, questao_id")
      .eq("id", data.alternativa_id)
      .single();
    if (errA) throw new Error(errA.message);
    if (alt.questao_id !== data.questao_id) throw new Error("Alternativa inválida.");

    await supabase.from("simulado_respostas").insert({
      tentativa_id: data.tentativa_id,
      user_id: userId,
      questao_id: data.questao_id,
      alternativa_id: data.alternativa_id,
      acertou: alt.correta === true,
    });

    const { data: todas } = await supabase
      .from("simulado_respostas")
      .select("acertou")
      .eq("tentativa_id", data.tentativa_id);

    const respondidas = todas?.length ?? 0;
    let finalizado = false;

    if (respondidas >= tentativa.total_questoes) {
      const acertos = (todas ?? []).filter((r: any) => r.acertou).length;
      const erros = respondidas - acertos;
      const percentual =
        tentativa.total_questoes > 0
          ? Math.round((acertos / tentativa.total_questoes) * 10000) / 100
          : 0;
      await supabase
        .from("simulado_tentativas")
        .update({
          status: "concluida",
          acertos,
          erros,
          percentual,
          concluida_em: new Date().toISOString(),
        })
        .eq("id", data.tentativa_id);
      await supabase
        .from("profiles")
        .update({ simulado_status: "concluido" })
        .eq("id", userId);
      finalizado = true;
    }

    return { respondidas, finalizado };
  });

export const getResultadoSimulado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: tentativa } = await supabase
      .from("simulado_tentativas")
      .select("id, total_questoes, acertos, erros, percentual, concluida_em")
      .eq("user_id", userId)
      .eq("status", "concluida")
      .order("concluida_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tentativa) return { tentativa: null, porMateria: [], questoes: [] };

    const { data: respostas } = await supabase
      .from("simulado_respostas")
      .select(
        "acertou, alternativa_id, simulado_questoes(id, questao_id, materia, enunciado, comentario, ordem, simulado_alternativas(id, letra, texto, correta))",
      )
      .eq("tentativa_id", tentativa.id);

    const porMateria = new Map<string, { materia: string; total: number; acertos: number }>();
    const questoes = (respostas ?? [])
      .map((r: any) => {
        const q = r.simulado_questoes;
        const materia = q?.materia ?? "Geral";
        const acc = porMateria.get(materia) ?? { materia, total: 0, acertos: 0 };
        acc.total += 1;
        if (r.acertou) acc.acertos += 1;
        porMateria.set(materia, acc);
        const alts = q?.simulado_alternativas ?? [];
        const escolhida = alts.find((a: any) => a.id === r.alternativa_id);
        const correta = alts.find((a: any) => a.correta);
        return {
          id: q?.id,
          ordem: q?.ordem ?? 0,
          codigo: q?.questao_id,
          materia,
          enunciado: q?.enunciado,
          comentario: q?.comentario ?? null,
          acertou: !!r.acertou,
          escolhida: escolhida
            ? { letra: String(escolhida.letra).toUpperCase(), texto: escolhida.texto }
            : null,
          correta: correta
            ? { letra: String(correta.letra).toUpperCase(), texto: correta.texto }
            : null,
        };
      })
      .sort((a: any, b: any) => a.ordem - b.ordem);

    return {
      tentativa: {
        total: tentativa.total_questoes,
        acertos: tentativa.acertos,
        erros: tentativa.erros,
        percentual: Number(tentativa.percentual),
      },
      porMateria: [...porMateria.values()]
        .map((m) => ({
          ...m,
          percentual: m.total > 0 ? Math.round((m.acertos / m.total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.percentual - a.percentual),
      questoes,
    };
  });

/**
 * Botão "Acessar o seu Portal": ativa o MESMO mecanismo de teste já existente
 * (papel `aluno_teste` com expiração), a partir de agora.
 */
export const ativarAcessoPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: perfil } = await supabase
      .from("profiles")
      .select("simulado_status, simulado_ativado_em")
      .eq("id", userId)
      .maybeSingle();
    if (perfil?.simulado_status && perfil.simulado_status !== "concluido")
      throw new Error("Conclua o simulado para liberar seu acesso.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (perfil?.simulado_ativado_em) return { ok: true, jaAtivo: true, dias: 0 };

    const { data: cfg } = await supabaseAdmin
      .from("configuracoes_plataforma")
      .select("dias_teste_gratis")
      .maybeSingle();
    const dias = Number(cfg?.dias_teste_gratis) > 0 ? Number(cfg?.dias_teste_gratis) : 5;
    const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

    const { data: roleExistente } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "aluno_teste" as any)
      .maybeSingle();

    if (roleExistente) {
      await supabaseAdmin
        .from("user_roles")
        .update({ expira_em: expira })
        .eq("id", roleExistente.id);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "aluno_teste" as any, expira_em: expira });
      if (error) throw new Error("Não foi possível liberar seu acesso. Contate o suporte.");
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        simulado_ativado_em: new Date().toISOString(),
        teste_solicitado_em: new Date().toISOString(),
      })
      .eq("id", userId);

    await supabaseAdmin.from("admin_logs").insert({
      acao: "simulado.acesso_portal_ativado",
      entidade: "user_roles",
      entidade_id: userId,
      metadata: { dias, expira_em: expira },
    });

    return { ok: true, jaAtivo: false, dias };
  });
