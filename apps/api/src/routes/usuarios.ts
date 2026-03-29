import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const usuariosRouter: IRouter = Router();

// GET /usuarios/busca?email= — busca usuários por e-mail (autocomplete de diretores)
usuariosRouter.get("/busca", authenticate, requireRole("admin", "lider"), async (req, res, next) => {
  try {
    const email = (req.query["email"] as string) ?? "";

    if (email.length < 2) {
      res.json([]);
      return;
    }

    const usuarios = await sql`
      SELECT id, nome, email FROM usuarios
      WHERE email ILIKE ${"%" + email + "%"}
      LIMIT 10
    `;

    res.json(usuarios);
  } catch (err) {
    next(err);
  }
});
