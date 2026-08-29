import { createFileRoute, Outlet, redirect, useLocation, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { AdminAlertas } from "@/components/admin-alertas";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMinhaAssinatura, registrarUltimoAcesso } from "@/lib/assinaturas.functions";
import { useSessaoUnica } from "@/hooks/use-sessao-unica";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const location = useLocation();
  const inAdmin = location.pathname.startsWith("/admin");
  const isBlockedPage = location.pathname === "/assinatura-bloqueada";

  const assFn = useServerFn(getMinhaAssinatura);
  const acessoFn = useServerFn(registrarUltimoAcesso);
  const q = useQuery({ queryKey: ["minha-assinatura"], queryFn: () => assFn(), staleTime: 60_000 });

  // Registrar último acesso (uma vez por sessão de página)
  useEffect(() => {
    acessoFn().catch(() => {});
  }, [acessoFn]);

  const isAdmin = !!q.data?.isAdmin;

  // Uma única sessão ativa por aluno (o último login encerra o anterior)
  useSessaoUnica(!!user);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!q.data || redirecting || isBlockedPage) return;
    if (!q.data.acessoLiberado) {
      setRedirecting(true);
      window.location.replace("/assinatura-bloqueada");
    }
  }, [q.data, redirecting, isBlockedPage]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {!isBlockedPage && (inAdmin && isAdmin ? <AdminSidebar /> : <AppSidebar isAdmin={isAdmin} />)}
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
            {!isBlockedPage && <SidebarTrigger />}
            {!isBlockedPage && (
              <>
                <div className="ml-2 hidden md:block">
                  <GlobalSearch />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <NotificationBell />
                  <Link to="/perfil" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">
                    {user.email}
                  </Link>
                </div>
              </>
            )}
            {isBlockedPage && (
              <div className="ml-auto text-xs text-muted-foreground">{user.email}</div>
            )}
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
          {isAdmin && <AdminAlertas />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
