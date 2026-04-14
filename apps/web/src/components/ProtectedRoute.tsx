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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) {
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}/usuarios/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const usuario = await res.json() as { role: UserRole };
          setRole(usuario.role);
        }
      } catch {
        // fallback silencioso — acesso ainda permitido, role não definido
      }

      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!authenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
