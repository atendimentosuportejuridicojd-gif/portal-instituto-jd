import { createFileRoute, redirect } from "@tanstack/react-router";

// As matérias de cada concurso não são mais listadas para o aluno: elas entram no cronograma de estudos.
// A rota continua existindo apenas para não quebrar links antigos.
export const Route = createFileRoute("/_authenticated/concursos-especificos/$concursoId")({
  beforeLoad: () => {
    throw redirect({ to: "/concursos" });
  },
});
