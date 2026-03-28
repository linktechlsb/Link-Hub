import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const salasRouter: IRouter = Router();

// GET /salas — lista salas disponíveis
salasRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const salas = await sql`SELECT * FROM salas ORDER BY nome`;
    res.json(salas);
  } catch (err) {
    next(err);
  }
});

// GET /salas/reservas?sala_id=&data_inicio=&data_fim=
salasRouter.get("/reservas", authenticate, async (req, res, next) => {
  try {
    const { sala_id, data_inicio, data_fim } = req.query as Record<string, string>;

    const reservas = await sql`
      SELECT r.*, row_to_json(s.*) AS sala, json_build_object('id', l.id, 'nome', l.nome) AS liga
      FROM reservas_salas r
      LEFT JOIN salas s ON s.id = r.sala_id
      LEFT JOIN ligas l ON l.id = r.liga_id
      WHERE TRUE
        ${sala_id ? sql`AND r.sala_id = ${sala_id}` : sql``}
        ${data_inicio ? sql`AND r.inicio >= ${data_inicio}` : sql``}
        ${data_fim ? sql`AND r.fim <= ${data_fim}` : sql``}
      ORDER BY r.inicio
    `;

    res.json(reservas);
  } catch (err) {
    next(err);
  }
});

// POST /salas/reservas — criar reserva
salasRouter.post("/reservas", authenticate, async (req, res, next) => {
  try {
    const { sala_id, inicio, fim } = req.body as { sala_id: string; inicio: string; fim: string };

    // Verificar conflito de horário
    const [conflito] = await sql`
      SELECT id FROM reservas_salas
      WHERE sala_id = ${sala_id}
        AND inicio < ${fim}
        AND fim > ${inicio}
      LIMIT 1
    `;

    if (conflito) {
      res.status(409).json({ error: "Conflito de horário: a sala já está reservada neste período." });
      return;
    }

    const [reserva] = await sql`
      INSERT INTO reservas_salas ${sql(req.body)} RETURNING *
    `;

    res.status(201).json(reserva);
  } catch (err) {
    next(err);
  }
});

// DELETE /salas/reservas/:id — cancelar reserva
salasRouter.delete("/reservas/:id", authenticate, async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    await sql`DELETE FROM reservas_salas WHERE id = ${id}`;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
