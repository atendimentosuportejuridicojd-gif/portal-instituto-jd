import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageContent, PageHeader } from "@/components/page";
import {
  Users,
  BookOpen,
  HelpCircle,
  Newspaper,
  FileText,
  Target,
  UserCheck,
  UserX,
  UserPlus,
  Library,
} from "lucide-react";
import { adminGetDashboard } from "@/lib/admin-stats.functions";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Admin J&D" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const fn = useServerFn(adminGetDashboard);
  const q = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => fn() });

  const t = q.data?.totais;
  const cards = [
    { icon: Users, label: "Alunos", value: t?.alunos ?? 0 },
    { icon: UserPlus, label: "Novos (30 dias)", value: t?.novos_30d ?? 0 },
    { icon: UserCheck, label: "Assinaturas ativas", value: t?.assin_ativas ?? 0 },
    { icon: UserX, label: "Assinaturas inativas", value: t?.assin_inativas ?? 0 },
    { icon: BookOpen, label: "Materiais", value: t?.materiais ?? 0 },
    { icon: Library, label: "Disciplinas", value: t?.disciplinas ?? 0 },
    { icon: HelpCircle, label: "Questões", value: t?.questoes ?? 0 },
    { icon: FileText, label: "Concursos", value: t?.concursos ?? 0 },
    { icon: Target, label: "Trilhas", value: t?.trilhas ?? 0 },
    { icon: Newspaper, label: "Notícias", value: t?.noticias ?? 0 },
  ];

  return (
    <>
      <PageHeader title="Painel Administrativo" description="Visão geral da plataforma." />
      <PageContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="surface-card p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 surface-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Evolução dos últimos 30 dias</h2>
            <p className="text-xs text-muted-foreground">Cadastros de alunos e questionários concluídos por dia.</p>
          </div>
          <ChartContainer
            config={{
              cadastros: { label: "Cadastros", color: "hsl(var(--primary))" },
              sessoes: { label: "Questionários", color: "hsl(var(--gold, 45 89% 55%))" },
            }}
            className="h-64 w-full"
          >
            <AreaChart data={q.data?.serie ?? []}>
              <defs>
                <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-cadastros)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-cadastros)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-sessoes)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-sessoes)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="cadastros"
                stroke="var(--color-cadastros)"
                fill="url(#c1)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="sessoes"
                stroke="var(--color-sessoes)"
                fill="url(#c2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </section>
      </PageContent>
    </>
  );
}
