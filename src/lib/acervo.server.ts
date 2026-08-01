/** Helpers server-only do acervo (nunca importado pelo cliente). */

export async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "administrador",
  });
  if (error || !data) throw new Error("Acesso restrito ao administrador.");
  return true;
}

export async function isAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "administrador",
  });
  return !!data;
}

/** Garante que o aluno tem direito de abrir o material (assinatura ativa e não bloqueado). */
export async function assertAcessoAluno(ctx: { supabase: any; userId: string }) {
  if (await isAdmin(ctx)) return;

  const { data: perfil } = await ctx.supabase
    .from("profiles")
    .select("bloqueado")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (perfil?.bloqueado) throw new Error("Sua conta está bloqueada.");

  const { data: ativa } = await ctx.supabase.rpc("is_assinatura_ativa", { _user_id: ctx.userId });
  if (!ativa) throw new Error("Assinatura inativa. Regularize para acessar o material.");
}

/** Link temporário para leitura do PDF (bucket privado). */
export async function criarUrlAssinada(storagePath: string, segundos = 3600) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("materiais")
    .createSignedUrl(storagePath, segundos);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Falha ao gerar link do arquivo.");
  return data.signedUrl;
}

export async function removerArquivo(storagePath: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from("materiais").remove([storagePath]);
}

export function montarStoragePath(materialId: string, versao: number, nomeArquivo: string) {
  const limpo = nomeArquivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .slice(-80);
  return `${materialId}/v${versao}-${Date.now()}-${limpo}`;
}
