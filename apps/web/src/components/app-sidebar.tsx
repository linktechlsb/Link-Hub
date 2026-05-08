import {
  Calendar,
  ClipboardList,
  FolderKanban,
  Home,
  MessageCirclePlus,
  MessageSquare,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";

import { FeedbackDialog } from "@/components/FeedbackDialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [user, setUser] = useState<NavUserData>({
    name: "",
    email: "",
    avatarUrl: null,
    role: null,
  });
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    manageNav.push({ title: "Super Admin", url: "/super-admin", icon: ShieldCheck });
  }
  if (canManage) {
    manageNav.push({ title: "Formulários", url: "/formularios", icon: ClipboardList });
    manageNav.push({ title: "Gerenciamento", url: "/gerenciamento", icon: Settings });
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
                  <span className="font-display font-bold text-base tracking-tight whitespace-nowrap">
                    Link Leagues
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Link School of Business
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainNav} label="Plataforma" />
        {manageNav.length > 0 && <NavMain items={manageNav} label="Gestão" />}
      </SidebarContent>
      <SidebarFooter>
        <TooltipProvider delayDuration={0}>
          <SidebarMenu>
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton onClick={() => setFeedbackOpen(true)}>
                    <MessageCirclePlus />
                    <span>Feedback</span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">Enviar Feedback</TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </TooltipProvider>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Sidebar>
  );
}
