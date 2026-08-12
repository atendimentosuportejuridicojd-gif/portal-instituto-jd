import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z
    .string()
    .trim()
    .min(10, "Telefone inválido")
    .max(20)
    .regex(/^[0-9()+\-\s]+$/, "Telefone inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(72),
});

/**
 * Cadastro público do período de teste.
 * Cria o usuário já confirmado, concede o papel "aluno_teste" com prazo
 * (padrão: 5 dias, configurável em Configurações da plataforma) e registra
 * telefone/origem no perfil. Após o prazo, o acesso é bloqueado
 * automaticamente por `tem_acesso_conteudo()`.
 */
export const criarContaTeste = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const telefoneDigitos = data.telefone.replace(/\D/g, "");

    // 1 teste por e-mail
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

    // 1 teste por telefone
    const { data: mesmoTelefone } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("telefone", telefoneDigitos)
      .maybeSingle();
    if (mesmoTelefone) {
      throw new Error("Este telefone já utilizou o período de teste.");
    }

    // Dias de teste configurados pelo admin
    const { data: cfg } = await supabaseAdmin
      .from("configuracoes_plataforma")
      .select("dias_teste_gratis")
      .maybeSingle();
    const dias = Number(cfg?.dias_teste_gratis) > 0 ? Number(cfg?.dias_teste_gratis) : 5;

    const { data: created, error: errCreate } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.nome, telefone: telefoneDigitos, origem: "teste_gratis" },
    });
    if (errCreate || !created?.user) {
      const msg = errCreate?.message ?? "Não foi possível criar a conta.";
      throw new Error(/already/i.test(msg) ? "Já existe uma conta com este e-mail." : msg);
    }
    const userId = created.user.id;

    const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from("profiles")
      .update({
        nome_completo: data.nome,
        telefone: telefoneDigitos,
        origem: "teste_gratis",
        teste_solicitado_em: new Date().toISOString(),
      })
      .eq("id", userId);

    const { error: errRole } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "aluno_teste" as any, expira_em: expira });
    if (errRole) throw new Error("Conta criada, mas houve falha ao liberar o teste. Contate o suporte.");

    await supabaseAdmin.from("admin_logs").insert({
      acao: "teste_gratis.cadastro",
      entidade: "user_roles",
      entidade_id: userId,
      metadata: { email, telefone: telefoneDigitos, dias, expira_em: expira },
    });

    return { ok: true, dias, expira_em: expira };
  });
