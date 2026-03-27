import { Request, Response, NextFunction } from "express";
import { supabaseAnon } from "../config/supabase.js";
import type { UserRole } from "@link-leagues/types";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticação ausente." });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Token inválido ou expirado." });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? "",
    role: (data.user.user_metadata?.["role"] as UserRole) ?? "aluno",
  };

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Acesso não autorizado." });
      return;
    }
    next();
  };
}
