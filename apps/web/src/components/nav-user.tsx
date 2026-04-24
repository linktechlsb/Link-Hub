import { ChevronsUpDown, LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";

export type NavUserData = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

function initials(value: string) {
  const source = value.trim();
  if (!source) return "LL";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "LL";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

export function NavUser({ user }: { user: NavUserData }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

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
              <Avatar className="h-8 w-8 rounded-lg bg-brand-yellow text-navy">
                {user.avatarUrl ? (
                  <AvatarImage
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    className="rounded-lg object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg bg-brand-yellow text-navy font-semibold">
                  {initials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name || "Usuário"}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg bg-brand-yellow text-navy">
                  {user.avatarUrl ? (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user.name || user.email}
                      className="rounded-lg object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-brand-yellow text-navy font-semibold">
                    {initials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name || "Usuário"}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/conta")}>
                <UserIcon />
                Conta
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
