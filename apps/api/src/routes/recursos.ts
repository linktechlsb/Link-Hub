import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const recursosRouter: IRouter = Router();

// GET /recursos?liga_id= — lista recursos de uma liga
recursosRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const liga_id = req.query["liga_id"] as string | undefined;

    if (!liga_id) {
      res.status(400).json({ error: "liga_id é obrigatório." });
      return;
    }

    const recursos = await sql`
      SELECT id, liga_id, titulo, tipo, url, icone, cor, criado_por, criado_em
      FROM recursos
      WHERE liga_id = ${liga_id}
      ORDER BY criado_em DESC
    `;

    res.json(recursos);
  } catch (err) {
    next(err);
  }
});

// POST /recursos — cria um recurso (lider da liga ou admin)
recursosRouter.post("/", authenticate, requireRole("admin", "diretor"), async (req, res, next) => {
  try {
    const email = (req as AuthenticatedRequest).user!.email;
    const { liga_id, titulo, tipo, url, icone, cor } = req.body as {
      liga_id: string;
      titulo: string;
      tipo: string;
      url: string;
      icone?: string;
      cor?: string;
    };

    if (!liga_id || !titulo || !url) {
      res.status(400).json({ error: "liga_id, titulo e url são obrigatórios." });
      return;
    }

    const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${email} LIMIT 1`;

    const [recurso] = await sql`
      INSERT INTO recursos (liga_id, titulo, tipo, url, icone, cor, criado_por)
      VALUES (
        ${liga_id},
        ${titulo},
        ${tipo ?? "link"},
        ${url},
        ${icone ?? "link"},
        ${cor ?? "#546484"},
        ${criador?.id ?? null}
      )
      RETURNING id, liga_id, titulo, tipo, url, icone, cor, criado_por, criado_em
    `;

    res.status(201).json(recurso);
  } catch (err) {
    next(err);
  }
});

// PATCH /recursos/:id — atualiza um recurso (lider ou admin)
recursosRouter.patch("/:id", authenticate, requireRole("admin", "diretor"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const { titulo, tipo, url, icone, cor } = req.body as {
      titulo?: string;
      tipo?: string;
      url?: string;
      icone?: string;
      cor?: string;
    };

    const [recurso] = await sql`
      UPDATE recursos
      SET
        titulo = COALESCE(${titulo ?? null}, titulo),
        tipo   = COALESCE(${tipo ?? null},   tipo),
        url    = COALESCE(${url ?? null},    url),
        icone  = COALESCE(${icone ?? null},  icone),
        cor    = COALESCE(${cor ?? null},    cor)
      WHERE id = ${id}
      RETURNING id, liga_id, titulo, tipo, url, icone, cor, criado_por, criado_em
    `;

    if (!recurso) {
      res.status(404).json({ error: "Recurso não encontrado." });
      return;
    }

    res.json(recurso);
  } catch (err) {
    next(err);
  }
});

// DELETE /recursos/:id — remove um recurso (lider ou admin)
recursosRouter.delete("/:id", authenticate, requireRole("admin", "diretor"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;

    await sql`DELETE FROM recursos WHERE id = ${id}`;

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
