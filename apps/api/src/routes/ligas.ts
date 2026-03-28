import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const ligasRouter: IRouter = Router();

// GET /ligas — lista todas as ligas
ligasRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const ligas = await sql`SELECT * FROM ligas ORDER BY nome`;
    res.json(ligas);
  } catch (err) {
    next(err);
  }
});

// GET /ligas/:id — detalhe de uma liga com membros
ligasRouter.get("/:id", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const [liga] = await sql`
      SELECT
        l.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', lm.id,
              'usuario_id', lm.usuario_id,
              'cargo', lm.cargo,
              'usuario', json_build_object('id', u.id, 'nome', u.nome, 'email', u.email)
            )
          ) FILTER (WHERE lm.id IS NOT NULL),
          '[]'
        ) AS membros
      FROM ligas l
      LEFT JOIN liga_membros lm ON lm.liga_id = l.id
      LEFT JOIN usuarios u ON u.id = lm.usuario_id
      WHERE l.id = ${id}
      GROUP BY l.id
    `;

    if (!liga) { res.status(404).json({ error: "Liga não encontrada." }); return; }
    res.json(liga);
  } catch (err) {
    next(err);
  }
});

// POST /ligas — criar liga (staff)
ligasRouter.post("/", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const { nome, descricao, lider_id } = req.body as {
      nome: string;
      descricao?: string;
      lider_id: string;
    };

    const [liga] = await sql`
      INSERT INTO ligas (nome, descricao, lider_id)
      VALUES (${nome}, ${descricao ?? null}, ${lider_id})
      RETURNING *
    `;

    res.status(201).json(liga);
  } catch (err) {
    next(err);
  }
});

// PATCH /ligas/:id — editar liga
ligasRouter.patch("/:id", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const updates = req.body as Record<string, unknown>;

    const [liga] = await sql`
      UPDATE ligas SET ${sql(updates)} WHERE id = ${id} RETURNING *
    `;

    if (!liga) { res.status(404).json({ error: "Liga não encontrada." }); return; }
    res.json(liga);
  } catch (err) {
    next(err);
  }
});

// DELETE /ligas/:id — arquivar liga (staff)
ligasRouter.delete("/:id", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    await sql`UPDATE ligas SET ativo = false WHERE id = ${id}`;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
