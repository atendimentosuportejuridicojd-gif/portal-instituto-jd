import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMinhaAssinatura = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: assin }, { data: isAdmin }, { data: alunoTeste }, { data: liberado }] =
      await Promise.all([
        supabase
          .from("assinaturas")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc("has_role", { _user_id: userId, _role: "administrador" }),
        supabase.rpc("aluno_teste_ativo", { _user_id: userId }),
        supabase.rpc("tem_acesso_conteudo"),
      ]);
    const [{ data: profile }, { data: roleTeste }] = await Promise.all([
      supabase
        .from("profiles")
        .select("bloqueado, bloqueado_motivo, telefone, teste_solicitado_em, carreira")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("expira_em")
        .eq("user_id", userId)
        .eq("role", "aluno_teste" as any)
        .order("expira_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const ativa =
      !!assin &&
      assin.status === "ativa" &&
      (!assin.fim || new Date(assin.fim).getTime() > Date.now());

    const bloqueado = !!profile?.bloqueado;

    // Dias restantes do período de teste (para a fita no topo do portal)
    let trialExpiraEm: string | null = null;
    let trialDiasRestantes: number | null = null;
    if (alunoTeste && roleTeste?.expira_em) {
      trialExpiraEm = roleTeste.expira_em as string;
      const ms = new Date(trialExpiraEm).getTime() - Date.now();
      trialDiasRestantes = ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
    }

    // Conta que nunca usou o teste nem informou WhatsApp (ex.: entrou direto pelo Google)
    const podeAtivarTeste =
      !isAdmin &&
      !bloqueado &&
      !ativa &&
      !liberado &&
      !roleTeste &&
      !profile?.telefone &&
      !profile?.teste_solicitado_em;

    return {
      assinatura: assin,
      isAdmin: !!isAdmin,
      alunoTeste: !!alunoTeste,
      ativa,
      // Acesso liberado para admin, aluno teste ou assinatura ativa (nunca se bloqueado)
      acessoLiberado: !!isAdmin || (!bloqueado && (!!liberado || !!alunoTeste || ativa)),
      bloqueado,
      bloqueado_motivo: profile?.bloqueado_motivo ?? null,
      trialExpiraEm,
      trialDiasRestantes,
      podeAtivarTeste,
      carreira: ((profile as any)?.carreira as string | null) ?? null,
    };
  });

/**
 * Libera o teste grátis para quem entrou sem o cadastro-teste (ex.: Google),
 * mediante o WhatsApp. Só funciona uma vez por conta e por telefone.
 */
export const ativarTesteComWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { telefone: string }) => {
    const digitos = String(d?.telefone ?? "").replace(/\D/g, "");
    if (digitos.length < 10 || digitos.length > 13) throw new Error("WhatsApp inválido.");
    return { telefone: digitos };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profile }, { data: roleTeste }, { data: assin }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("email, bloqueado, telefone, teste_solicitado_em")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "aluno_teste" as any)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("assinaturas")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle(),
    ]);
    if (!profile || profile.bloqueado) throw new Error("Conta indisponível para teste.");
    if (roleTeste || profile.telefone || profile.teste_solicitado_em || assin) {
      throw new Error("Esta conta já utilizou o período de teste.");
    }

    const { data: mesmoTelefone } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("telefone", data.telefone)
      .neq("id", userId)
      .limit(1)
      .maybeSingle();
    if (mesmoTelefone) throw new Error("Este WhatsApp já utilizou o período de teste.");

    const { data: cfg } = await supabaseAdmin
      .from("configuracoes_plataforma")
      .select("dias_teste_gratis")
      .maybeSingle();
    const dias = Number(cfg?.dias_teste_gratis) > 0 ? Number(cfg?.dias_teste_gratis) : 5;
    const agora = new Date();
    const expira = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();

    const { error: errProf } = await supabaseAdmin
      .from("profiles")
      .update({ telefone: data.telefone, teste_solicitado_em: agora.toISOString() })
      .eq("id", userId);
    if (errProf) throw new Error("Não foi possível salvar o WhatsApp.");

    const { error: errRole } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "aluno_teste" as any, expira_em: expira });
    if (errRole) throw new Error("Falha ao liberar o teste. Contate o suporte.");

    await supabaseAdmin.from("admin_logs").insert({
      acao: "teste_gratis.whatsapp_pos_login",
      entidade: "user_roles",
      entidade_id: userId,
      metadata: { email: profile.email, telefone: data.telefone, dias, expira_em: expira },
    });

    return { ok: true, dias, expira_em: expira };
  });

export const registrarUltimoAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("registrar_ultimo_acesso");
    return { ok: true };
  });

export const definirCarreira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { carreira: string }) => {
    if (!["judiciaria", "fiscal", "policial"].includes(d?.carreira)) throw new Error("Carreira inválida.");
    return { carreira: d.carreira };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "administrador" });
    const { data: prof } = await supabase.from("profiles").select("carreira").eq("id", userId).maybeSingle();
    if ((prof as any)?.carreira && !isAdmin) throw new Error("Sua carreira já foi escolhida.");
    const { error } = await supabase.from("profiles").update({ carreira: data.carreira } as any).eq("id", userId);
    if (error) throw new Error("Não foi possível salvar sua carreira.");
    return { ok: true };
  });
