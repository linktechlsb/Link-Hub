import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { supabase } from "@/lib/supabase";

import type { UserRole } from "@link-leagues/types";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) {
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      try {
        const res = await fetch(`/api/usuarios/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const usuario = (await res.json()) as { role: UserRole };
          setRole(usuario.role);
        }
      } catch {
        // fallback silencioso — acesso ainda permitido, role não definido
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      } else if (event === "USER_UPDATED" || event === "SIGNED_OUT") {
        setRecoveryMode(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  if (!authenticated) return <Navigate to="/login" replace />;

  if (recoveryMode) return <Navigate to="/redefinir-senha" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
