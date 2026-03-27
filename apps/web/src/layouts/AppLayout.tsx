import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { FolderKanban, Users, LogOut } from "lucide-react";

const navItems = [
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/ligas", label: "Ligas", icon: Users },
];

export function AppLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/auth/login");
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-[#EAEAEA]">
        <Sidebar className="border-r-0 bg-[#546484] text-white">
          <SidebarHeader className="px-6 py-5 border-b border-white/10">
            <h1 className="font-display font-bold text-xl tracking-tight text-white">
              Link
            </h1>
            <p className="text-xs text-white/50 mt-0.5">Faculdade de Negócios</p>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3">
            <SidebarMenu>
              {navItems.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        isActive
                          ? "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium bg-white/15 text-white"
                          : "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                      }
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="px-2 py-3 border-t border-white/10">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  Sair
                </SidebarMenuButton>
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
