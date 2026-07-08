import { ChevronsUpDown, Compass, HelpCircle, LogOut, Moon, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTheme } from "@/hooks/use-theme";
import { concluirOnboarding } from "@/lib/conta";
import { iniciarTourPlataforma } from "@/lib/onboarding-tour";
import { supabase } from "@/lib/supabase";

import type { UserRole } from "@link-leagues/types";

export type NavUserData = {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole | null;
};

const roleLabels: Record<UserRole, string> = {
  staff: "Staff",
  diretor: "Diretor",
  membro: "Membro",
  estudante: "Estudante",
  professor: "Professor",
};

export function NavUser({ user }: { user: NavUserData }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function handleReverTour() {
    if (isMobile) setOpenMobile(true);
    // Aguarda o dropdown fechar (e o menu mobile abrir) antes de medir os elementos
    window.setTimeout(() => {
      iniciarTourPlataforma(() => {
        void concluirOnboarding();
        if (isMobile) setOpenMobile(false);
      });
    }, 300);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar
                nome={user.name}
                src={user.avatarUrl}
                className="h-8 w-8 rounded-full"
                fallbackClassName="text-xs"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-56 rounded-xl p-1.5 shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-2 py-2">
              <UserAvatar
                nome={user.name}
                src={user.avatarUrl}
                className="h-8 w-8 rounded-full"
                fallbackClassName="text-xs"
              />
              <div className="flex flex-1 flex-col text-left leading-tight min-w-0 gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-sm truncate">{user.name}</span>
                  {user.role && (
                    <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] h-4">
                      {roleLabels[user.role]}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>

            <DropdownMenuSeparator className="my-0.5" />

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-1.5 text-[13px] cursor-pointer"
              onClick={() => navigate("/conta")}
            >
              <UserRound className="size-3.5 text-muted-foreground" />
              Meu perfil
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-1.5 text-[13px] cursor-pointer"
              onSelect={(e) => e.preventDefault()}
              onClick={toggle}
            >
              <Moon className="size-3.5 text-muted-foreground" />
              Modo escuro
              <Switch
                checked={theme === "dark"}
                className="ml-auto pointer-events-none scale-[0.65] data-[state=checked]:bg-[#165DFC]"
                thumbClassName="data-[state=checked]:bg-white"
              />
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-0.5" />

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-1.5 text-[13px] cursor-pointer"
              onClick={() => navigate("/ajuda")}
            >
              <HelpCircle className="size-3.5 text-muted-foreground" />
              Ajuda
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-1.5 text-[13px] cursor-pointer"
              onClick={handleReverTour}
            >
              <Compass className="size-3.5 text-muted-foreground" />
              Rever tour da plataforma
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-0.5" />

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-1.5 text-[13px] cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="size-3.5 text-muted-foreground" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
