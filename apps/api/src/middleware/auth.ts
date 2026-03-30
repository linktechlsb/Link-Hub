import { Request, Response, NextFunction } from "express";
import { supabaseAnon, supabaseAdmin } from "../config/supabase.js";
import type { UserRole } from "@link-leagues/types";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hora

interface CachedSession {
  user: NonNullable<AuthenticatedRequest["user"]>;
  expiresAt: number;
}

const sessionCache = new Map<string, CachedSession>();

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

  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    next();
    return;
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data.user) {
    sessionCache.delete(token);
    res.status(401).json({ error: "Token inválido ou expirado." });
    return;
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("role")
    .eq("email", data.user.email)
    .single();

  const user = {
    id: data.user.id,
    email: data.user.email ?? "",
    role: (usuario?.role as UserRole) ?? "membro",
  };

  sessionCache.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS });

  req.user = user;
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
