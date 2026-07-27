import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader } from "@/components/page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type ProfileRow = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Admin J&D" }] }),
  component: Usuarios,
});

function Usuarios() {
  const [rows, setRows] = useState<ProfileRow[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nome_completo, email, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data ?? []) as ProfileRow[]));
  }, []);

  return (
    <>
      <PageHeader title="Usuários" description="Alunos e administradores da plataforma." />
      <PageContent>
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead>Perfil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome_completo || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Aluno</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </>
  );
}
