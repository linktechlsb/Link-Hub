import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const pendentesRouter: IRouter = Router();

// GET /pendentes — retorna projetos e eventos que aguardam aprovação do staff
pendentesRouter.get("/", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const [projetos, eventos] = await Promise.all([
      sql`
        SELECT p.*, json_build_object('id', l.id, 'nome', l.nome) AS liga
        FROM projetos p
        LEFT JOIN ligas l ON l.id = p.liga_id
        WHERE p.status = 'em_aprovacao'
        ORDER BY p.criado_em ASC
      `,
      sql`
        SELECT e.*, json_build_object('id', l.id, 'nome', l.nome) AS liga
        FROM eventos e
        LEFT JOIN ligas l ON l.id = e.liga_id
        WHERE e.requer_aprovacao = TRUE AND e.status_aprovacao = 'pendente'
        ORDER BY e.criado_em ASC
      `,
    ]);

    res.json({ projetos, eventos });
  } catch (err) {
    next(err);
  }
});
