import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";

import type { StatusPresenca } from "@link-leagues/types";

export const presencaRouter: IRouter = Router();

const STATUS_VALIDOS: StatusPresenca[] = ["presente", "ausente", "justificado"];

// GET /presenca?liga_id=&usuario_id=&periodo_inicio=&periodo_fim=
presencaRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const { liga_id, usuario_id, periodo_inicio, periodo_fim } = req.query as Record<
      string,
      string
    >;

    const presencas = await sql`
      SELECT p.*, row_to_json(e.*) AS evento
      FROM presencas p
      LEFT JOIN eventos e ON e.id = p.evento_id
      WHERE TRUE
        ${liga_id ? sql`AND p.liga_id = ${liga_id}` : sql``}
        ${usuario_id ? sql`AND p.usuario_id = ${usuario_id}` : sql``}
        ${periodo_inicio ? sql`AND e.data >= ${periodo_inicio}` : sql``}
        ${periodo_fim ? sql`AND e.data <= ${periodo_fim}` : sql``}
      ORDER BY e.data DESC
    `;

    res.json(presencas);
  } catch (err) {
    next(err);
  }
});

// POST /presenca — registrar presença (upsert)
presencaRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { evento_id, usuario_id, liga_id, status, justificativa } = req.body as {
      evento_id?: string;
      usuario_id?: string;
      liga_id?: string;
      status?: string;
      justificativa?: string;
    };

    if (!evento_id || !usuario_id || !liga_id || !status) {
      res.status(400).json({ error: "evento_id, usuario_id, liga_id e status são obrigatórios." });
      return;
    }

    if (!STATUS_VALIDOS.includes(status as StatusPresenca)) {
      res.status(400).json({
        error: `status deve ser um de: ${STATUS_VALIDOS.join(", ")}.`,
      });
      return;
    }

    if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
      res.status(403).json({ error: "Você só pode registrar presença da sua própria liga." });
      return;
    }

    const [evento] = await sql`
        SELECT liga_id FROM eventos WHERE id = ${evento_id} LIMIT 1
      `;
    if (!evento) {
      res.status(404).json({ error: "Evento não encontrado." });
      return;
    }
    if ((evento.liga_id as string) !== liga_id) {
      res.status(400).json({ error: "Evento não pertence à liga informada." });
      return;
    }

    const [presenca] = await sql`
        INSERT INTO presencas (evento_id, usuario_id, liga_id, status, justificativa)
        VALUES (${evento_id}, ${usuario_id}, ${liga_id}, ${status}, ${justificativa ?? null})
        ON CONFLICT (evento_id, usuario_id)
        DO UPDATE SET status = EXCLUDED.status, justificativa = EXCLUDED.justificativa
        RETURNING *
      `;
    res.status(201).json(presenca);
  } catch (err) {
    next(err);
  }
});

// POST /presenca/lote — registro em lote para um mesmo evento
presencaRouter.post(
  "/lote",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { evento_id, registros } = req.body as {
        evento_id?: string;
        registros?: Array<{ usuario_id: string; status: string; justificativa?: string }>;
      };

      if (!evento_id || !Array.isArray(registros) || registros.length === 0) {
        res.status(400).json({ error: "evento_id e registros[] são obrigatórios." });
        return;
      }

      const [evento] = await sql`
        SELECT liga_id FROM eventos WHERE id = ${evento_id} LIMIT 1
      `;
      if (!evento) {
        res.status(404).json({ error: "Evento não encontrado." });
        return;
      }
      const liga_id = evento.liga_id as string;

      if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode registrar presença da sua própria liga." });
        return;
      }

      for (const r of registros) {
        if (!r.usuario_id || !STATUS_VALIDOS.includes(r.status as StatusPresenca)) {
          res.status(400).json({ error: "Registro inválido em registros[]." });
          return;
        }
      }

      const atualizados = await sql.begin(async (tx) => {
        const t = tx as unknown as typeof sql;
        const resultados = [];
        for (const r of registros) {
          const [row] = await t`
            INSERT INTO presencas (evento_id, usuario_id, liga_id, status, justificativa)
            VALUES (${evento_id}, ${r.usuario_id}, ${liga_id}, ${r.status}, ${r.justificativa ?? null})
            ON CONFLICT (evento_id, usuario_id)
            DO UPDATE SET status = EXCLUDED.status, justificativa = EXCLUDED.justificativa
            RETURNING *
          `;
          resultados.push(row);
        }
        return resultados;
      });

      res.status(201).json(atualizados);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /presenca/:id — justificar ausência
presencaRouter.patch(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;
      const { status, justificativa } = req.body as {
        status?: string;
        justificativa?: string;
      };

      if (status !== undefined && !STATUS_VALIDOS.includes(status as StatusPresenca)) {
        res.status(400).json({
          error: `status deve ser um de: ${STATUS_VALIDOS.join(", ")}.`,
        });
        return;
      }

      const [existente] = await sql`SELECT liga_id FROM presencas WHERE id = ${id} LIMIT 1`;
      if (!existente) {
        res.status(404).json({ error: "Registro não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, existente.liga_id as string))
      ) {
        res.status(403).json({ error: "Você só pode editar presenças da sua própria liga." });
        return;
      }

      const campos: Record<string, unknown> = {};
      if (status !== undefined) campos["status"] = status;
      if (justificativa !== undefined) campos["justificativa"] = justificativa;

      if (Object.keys(campos).length === 0) {
        res.status(400).json({ error: "Nenhum campo permitido foi enviado." });
        return;
      }

      const [presenca] = await sql`
        UPDATE presencas SET ${sql(campos)} WHERE id = ${id} RETURNING *
      `;
      res.json(presenca);
    } catch (err) {
      next(err);
    }
  },
);
