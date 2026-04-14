import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const eventosRouter: IRouter = Router();

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
