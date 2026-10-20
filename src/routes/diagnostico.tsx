import { createFileRoute, redirect } from "@tanstack/react-router";

// Diagnóstico de Preparação aposentado: os endereços antigos levam à página inicial.
export const Route = createFileRoute("/diagnostico")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
