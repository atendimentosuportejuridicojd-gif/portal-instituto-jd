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
        supabase.rpc("has_role", { _user_id: userId, _role: "aluno_teste" }),
        supabase.rpc("tem_acesso_conteudo"),
      ]);
    const { data: profile } = await supabase
      .from("profiles")
      .select("bloqueado, bloqueado_motivo")
      .eq("id", userId)
      .maybeSingle();

    const ativa =
      !!assin &&
      assin.status === "ativa" &&
      (!assin.fim || new Date(assin.fim).getTime() > Date.now());

    const bloqueado = !!profile?.bloqueado;

    return {
      assinatura: assin,
      isAdmin: !!isAdmin,
      alunoTeste: !!alunoTeste,
      ativa,
      // Acesso liberado para admin, aluno teste ou assinatura ativa (nunca se bloqueado)
      acessoLiberado: !!isAdmin || (!bloqueado && (!!liberado || !!alunoTeste || ativa)),
      bloqueado,
      bloqueado_motivo: profile?.bloqueado_motivo ?? null,
    };
  });

export const registrarUltimoAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("registrar_ultimo_acesso");
    return { ok: true };
  });
