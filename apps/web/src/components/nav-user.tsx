import { ChevronsUpDown, HelpCircle, LogOut, Moon, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useTheme } from "@/hooks/use-theme";
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
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
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
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-full text-xs font-medium">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
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
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-full text-xs font-medium">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
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

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-2 text-sm cursor-pointer"
              onClick={() => navigate("/conta")}
            >
              <UserRound className="size-4 text-muted-foreground" />
              Meu perfil
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-2 text-sm cursor-pointer"
              onSelect={(e) => e.preventDefault()}
              onClick={toggle}
            >
              <Moon className="size-4 text-muted-foreground" />
              Modo escuro
              <Switch
                checked={theme === "dark"}
                className="ml-auto pointer-events-none scale-[0.65] data-[state=checked]:bg-[#165DFC]"
                thumbClassName="data-[state=checked]:bg-white"
              />
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-2 text-sm cursor-pointer"
              onClick={() => navigate("/ajuda")}
            >
              <HelpCircle className="size-4 text-muted-foreground" />
              Ajuda
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              className="gap-2.5 rounded-lg px-2 py-2 text-sm cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="size-4 text-muted-foreground" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
