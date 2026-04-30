import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga, usuarioPertenceALiga } from "../middleware/authorization.js";

export const receitasRouter: IRouter = Router();

// GET /receitas?liga_id= — lista lançamentos financeiros (somente membros, staff ou professor)
receitasRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const liga_id = req.query["liga_id"] as string | undefined;

    if (!liga_id) {
      res.status(400).json({ error: "liga_id é obrigatório." });
      return;
    }

    if (
      user.role !== "staff" &&
      user.role !== "professor" &&
      !(await usuarioPertenceALiga(user.email, liga_id))
    ) {
      res.status(403).json({ error: "Acesso restrito aos membros desta liga." });
      return;
    }

    const registros = await sql`
      SELECT id, liga_id, tipo, recorrencia, descricao, observacao, valor, data, criado_por, criado_em
      FROM receitas
      WHERE liga_id = ${liga_id}
      ORDER BY data DESC, criado_em DESC
    `;

    res.json(registros);
  } catch (err) {
    next(err);
  }
});

// POST /receitas — cria uma receita ou custo (lider ou admin)
receitasRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const { liga_id, tipo, recorrencia, descricao, observacao, valor, data } = req.body as {
      liga_id: string;
      tipo: string;
      recorrencia?: string;
      descricao: string;
      observacao?: string;
      valor: number;
      data?: string;
    };

    if (!liga_id || !tipo || !descricao || valor === undefined) {
      res.status(400).json({ error: "liga_id, tipo, descricao e valor são obrigatórios." });
      return;
    }

    if (!["receita", "custo"].includes(tipo)) {
      res.status(400).json({ error: "tipo deve ser 'receita' ou 'custo'." });
      return;
    }

    if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
      res.status(403).json({ error: "Você só pode registrar lançamentos da sua própria liga." });
      return;
    }

    const recorrenciaValida = recorrencia === "recorrente" ? "recorrente" : "unico";

    const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

    const [registro] = await sql`
      INSERT INTO receitas (liga_id, tipo, recorrencia, descricao, observacao, valor, data, criado_por)
      VALUES (
        ${liga_id},
        ${tipo},
        ${recorrenciaValida},
        ${descricao},
        ${observacao ?? null},
        ${valor},
        ${data ?? new Date().toISOString().slice(0, 10)},
        ${criador?.id ?? null}
      )
      RETURNING id, liga_id, tipo, recorrencia, descricao, observacao, valor, data, criado_por, criado_em
    `;

    res.status(201).json(registro);
  } catch (err) {
    next(err);
  }
});

// DELETE /receitas/:id — remove um registro (lider ou admin)
receitasRouter.delete(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      if (user.role === "diretor") {
        const [alvo] = await sql`SELECT liga_id FROM receitas WHERE id = ${id} LIMIT 1`;
        if (!alvo) {
          res.status(404).json({ error: "Lançamento não encontrado." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, alvo.liga_id as string))) {
          res.status(403).json({ error: "Você só pode remover lançamentos da sua própria liga." });
          return;
        }
      }

      await sql`DELETE FROM receitas WHERE id = ${id}`;

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
