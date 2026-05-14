import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import type { UserRole } from "@link-leagues/types";

const roleLabels: Record<UserRole, string> = {
  staff: "Staff",
  diretor: "Diretor",
  membro: "Membro",
  estudante: "Estudante",
  professor: "Professor",
};

const roleColors: Record<UserRole, string> = {
  staff: "bg-navy text-white dark:bg-navy-700 dark:text-white",
  diretor: "bg-brand-yellow text-navy",
  membro: "bg-link-blue/10 text-link-blue dark:bg-white/10 dark:text-white",
  estudante: "bg-link-blue/10 text-link-blue dark:bg-white/10 dark:text-white",
  professor: "bg-link-blue/10 text-link-blue dark:bg-white/10 dark:text-white",
};

export function AppLayout() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { role } = useUser();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login");
    });
  }, [navigate]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-2">
            {role && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleColors[role]}`}>
                {roleLabels[role]}
              </span>
            )}
            <CommandMenu />
            <button
              onClick={(e) => toggle(e)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-gray bg-white text-navy transition-colors hover:bg-brand-gray dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
