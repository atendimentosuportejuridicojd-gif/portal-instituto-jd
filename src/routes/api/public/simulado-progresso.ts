import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { progressoSimuladoSchema } from "@/lib/simulado-progresso";

export const Route = createFileRoute("/api/public/simulado-progresso")({
  server: { handlers: {
    POST: async ({ request }) => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      const authorization = request.headers.get("authorization");
      if (!url || !key) return new Response(null, { status: 503 });
      if (!authorization?.startsWith("Bearer ")) return new Response(null, { status: 401 });
      const token = authorization.slice(7);
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authorization } },
      });
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) return new Response(null, { status: 401 });
      const parsed = progressoSimuladoSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return new Response(null, { status: 400 });
      try {
        const { salvarProgressoSimulado } = await import("@/lib/simulado-aluno.server");
        await salvarProgressoSimulado({ supabase, userId: userData.user.id }, parsed.data);
        return Response.json({ ok: true });
      } catch {
        return Response.json({ message: "Não foi possível salvar o progresso do simulado." }, { status: 400 });
      }
    },
  } },
});