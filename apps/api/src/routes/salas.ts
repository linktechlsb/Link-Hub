import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

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
    const { liga_id, titulo, descricao } = req.body as {
      liga_id?: string;
      titulo?: string;
      descricao?: string;
    };

    const campos: Record<string, unknown> = { sala_id, inicio, fim };
    if (liga_id !== undefined) campos["liga_id"] = liga_id;
    if (titulo !== undefined) campos["titulo"] = titulo;
    if (descricao !== undefined) campos["descricao"] = descricao;

    // Verificar conflito e inserir atomicamente via transação com SELECT FOR UPDATE
    const reserva = await sql.begin(async (tx) => {
      const t = tx as unknown as typeof sql;
      // Bloqueia linhas conflitantes para evitar inserções concorrentes
      await t`
        SELECT id FROM reservas_salas
        WHERE sala_id = ${sala_id}
          AND inicio < ${fim}
          AND fim > ${inicio}
        FOR UPDATE
      `;

      const [conflito] = await t`
        SELECT id FROM reservas_salas
        WHERE sala_id = ${sala_id}
          AND inicio < ${fim}
          AND fim > ${inicio}
        LIMIT 1
      `;

      if (conflito) return null;

      const [nova] = await t`INSERT INTO reservas_salas ${t(campos)} RETURNING *`;
      return nova;
    });

    if (!reserva) {
      res
        .status(409)
        .json({ error: "Conflito de horário: a sala já está reservada neste período." });
      return;
    }

    res.status(201).json(reserva);
  } catch (err) {
    next(err);
  }
});

// DELETE /salas/reservas/:id — cancelar reserva
salasRouter.delete(
  "/reservas/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      if (user.role === "diretor") {
        // Buscar reserva e verificar se pertence à liga do diretor
        const [reserva] = await sql`SELECT liga_id FROM reservas_salas WHERE id = ${id}`;
        if (!reserva) {
          res.status(404).json({ error: "Reserva não encontrada." });
          return;
        }

        const [membro] = await sql`
        SELECT 1 FROM liga_membros lm
        JOIN usuarios u ON u.id = lm.usuario_id
        WHERE lm.liga_id = ${reserva.liga_id}
          AND u.email = ${user.email}
          AND lm.cargo = 'Diretor'
      `;
        if (!membro) {
          res.status(403).json({ error: "Não autorizado a cancelar esta reserva." });
          return;
        }
      }

      await sql`DELETE FROM reservas_salas WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
