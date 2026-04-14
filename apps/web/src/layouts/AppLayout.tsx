import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@link-leagues/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  FolderKanban,
  Calendar,
  BookOpen,
  ShieldCheck,
  Settings,
  User,
  LogOut,
} from "lucide-react";

const mainNavItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/ligas", label: "Ligas", icon: Users },
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/conteudo", label: "Conteúdo", icon: BookOpen },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white w-full"
    : "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 hover:text-white transition-colors w-full";

export function AppLayout() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;

      const { data: usuario, error } = await supabase
        .from("usuarios")
        .select("role")
        .eq("email", session.user.email)
        .single();

      console.log("usuario:", usuario, "error:", error, "email:", session.user.email);
      setRole((usuario?.role as UserRole) ?? "membro");
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const isStaff = role === "admin";
  const canManage = role === "admin" || role === "lider";

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-[#EAEAEA]">
        <Sidebar className="border-r-0 bg-[#10284F] text-white">
          <SidebarHeader className="px-6 py-5 border-b border-white/10">
            <h1 className="font-display font-bold text-xl tracking-tight text-white">
              Link
            </h1>
            <p className="text-xs text-white/50 mt-0.5">Faculdade de Negócios</p>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3">
            <SidebarMenu>
              {mainNavItems.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <NavLink to={to} className={navLinkClass}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="px-2 py-3">
            {(isStaff || canManage) && (
              <SidebarMenu>
                {isStaff && (
                  <SidebarMenuItem>
                    <NavLink to="/super-admin" className={navLinkClass}>
                      <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                      Super Admin
                    </NavLink>
                  </SidebarMenuItem>
                )}
                {canManage && (
                  <SidebarMenuItem>
                    <NavLink to="/gerenciamento" className={navLinkClass}>
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      Gerenciamento
                    </NavLink>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            )}
            <SidebarMenu>
              <SidebarMenuItem>
                <NavLink to="/conta" className={navLinkClass}>
                  <User className="h-4 w-4 flex-shrink-0" />
                  Conta
                </NavLink>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="border-t border-white/10 my-2" />
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors w-full"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  Sair
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-12 items-center gap-2 border-b border-[#EAEAEA] bg-white px-4">
            <SidebarTrigger className="text-[#546484]" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
