import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const usuariosRouter: IRouter = Router();

// GET /usuarios/me — retorna dados do usuário autenticado
usuariosRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const [usuario] = await sql`
      SELECT id, nome, email, role FROM usuarios
      WHERE email = ${(req as AuthenticatedRequest).user!.email}
      LIMIT 1
    `;

    if (!usuario) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    res.json(usuario);
  } catch (err) {
    next(err);
  }
});

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
