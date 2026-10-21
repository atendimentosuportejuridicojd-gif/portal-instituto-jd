import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const criarCheckoutAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ periodo: z.enum(["mensal", "anual", "teste"]), environment: z.enum(["sandbox", "live"]) }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ clientSecret: string } | { error: string }> => {
    const { getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const { criarSessaoAssinatura } = await import("@/lib/assinatura-checkout.server");
      return await criarSessaoAssinatura(context, data, new URL(getRequest().url).origin);
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
