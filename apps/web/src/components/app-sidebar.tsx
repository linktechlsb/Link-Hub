import {
  BarChart3,
  Calendar,
  ClipboardList,
  FolderKanban,
  Home,
  ListTodo,
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
  { title: "Home", url: "/home", icon: Home, tourId: "home" },
  { title: "Ligas", url: "/ligas", icon: Users, tourId: "ligas" },
  { title: "Projetos", url: "/projetos", icon: FolderKanban, tourId: "projetos" },
  { title: "Tarefas", url: "/tarefas", icon: ListTodo, tourId: "tarefas" },
  {
    title: "Eventos",
    url: "/calendario",
    icon: Calendar,
    tourId: "eventos",
    children: [
      { title: "Calendário", url: "/calendario" },
      {
        title: "Solicitar eventos",
        url: "/calendario/solicitar-eventos",
        roles: ["staff", "diretor", "lider"],
      },
      { title: "Marcar encontros", url: "/calendario/marcar-encontros" },
      { title: "Guia", url: "/calendario/guia" },
    ],
  },
  { title: "Mural", url: "/mural", icon: MessageSquare, tourId: "mural" },
  { title: "Ranking", url: "/ranking", icon: Trophy, tourId: "ranking" },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useUser();
  const [podeVerDados, setPodeVerDados] = useState(false);
  const [user, setUser] = useState<NavUserData>({
    name: "",
    email: "",
    avatarUrl: null,
    role: null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch("/api/analytics/acesso", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { permitido } = (await res.json()) as { permitido: boolean };
          setPodeVerDados(permitido);
        }
      } catch {
        // silencioso
      }
    });
  }, []);

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
        role,
      });
    });
  }, []);

  const isStaff = role === "staff";
  const canManage = role === "staff" || role === "diretor";

  const manageNav: NavMainItem[] = [];
  if (isStaff) {
    manageNav.push({
      title: "Super Admin",
      url: "/super-admin",
      icon: ShieldCheck,
      tourId: "super-admin",
    });
  }
  if (canManage) {
    manageNav.push({
      title: "Formulários",
      url: "/formularios",
      icon: ClipboardList,
      disabled: true,
    });
    manageNav.push({
      title: "Gerenciamento",
      url: "/gerenciamento",
      icon: Settings,
      tourId: "gerenciamento",
    });
  }
  if (podeVerDados) {
    manageNav.push({ title: "Dados", url: "/dados", icon: BarChart3, tourId: "dados" });
  }

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/home">
                <div className="flex aspect-square size-8 items-center justify-center">
                  <img src="/link_logo.png" alt="Link" className="size-8 object-contain" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="font-display font-bold text-base tracking-[-0.02em] whitespace-nowrap">
                    Link Leagues
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/40">
                    Link School of Business
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={mainNav.map((item) =>
            item.children
              ? {
                  ...item,
                  children: item.children.filter(
                    (child) => !child.roles || child.roles.includes(role ?? ""),
                  ),
                }
              : item,
          )}
          label="Plataforma"
        />
        {manageNav.length > 0 && <NavMain items={manageNav} label="Gestão" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
