import {
  Calendar,
  ClipboardList,
  FolderKanban,
  Home,
  MessageSquare,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";

import { NavMain, type NavMainItem } from "@/components/nav-main";
import { NavUser, type NavUserData } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

const mainNav: NavMainItem[] = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Ligas", url: "/ligas", icon: Users },
  { title: "Projetos", url: "/projetos", icon: FolderKanban },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Mural", url: "/mural", icon: MessageSquare },
  { title: "Ranking", url: "/ranking", icon: Trophy },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useUser();
  const [user, setUser] = useState<NavUserData>({ name: "", email: "", avatarUrl: null });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;
      const email = session.user.email ?? "";
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("nome, avatar_url")
        .eq("email", email)
        .single();
      setUser({
        name: (usuario?.nome as string | undefined) ?? "",
        email,
        avatarUrl: (usuario?.avatar_url as string | null | undefined) ?? null,
      });
    });
  }, []);

  const isStaff = role === "staff";
  const canManage = role === "staff" || role === "diretor";

  const manageNav: NavMainItem[] = [];
  if (isStaff) {
    manageNav.push({ title: "Super Admin", url: "/super-admin", icon: ShieldCheck });
  }
  if (canManage) {
    manageNav.push({
      title: "Processo Seletivo",
      url: "/processo-seletivo",
      icon: ClipboardList,
    });
    manageNav.push({ title: "Gerenciamento", url: "/gerenciamento", icon: Settings });
  }

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      style={
        {
          "--sidebar-background": "218 66% 18%",
          "--sidebar-foreground": "0 0% 95%",
          "--sidebar-accent": "218 50% 26%",
          "--sidebar-accent-foreground": "0 0% 100%",
          "--sidebar-border": "218 50% 28%",
          "--sidebar-ring": "43 98% 63%",
          "--sidebar-primary": "43 98% 63%",
          "--sidebar-primary-foreground": "218 66% 18%",
        } as React.CSSProperties
      }
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent active:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center">
                <img src="/link_logo.png" alt="Link" className="size-8 object-contain" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="font-display font-bold text-base tracking-tight whitespace-nowrap">
                  Link Leagues
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  Link School of Business
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainNav} label="Plataforma" />
        {manageNav.length > 0 && <NavMain items={manageNav} label="Gestão" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
