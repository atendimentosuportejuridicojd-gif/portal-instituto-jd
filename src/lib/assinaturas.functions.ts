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
        .select("bloqueado, bloqueado_motivo, simulado_status, simulado_ativado_em")
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
      simuladoStatus: (profile?.simulado_status as string | null) ?? null,
      simuladoAtivado: !!profile?.simulado_ativado_em,
    };
  });

export const registrarUltimoAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("registrar_ultimo_acesso");
    return { ok: true };
  });
