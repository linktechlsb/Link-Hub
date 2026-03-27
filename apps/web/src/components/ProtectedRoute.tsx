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
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session) {
        setAuthenticated(true);
        setRole(
          (session.user.user_metadata?.["role"] as UserRole) ?? "aluno"
        );
      }
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!authenticated) return <Navigate to="/auth/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/projetos" replace />;
  }

  return <Outlet />;
}
