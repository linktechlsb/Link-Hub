import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const presencaRouter: IRouter = Router();

// GET /presenca?liga_id=&usuario_id=&periodo_inicio=&periodo_fim=
presencaRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const { liga_id, usuario_id, periodo_inicio, periodo_fim } = req.query as Record<string, string>;

    const presencas = await sql`
      SELECT p.*, row_to_json(e.*) AS evento
      FROM presencas p
      LEFT JOIN eventos e ON e.id = p.evento_id
      WHERE TRUE
        ${liga_id ? sql`AND p.liga_id = ${liga_id}` : sql``}
        ${usuario_id ? sql`AND p.usuario_id = ${usuario_id}` : sql``}
        ${periodo_inicio ? sql`AND p.data >= ${periodo_inicio}` : sql``}
        ${periodo_fim ? sql`AND p.data <= ${periodo_fim}` : sql``}
      ORDER BY p.data DESC
    `;

    res.json(presencas);
  } catch (err) {
    next(err);
  }
});

// POST /presenca — registrar presença
presencaRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const [presenca] = await sql`
      INSERT INTO presencas ${sql(req.body)} RETURNING *
    `;
    res.status(201).json(presenca);
  } catch (err) {
    next(err);
  }
});

// PATCH /presenca/:id — justificar ausência
presencaRouter.patch("/:id", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    const [presenca] = await sql`
      UPDATE presencas SET ${sql(req.body)} WHERE id = ${id} RETURNING *
    `;
    if (!presenca) { res.status(404).json({ error: "Registro não encontrado." }); return; }
    res.json(presenca);
  } catch (err) {
    next(err);
  }
});
