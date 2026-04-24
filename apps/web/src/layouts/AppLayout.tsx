import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";

export function AppLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login");
    });
  }, [navigate]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-brand-gray bg-white px-4">
          <SidebarTrigger className="text-link-blue -ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 overflow-y-auto bg-[#EAEAEA]">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
