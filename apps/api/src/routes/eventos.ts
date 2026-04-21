import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

export const eventosRouter: IRouter = Router();

// POST /eventos — somente diretores e staff
eventosRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const { liga_id, titulo, descricao, data, categoria, sala_id, hora_inicio, hora_fim } =
      req.body as {
        liga_id: string;
        titulo: string;
        descricao?: string;
        data: string;
        categoria?: string;
        sala_id?: string;
        hora_inicio?: string;
        hora_fim?: string;
      };

    const user = (req as AuthenticatedRequest).user!;

    // Diretores só podem criar eventos para sua própria liga
    if (user.role === "diretor") {
      const [membro] = await sql`
        SELECT 1 FROM liga_membros lm
        JOIN usuarios u ON u.id = lm.usuario_id
        WHERE lm.liga_id = ${liga_id} AND u.email = ${user.email} AND lm.cargo = 'Diretor'
      `;
      if (!membro) {
        res
          .status(403)
          .json({ error: "Você só pode criar/editar/excluir eventos da sua própria liga." });
        return;
      }
    }

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

// PATCH /eventos/:id/status — aprovar ou rejeitar evento (rota específica antes da genérica)
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
    if (!evento) {
      res.status(404).json({ error: "Evento não encontrado." });
      return;
    }
    res.json(evento);
  } catch (err) {
    next(err);
  }
});

// PATCH /eventos/:id — editar dados do evento
eventosRouter.patch(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [eventoAtual] = await sql`SELECT * FROM eventos WHERE id = ${id}`;
      if (!eventoAtual) {
        res.status(404).json({ error: "Evento não encontrado." });
        return;
      }

      // Diretores só podem editar eventos da sua própria liga
      if (user.role === "diretor") {
        const liga_id = eventoAtual.liga_id as string;
        const [membro] = await sql`
        SELECT 1 FROM liga_membros lm
        JOIN usuarios u ON u.id = lm.usuario_id
        WHERE lm.liga_id = ${liga_id} AND u.email = ${user.email} AND lm.cargo = 'Diretor'
      `;
        if (!membro) {
          res
            .status(403)
            .json({ error: "Você só pode criar/editar/excluir eventos da sua própria liga." });
          return;
        }
      }

      const { titulo, descricao, data, categoria, sala_id, hora_inicio, hora_fim } = req.body as {
        titulo?: string;
        descricao?: string;
        data?: string;
        categoria?: string;
        sala_id?: string;
        hora_inicio?: string;
        hora_fim?: string;
      };

      const cat = categoria ?? eventoAtual.categoria;
      const requer_aprovacao = cat === "evento" || cat === "hub";

      const campoRelevanteMudou =
        (titulo !== undefined && titulo !== eventoAtual.titulo) ||
        (data !== undefined && data !== eventoAtual.data) ||
        (descricao !== undefined && descricao !== eventoAtual.descricao) ||
        (sala_id !== undefined && sala_id !== String(eventoAtual.sala_id ?? ""));

      const status_aprovacao = requer_aprovacao
        ? user.role === "staff"
          ? (eventoAtual.status_aprovacao ?? "pendente")
          : campoRelevanteMudou
            ? "pendente"
            : (eventoAtual.status_aprovacao ?? "pendente")
        : null;

      const [eventoAtualizado] = await sql`
      UPDATE eventos SET
        titulo            = COALESCE(${titulo ?? null}, titulo),
        descricao         = ${descricao !== undefined ? descricao || null : eventoAtual.descricao},
        data              = COALESCE(${data ?? null}, data),
        categoria         = ${cat},
        sala_id           = ${sala_id !== undefined ? sala_id || null : eventoAtual.sala_id},
        hora_inicio       = ${hora_inicio !== undefined ? hora_inicio || null : eventoAtual.hora_inicio},
        hora_fim          = ${hora_fim !== undefined ? hora_fim || null : eventoAtual.hora_fim},
        requer_aprovacao  = ${requer_aprovacao},
        status_aprovacao  = ${status_aprovacao}
      WHERE id = ${id}
      RETURNING *
    `;

      res.json(eventoAtualizado);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /eventos/:id — excluir evento
eventosRouter.delete(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [eventoAtual] = await sql`SELECT * FROM eventos WHERE id = ${id}`;
      if (!eventoAtual) {
        res.status(404).json({ error: "Evento não encontrado." });
        return;
      }

      // Diretores só podem excluir eventos da sua própria liga
      if (user.role === "diretor") {
        const liga_id = eventoAtual.liga_id as string;
        const [membro] = await sql`
        SELECT 1 FROM liga_membros lm
        JOIN usuarios u ON u.id = lm.usuario_id
        WHERE lm.liga_id = ${liga_id} AND u.email = ${user.email} AND lm.cargo = 'Diretor'
      `;
        if (!membro) {
          res
            .status(403)
            .json({ error: "Você só pode criar/editar/excluir eventos da sua própria liga." });
          return;
        }
      }

      await sql`DELETE FROM eventos WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

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
