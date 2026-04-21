import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import type { UserRole } from "@link-leagues/types";

export function useUser() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Timeout de segurança: se algo travar, não fica preso em loading
    const timeout = setTimeout(() => {
      setRole((prev) => prev ?? null);
    }, 3000);

    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) {
        setRole(null);
        clearTimeout(timeout);
        return;
      }
      setUserId(session.user.id);
      try {
        const { data: usuario, error } = await supabase
          .from("usuarios")
          .select("role")
          .eq("email", session.user.email)
          .single();
        if (error) throw error;
        setRole((usuario?.role as UserRole) ?? "membro");
      } catch {
        setRole(null);
      } finally {
        clearTimeout(timeout);
      }
    });

    return () => clearTimeout(timeout);
  }, []);

  return { role, userId };
}
