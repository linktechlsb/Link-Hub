import { ChevronRight, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
  children?: { title: string; url: string; roles?: string[] }[];
};

export function NavMain({ items, label }: { items: NavMainItem[]; label?: string }) {
  const location = useLocation();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          if (item.disabled) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  disabled
                  className="opacity-40 cursor-not-allowed"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          if (item.children && item.children.length > 0) {
            const isChildActive = item.children.some((c) => location.pathname.startsWith(c.url));
            const isParentActive =
              location.pathname === item.url || location.pathname.startsWith(item.url + "/");
            return (
              <NavItemWithChildren
                key={item.title}
                item={item as NavMainItem & { children: { title: string; url: string }[] }}
                isParentActive={isParentActive}
                isChildActive={isChildActive}
              />
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <NavLink to={item.url}>
                {({ isActive }) => (
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavItemWithChildren({
  item,
  isParentActive,
  isChildActive,
}: {
  item: NavMainItem & { children: { title: string; url: string }[] };
  isParentActive: boolean;
  isChildActive: boolean;
}) {
  const [open, setOpen] = useState(isParentActive || isChildActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <NavLink to={item.url} onClick={() => setOpen(true)}>
            {({ isActive }) => (
              <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                <item.icon />
                <span>{item.title}</span>
                <ChevronRight
                  className="ml-auto transition-transform duration-200 data-[state=open]:rotate-90"
                  data-state={open ? "open" : "closed"}
                />
              </SidebarMenuButton>
            )}
          </NavLink>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.title}>
                <NavLink to={child.url}>
                  {({ isActive }) => (
                    <SidebarMenuSubButton isActive={isActive}>{child.title}</SidebarMenuSubButton>
                  )}
                </NavLink>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
