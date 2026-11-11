import { nomeCarreira } from "@/lib/carreiras";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  User,
  CalendarDays,
  ClipboardCheck,
  Newspaper,
  LogOut,
  Send,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { emblemaCarreira } from "@/components/brand";
import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Acervo Base", url: "/acervo", icon: BookOpen },
  { title: "Concursos", url: "/concursos", icon: FileText },
  { title: "Cronogramas", url: "/cronogramas", icon: CalendarDays },
  { title: "Simulados", url: "/simulados", icon: ClipboardCheck },
  { title: "Fique por Dentro", url: "/noticias", icon: Newspaper },
  { title: "Perfil", url: "/perfil", icon: User },
];
const TELEGRAM: Record<string, string> = {
  judiciaria: "https://t.me/+Y5hY1y0N6os1ZTUx",
  policial: "https://t.me/+jETqYkNku5A1MDUx",
  fiscal: "https://t.me/+sSdXzdeEbLdkZGYx",
};


export function AppSidebar({ isAdmin, assinaturaAtiva, carreira }: { isAdmin: boolean; assinaturaAtiva: boolean; carreira?: string | null }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const meu = useQuery({
    queryKey: ["meu-avatar"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("nome_completo, avatar_url").eq("id", u.user.id).maybeSingle();
      return { nome: data?.nome_completo ?? null, avatar: data?.avatar_url ?? null, email: u.user.email ?? null };
    },
    staleTime: 5 * 60_000,
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
            <img src={emblemaCarreira(carreira)} alt={carreira ? `Emblema ${nomeCarreira(carreira)}` : "Instituto J&D"} className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold text-sidebar-foreground">Instituto J&D</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
              {carreira ? nomeCarreira(carreira) : "Portal do Aluno"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Estudos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/admin/dashboard">
                      <Shield />
                      <span>Painel administrativo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {meu.data && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-auto py-2" tooltip="Meu perfil">
                <Link to="/perfil">
                  <UserAvatar url={meu.data.avatar} nome={meu.data.nome} email={meu.data.email} className="h-7 w-7" />
                  <span className="truncate">{meu.data.nome || meu.data.email}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {assinaturaAtiva && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-auto py-2" tooltip="Comunidade Telegram para assinantes">
                <a href={TELEGRAM[carreira ?? ""] ?? TELEGRAM.judiciaria} target="_blank" rel="noopener noreferrer">
                  <Send />
                  <span className="whitespace-normal leading-tight">
                    Exclusivo para Assinantes: Comunidade Telegram
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
