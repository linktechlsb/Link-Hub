import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";

export const tarefasRouter: IRouter = Router();

// GET /tarefas — lista tarefas da liga do usuário (ou todas para staff)
tarefasRouter.get("/", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const { projeto_id, status } = req.query as Record<string, string>;

    if (user.role === "staff") {
      const rows = await sql`
        SELECT
          t.id,
          t.titulo,
          t.descricao,
          t.status,
          t.responsavel_id,
          u_resp.nome AS responsavel_nome,
          t.prazo,
          t.criado_em,
          t.milestone_id,
          m.titulo AS milestone_titulo,
          p.id AS projeto_id,
          p.nome AS projeto_titulo,
          p.liga_id
        FROM tarefas t
        JOIN milestones m ON m.id = t.milestone_id
        JOIN projetos p ON p.id = m.projeto_id
        LEFT JOIN usuarios u_resp ON u_resp.id = t.responsavel_id
        WHERE 1=1
          ${projeto_id ? sql`AND p.id = ${projeto_id}` : sql``}
          ${status ? sql`AND t.status = ${status}` : sql``}
        ORDER BY t.criado_em DESC
      `;
      res.json(rows);
      return;
    }

    // Para diretor/membro/estudante: escopa por liga
    const [membroRow] = await sql`
      SELECT lm.liga_id
      FROM liga_membros lm
      JOIN usuarios u ON u.id = lm.usuario_id
      WHERE u.email = ${user.email}
      LIMIT 1
    `;

    if (!membroRow) {
      res.json([]);
      return;
    }

    const ligaId = membroRow["liga_id"] as string;

    const rows = await sql`
      SELECT
        t.id,
        t.titulo,
        t.descricao,
        t.status,
        t.responsavel_id,
        u_resp.nome AS responsavel_nome,
        t.prazo,
        t.criado_em,
        t.milestone_id,
        m.titulo AS milestone_titulo,
        p.id AS projeto_id,
        p.nome AS projeto_titulo,
        p.liga_id
      FROM tarefas t
      JOIN milestones m ON m.id = t.milestone_id
      JOIN projetos p ON p.id = m.projeto_id
      LEFT JOIN usuarios u_resp ON u_resp.id = t.responsavel_id
      WHERE p.liga_id = ${ligaId}
        ${projeto_id ? sql`AND p.id = ${projeto_id}` : sql``}
        ${status ? sql`AND t.status = ${status}` : sql``}
      ORDER BY t.criado_em DESC
    `;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /tarefas — cria tarefa (staff ou diretor da liga)
tarefasRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = req.user!;
      const { milestone_id, titulo, descricao, responsavel_id, prazo } = req.body as {
        milestone_id: string;
        titulo: string;
        descricao?: string;
        responsavel_id?: string;
        prazo?: string;
      };

      if (!milestone_id || !titulo) {
        res.status(400).json({ error: "milestone_id e titulo são obrigatórios." });
        return;
      }

      if (user.role === "diretor") {
        const [milestoneRow] = await sql`
          SELECT p.liga_id FROM milestones m JOIN projetos p ON p.id = m.projeto_id WHERE m.id = ${milestone_id} LIMIT 1
        `;
        if (!milestoneRow) {
          res.status(404).json({ error: "Milestone não encontrado." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, milestoneRow["liga_id"] as string))) {
          res.status(403).json({ error: "Acesso negado." });
          return;
        }
      }

      const [usuarioRow] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
      const criadorId = usuarioRow?.["id"] as string | undefined;

      const [nova] = await sql`
        INSERT INTO tarefas (milestone_id, titulo, descricao, responsavel_id, prazo, criado_por)
        VALUES (
          ${milestone_id},
          ${titulo},
          ${descricao ?? null},
          ${responsavel_id ?? null},
          ${prazo ?? null},
          ${criadorId ?? null}
        )
        RETURNING *
      `;
      res.status(201).json(nova);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /tarefas/:id — atualiza tarefa
tarefasRouter.patch("/:id", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, titulo, descricao, responsavel_id, prazo } = req.body as {
      status?: string;
      titulo?: string;
      descricao?: string;
      responsavel_id?: string;
      prazo?: string;
    };

    const [existente] = await sql`
      SELECT t.id, t.responsavel_id, p.liga_id, u_resp.id AS responsavel_usuario_id
      FROM tarefas t
      JOIN milestones m ON m.id = t.milestone_id
      JOIN projetos p ON p.id = m.projeto_id
      LEFT JOIN usuarios u_resp ON u_resp.id = t.responsavel_id
      WHERE t.id = ${id}
      LIMIT 1
    `;

    if (!existente) {
      res.status(404).json({ error: "Tarefa não encontrada." });
      return;
    }

    const ehDiretor =
      user.role === "staff" ||
      (user.role === "diretor" &&
        (await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string)));

    // Membros/estudantes só podem mudar status de tarefas atribuídas a si
    if (!ehDiretor) {
      const [usuarioRow] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
      const meuId = usuarioRow?.["id"] as string | undefined;

      if (existente["responsavel_id"] !== meuId) {
        res.status(403).json({ error: "Você só pode alterar tarefas atribuídas a você." });
        return;
      }

      if (!status) {
        res.status(400).json({ error: "Apenas status pode ser alterado por membros." });
        return;
      }

      const [atualizada] = await sql`
        UPDATE tarefas SET ${sql({ status, atualizado_em: new Date() })} WHERE id = ${id} RETURNING *
      `;
      res.json(atualizada);
      return;
    }

    const campos: Record<string, unknown> = { atualizado_em: new Date() };
    if (status !== undefined) campos["status"] = status;
    if (titulo !== undefined) campos["titulo"] = titulo;
    if (descricao !== undefined) campos["descricao"] = descricao;
    if (responsavel_id !== undefined) campos["responsavel_id"] = responsavel_id || null;
    if (prazo !== undefined) campos["prazo"] = prazo || null;

    const [atualizada] = await sql`
      UPDATE tarefas SET ${sql(campos)} WHERE id = ${id} RETURNING *
    `;
    res.json(atualizada);
  } catch (err) {
    next(err);
  }
});
