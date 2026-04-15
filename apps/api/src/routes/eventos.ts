import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sql } from "../config/db.js";

export const eventosRouter: IRouter = Router();

// POST /eventos — somente diretores e admin
eventosRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const { liga_id, titulo, descricao, data, categoria, sala_id, hora_inicio, hora_fim } = req.body as {
      liga_id: string;
      titulo: string;
      descricao?: string;
      data: string;
      categoria?: string;
      sala_id?: string;
      hora_inicio?: string;
      hora_fim?: string;
    };

    const cat = categoria ?? "encontro";
    const requer_aprovacao = cat === "evento" || cat === "hub";
    const status_aprovacao = requer_aprovacao ? "pendente" : null;

    const [evento] = await sql`
      INSERT INTO eventos (liga_id, titulo, descricao, data, categoria, sala_id, hora_inicio, hora_fim, requer_aprovacao, status_aprovacao)
      VALUES (
        ${liga_id},
        ${titulo},
        ${descricao ?? null},
        ${data},
        ${cat},
        ${sala_id ?? null},
        ${hora_inicio ?? null},
        ${hora_fim ?? null},
        ${requer_aprovacao},
        ${status_aprovacao}
      )
      RETURNING *
    `;

    res.status(201).json(evento);
  } catch (err) {
    next(err);
  }
});

// PATCH /eventos/:id/status — aprovar ou rejeitar evento
eventosRouter.patch("/:id/status", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const { status } = req.body as { status: string };
    if (!["aprovado", "rejeitado"].includes(status)) {
      res.status(400).json({ error: "Status inválido. Use 'aprovado' ou 'rejeitado'." });
      return;
    }
    const id = req.params["id"] as string;
    const [evento] = await sql`
      UPDATE eventos SET status_aprovacao = ${status} WHERE id = ${id} RETURNING *
    `;
    if (!evento) { res.status(404).json({ error: "Evento não encontrado." }); return; }
    res.json(evento);
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
