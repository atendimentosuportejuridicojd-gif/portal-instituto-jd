import { createFileRoute } from "@tanstack/react-router";
import { PageContent, PageHeader } from "@/components/page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, HelpCircle, Newspaper, FileText, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Admin J&D" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({
    alunos: 0,
    materiais: 0,
    questoes: 0,
    concursos: 0,
    trilhas: 0,
    noticias: 0,
  });

  useEffect(() => {
    const load = async () => {
      const [alunos, materiais, questoes, concursos, trilhas, noticias] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "aluno"),
        supabase.from("materiais").select("*", { count: "exact", head: true }),
        supabase.from("questoes").select("*", { count: "exact", head: true }),
        supabase.from("concursos").select("*", { count: "exact", head: true }),
        supabase.from("trilhas").select("*", { count: "exact", head: true }),
        supabase.from("noticias").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        alunos: alunos.count ?? 0,
        materiais: materiais.count ?? 0,
        questoes: questoes.count ?? 0,
        concursos: concursos.count ?? 0,
        trilhas: trilhas.count ?? 0,
        noticias: noticias.count ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { icon: Users, label: "Alunos", value: stats.alunos },
    { icon: BookOpen, label: "Materiais", value: stats.materiais },
    { icon: HelpCircle, label: "Questões", value: stats.questoes },
    { icon: FileText, label: "Concursos", value: stats.concursos },
    { icon: Target, label: "Trilhas", value: stats.trilhas },
    { icon: Newspaper, label: "Notícias", value: stats.noticias },
  ];

  return (
    <>
      <PageHeader title="Painel Administrativo" description="Visão geral da plataforma." />
      <PageContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.label} className="surface-card p-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight">{c.value}</p>
            </div>
          ))}
        </div>
      </PageContent>
    </>
  );
}
