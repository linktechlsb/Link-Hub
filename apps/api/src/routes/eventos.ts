import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const eventosRouter: IRouter = Router();

// POST /eventos — somente diretores e admin
eventosRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const { liga_id, titulo, descricao, data } = req.body as {
      liga_id: string;
      titulo: string;
      descricao?: string;
      data: string;
    };

    const [evento] = await sql`
      INSERT INTO eventos (liga_id, titulo, descricao, data)
      VALUES (${liga_id}, ${titulo}, ${descricao ?? null}, ${data})
      RETURNING *
    `;

    res.status(201).json(evento);
  } catch (err) {
    next(err);
  }
});

// GET /eventos?inicio=&fim=&liga_id=
eventosRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const { inicio, fim, liga_id } = req.query as Record<string, string>;

    const eventos = await sql`
      SELECT e.*,
             row_to_json(l.*) AS liga
      FROM eventos e
      LEFT JOIN ligas l ON l.id = e.liga_id
      WHERE TRUE
        ${liga_id ? sql`AND e.liga_id = ${liga_id}` : sql``}
        ${inicio ? sql`AND e.data::date >= ${inicio}::date` : sql``}
        ${fim ? sql`AND e.data::date <= ${fim}::date` : sql``}
      ORDER BY e.data ASC
    `;

    res.json(eventos);
  } catch (err) {
    next(err);
  }
});
