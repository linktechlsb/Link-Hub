import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga, usuarioPertenceALiga } from "../middleware/authorization.js";

import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
  CreateTarefaInput,
  UpdateTarefaInput,
} from "@link-leagues/types";

export const milestonesRouter: IRouter = Router();

// GET /milestones?projeto_id=:id
milestonesRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const projetoId = req.query["projeto_id"] as string | undefined;

    if (!projetoId) {
      res.status(400).json({ error: "projeto_id é obrigatório." });
      return;
    }

    const [projeto] = await sql`SELECT liga_id FROM projetos WHERE id = ${projetoId} LIMIT 1`;
    if (!projeto) {
      res.status(404).json({ error: "Projeto não encontrado." });
      return;
    }

    if (user.role !== "staff" && user.role !== "diretor" && user.role !== "professor") {
      if (!(await usuarioPertenceALiga(user.email, projeto["liga_id"] as string))) {
        res.status(403).json({ error: "Acesso restrito aos membros desta liga." });
        return;
      }
    }

    const milestones = await sql`
      SELECT m.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', t.id,
              'milestone_id', t.milestone_id,
              'titulo', t.titulo,
              'descricao', t.descricao,
              'responsavel_id', t.responsavel_id,
              'responsavel_nome', u.nome,
              'status', t.status,
              'prazo', t.prazo,
              'criado_por', t.criado_por,
              'criado_em', t.criado_em,
              'atualizado_em', t.atualizado_em
            ) ORDER BY t.criado_em ASC
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tarefas
      FROM milestones m
      LEFT JOIN tarefas t ON t.milestone_id = m.id
      LEFT JOIN usuarios u ON u.id = t.responsavel_id
      WHERE m.projeto_id = ${projetoId}
      GROUP BY m.id
      ORDER BY m.ordem ASC, m.criado_em ASC
    `;

    res.json(milestones);
  } catch (err) {
    next(err);
  }
});

// POST /milestones
milestonesRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { projeto_id, titulo, descricao, prazo, ordem } = req.body as CreateMilestoneInput & {
        ordem?: number;
      };

      if (!projeto_id || !titulo) {
        res.status(400).json({ error: "projeto_id e titulo são obrigatórios." });
        return;
      }

      const [projeto] = await sql`SELECT liga_id FROM projetos WHERE id = ${projeto_id} LIMIT 1`;
      if (!projeto) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, projeto["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Você só pode gerenciar milestones da sua própria liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      const body: Record<string, unknown> = {
        projeto_id,
        titulo,
        criado_por: criador?.["id"] ?? null,
        ordem: ordem ?? 0,
      };
      if (descricao !== undefined) body["descricao"] = descricao;
      if (prazo !== undefined) body["prazo"] = prazo;

      const [milestone] = await sql`INSERT INTO milestones ${sql(body)} RETURNING *`;
      res.status(201).json({ ...milestone, tarefas: [] });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /milestones/:id
milestonesRouter.patch(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const id = req.params["id"] as string;
      const { titulo, descricao, prazo, status, ordem } = req.body as UpdateMilestoneInput & {
        ordem?: number;
      };

      const [existente] = await sql`
        SELECT m.id, p.liga_id FROM milestones m
        JOIN projetos p ON p.id = m.projeto_id
        WHERE m.id = ${id} LIMIT 1
      `;
      if (!existente) {
        res.status(404).json({ error: "Milestone não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Você só pode gerenciar milestones da sua própria liga." });
        return;
      }

      const updates: Record<string, unknown> = { atualizado_em: new Date() };
      if (titulo !== undefined) updates["titulo"] = titulo;
      if (descricao !== undefined) updates["descricao"] = descricao;
      if (prazo !== undefined) updates["prazo"] = prazo;
      if (status !== undefined) updates["status"] = status;
      if (ordem !== undefined) updates["ordem"] = ordem;

      const [milestone] = await sql`
        UPDATE milestones SET ${sql(updates)} WHERE id = ${id} RETURNING *
      `;
      res.json(milestone);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /milestones/:id
milestonesRouter.delete(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const id = req.params["id"] as string;

      const [existente] = await sql`
        SELECT m.id, p.liga_id FROM milestones m
        JOIN projetos p ON p.id = m.projeto_id
        WHERE m.id = ${id} LIMIT 1
      `;
      if (!existente) {
        res.status(404).json({ error: "Milestone não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Você só pode gerenciar milestones da sua própria liga." });
        return;
      }

      await sql`DELETE FROM milestones WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// POST /milestones/:milestoneId/tarefas
milestonesRouter.post(
  "/:milestoneId/tarefas",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const milestoneId = req.params["milestoneId"] as string;
      const { titulo, descricao, responsavel_id, prazo } = req.body as CreateTarefaInput;

      if (!titulo) {
        res.status(400).json({ error: "titulo é obrigatório." });
        return;
      }

      const [milestone] = await sql`
        SELECT m.id, p.liga_id FROM milestones m
        JOIN projetos p ON p.id = m.projeto_id
        WHERE m.id = ${milestoneId} LIMIT 1
      `;
      if (!milestone) {
        res.status(404).json({ error: "Milestone não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, milestone["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Você só pode gerenciar tarefas da sua própria liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      const body: Record<string, unknown> = {
        milestone_id: milestoneId,
        titulo,
        criado_por: criador?.["id"] ?? null,
      };
      if (descricao !== undefined) body["descricao"] = descricao;
      if (responsavel_id !== undefined) body["responsavel_id"] = responsavel_id;
      if (prazo !== undefined) body["prazo"] = prazo;

      const [tarefa] = await sql`
        INSERT INTO tarefas ${sql(body)} RETURNING *,
          (SELECT nome FROM usuarios WHERE id = tarefas.responsavel_id) AS responsavel_nome
      `;
      res.status(201).json(tarefa);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /milestones/:milestoneId/tarefas/:tarefaId
milestonesRouter.patch("/:milestoneId/tarefas/:tarefaId", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const tarefaId = req.params["tarefaId"] as string;
    const { titulo, descricao, responsavel_id, status, prazo } = req.body as UpdateTarefaInput;

    const [existente] = await sql`
        SELECT t.id, t.responsavel_id, p.liga_id FROM tarefas t
        JOIN milestones m ON m.id = t.milestone_id
        JOIN projetos p ON p.id = m.projeto_id
        WHERE t.id = ${tarefaId} LIMIT 1
      `;
    if (!existente) {
      res.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }

    // Membros só podem alterar status de tarefas atribuídas a eles
    if (user.role === "membro" || user.role === "estudante") {
      const [usuarioAtual] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
      if (!usuarioAtual || existente["responsavel_id"] !== usuarioAtual["id"]) {
        res
          .status(403)
          .json({ error: "Você só pode alterar status de tarefas atribuídas a você." });
        return;
      }
      if (Object.keys(req.body as object).some((k) => k !== "status")) {
        res.status(403).json({ error: "Membros só podem alterar o status da tarefa." });
        return;
      }
    } else if (user.role === "diretor") {
      if (!(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))) {
        res.status(403).json({ error: "Você só pode gerenciar tarefas da sua própria liga." });
        return;
      }
    } else if (user.role === "professor") {
      res.status(403).json({ error: "Professores não podem editar tarefas." });
      return;
    }

    const updates: Record<string, unknown> = { atualizado_em: new Date() };
    if (titulo !== undefined) updates["titulo"] = titulo;
    if (descricao !== undefined) updates["descricao"] = descricao;
    if (responsavel_id !== undefined) updates["responsavel_id"] = responsavel_id;
    if (status !== undefined) updates["status"] = status;
    if (prazo !== undefined) updates["prazo"] = prazo;

    const [tarefa] = await sql`
        UPDATE tarefas SET ${sql(updates)} WHERE id = ${tarefaId}
        RETURNING *,
          (SELECT nome FROM usuarios WHERE id = tarefas.responsavel_id) AS responsavel_nome
      `;
    res.json(tarefa);
  } catch (err) {
    next(err);
  }
});

// DELETE /milestones/:milestoneId/tarefas/:tarefaId
milestonesRouter.delete(
  "/:milestoneId/tarefas/:tarefaId",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const tarefaId = req.params["tarefaId"] as string;

      const [existente] = await sql`
        SELECT t.id, p.liga_id FROM tarefas t
        JOIN milestones m ON m.id = t.milestone_id
        JOIN projetos p ON p.id = m.projeto_id
        WHERE t.id = ${tarefaId} LIMIT 1
      `;
      if (!existente) {
        res.status(404).json({ error: "Tarefa não encontrada." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Você só pode gerenciar tarefas da sua própria liga." });
        return;
      }

      await sql`DELETE FROM tarefas WHERE id = ${tarefaId}`;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
