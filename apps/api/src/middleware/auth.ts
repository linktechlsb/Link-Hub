import { Request, Response, NextFunction } from "express";
import { supabaseAnon } from "../config/supabase.js";
import { sql } from "../config/db.js";
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
const pendingAuth = new Map<string, Promise<CachedSession | null>>();

setInterval(() => {
  const agora = Date.now();
  for (const [token, cached] of sessionCache.entries()) {
    if (cached.expiresAt <= agora) sessionCache.delete(token);
  }
}, 15 * 60 * 1000);

async function resolveSession(token: string): Promise<CachedSession | null> {
  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data.user) return null;

  const [usuario] = await sql`
    SELECT role FROM usuarios WHERE email = ${data.user.email} LIMIT 1
  `;

  const session: CachedSession = {
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      role: (usuario?.role as UserRole) ?? "membro",
    },
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  sessionCache.set(token, session);
  return session;
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

  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    next();
    return;
  }

  // Deduplica chamadas simultâneas com o mesmo token
  let pending = pendingAuth.get(token);
  if (!pending) {
    pending = resolveSession(token).finally(() => pendingAuth.delete(token));
    pendingAuth.set(token, pending);
  }

  const session = await pending;

  if (!session) {
    sessionCache.delete(token);
    res.status(401).json({ error: "Token inválido ou expirado." });
    return;
  }

  req.user = session.user;
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
