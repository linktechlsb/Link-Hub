import { type Response, type NextFunction } from "express";

import { type AuthenticatedRequest } from "./auth.js";
import { sql } from "../config/db.js";

export async function usuarioEhProfessorDaLiga(userId: string, ligaId: string): Promise<boolean> {
  const [match] = await sql`
    SELECT 1 FROM ligas
    WHERE id = ${ligaId}
      AND (professor_id IS NULL OR professor_id = ${userId})
    LIMIT 1
  `;
  return Boolean(match);
}

export async function usuarioEhDiretorDaLiga(email: string, ligaId: string): Promise<boolean> {
  const [match] = await sql`
    SELECT 1
    FROM ligas l
    LEFT JOIN liga_membros lm ON lm.liga_id = l.id
    LEFT JOIN usuarios u ON u.id = lm.usuario_id
    WHERE l.id = ${ligaId}
      AND (
        l.lider_id = (SELECT id FROM usuarios WHERE email = ${email})
        OR (u.email = ${email} AND lm.cargo = 'Diretor')
      )
    LIMIT 1
  `;
  return Boolean(match);
}

export async function usuarioPertenceALiga(email: string, ligaId: string): Promise<boolean> {
  const [match] = await sql`
    SELECT 1
    FROM ligas l
    LEFT JOIN liga_membros lm ON lm.liga_id = l.id
    LEFT JOIN usuarios u ON u.id = lm.usuario_id
    WHERE l.id = ${ligaId}
      AND l.ativo = true
      AND (
        l.lider_id = (SELECT id FROM usuarios WHERE email = ${email})
        OR u.email = ${email}
      )
    LIMIT 1
  `;
  return Boolean(match);
}

export function requireLigaOwnership(paramName = "id") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Não autenticado." });
      return;
    }

    if (user.role === "staff") {
      next();
      return;
    }

    if (user.role !== "diretor") {
      res.status(403).json({ error: "Acesso não autorizado." });
      return;
    }

    const ligaIdRaw =
      req.params[paramName] ?? (req.body as { liga_id?: string } | undefined)?.liga_id;
    const ligaId = typeof ligaIdRaw === "string" ? ligaIdRaw : undefined;
    if (!ligaId) {
      res.status(400).json({ error: "Liga não informada." });
      return;
    }

    const autorizado = await usuarioEhDiretorDaLiga(user.email, ligaId);
    if (!autorizado) {
      res.status(403).json({ error: "Você só pode gerenciar recursos da sua própria liga." });
      return;
    }
    next();
  };
}

export function requireLigaMembership(paramName = "id") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Não autenticado." });
      return;
    }

    if (user.role === "staff" || user.role === "professor") {
      next();
      return;
    }

    const ligaIdRaw = req.params[paramName];
    const ligaId = typeof ligaIdRaw === "string" ? ligaIdRaw : undefined;
    if (!ligaId) {
      res.status(400).json({ error: "Liga não informada." });
      return;
    }

    const pertence = await usuarioPertenceALiga(user.email, ligaId);
    if (!pertence) {
      res.status(403).json({ error: "Acesso restrito aos membros desta liga." });
      return;
    }
    next();
  };
}
