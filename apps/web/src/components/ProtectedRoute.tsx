import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { cache } from "@/lib/cache";
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
    let cancelled = false;
    let recoveryDetected = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryDetected = true;
        setRecoveryMode(true);
      } else if (event === "USER_UPDATED" || event === "SIGNED_OUT") {
        setRecoveryMode(false);
      }
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        cache.limpar();
      }
    });

    // Aguarda um tick para o evento PASSWORD_RECOVERY ser emitido antes de liberar o Outlet
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (cancelled) return;

      if (!session) {
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      if (!recoveryDetected) {
        try {
          const res = await fetch(`/api/usuarios/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!cancelled && res.ok) {
            const usuario = (await res.json()) as { role: UserRole };
            setRole(usuario.role);
          }
        } catch {
          // fallback silencioso — acesso ainda permitido, role não definido
        }
      }

      if (!cancelled) setLoading(false);
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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
