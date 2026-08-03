import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  FileText,
  User,
  HelpCircle,
  CalendarDays,
  Newspaper,
  LogOut,
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
import { BrandLogo } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Acervo Base", url: "/acervo", icon: BookOpen },
  { title: "Trilhas", url: "/trilhas", icon: Target },
  { title: "Concursos", url: "/concursos", icon: FileText },
  { title: "Questões", url: "/questoes", icon: HelpCircle },
  { title: "Cronogramas", url: "/cronogramas", icon: CalendarDays },
  { title: "Fique por Dentro", url: "/noticias", icon: Newspaper },
  { title: "Perfil", url: "/perfil", icon: User },
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

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
            <BrandLogo size={28} alt="Instituto J&D Especialistas na Carreira Judiciária" />
          </div>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold text-sidebar-foreground">Instituto J&D</p>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
              Portal do Aluno
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
