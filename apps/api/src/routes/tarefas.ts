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
          t.icone,
          u_resp.nome AS responsavel_nome,
          u_resp.avatar_url AS responsavel_avatar,
          u_resp.role AS responsavel_role,
          COALESCE((SELECT json_agg(json_build_object('id', u.id, 'nome', u.nome, 'avatar', u.avatar_url)) FROM tarefa_responsaveis tr JOIN usuarios u ON u.id = tr.usuario_id WHERE tr.tarefa_id = t.id), '[]'::json) AS responsaveis,
          t.prazo,
          t.criado_em,
          t.milestone_id,
          m.titulo AS milestone_titulo,
          p.id AS projeto_id,
          p.nome AS projeto_titulo,
          p.liga_id
        FROM tarefas t
        JOIN projetos p ON p.id = t.projeto_id
        LEFT JOIN milestones m ON m.id = t.milestone_id
        LEFT JOIN usuarios u_resp ON u_resp.id = t.responsavel_id
        WHERE 1=1
          ${projeto_id ? sql`AND p.id = ${projeto_id}` : sql``}
          ${status ? sql`AND t.status = ${status}` : sql``}
        ORDER BY t.criado_em DESC
      `;
      res.json(rows);
      return;
    }

    // Professor: tarefas das ligas que ele acompanha (ligas.professor_id)
    if (user.role === "professor") {
      const rows = await sql`
        SELECT
          t.id,
          t.titulo,
          t.descricao,
          t.status,
          t.responsavel_id,
          t.icone,
          u_resp.nome AS responsavel_nome,
          u_resp.avatar_url AS responsavel_avatar,
          u_resp.role AS responsavel_role,
          COALESCE((SELECT json_agg(json_build_object('id', u.id, 'nome', u.nome, 'avatar', u.avatar_url)) FROM tarefa_responsaveis tr JOIN usuarios u ON u.id = tr.usuario_id WHERE tr.tarefa_id = t.id), '[]'::json) AS responsaveis,
          t.prazo,
          t.criado_em,
          t.milestone_id,
          m.titulo AS milestone_titulo,
          p.id AS projeto_id,
          p.nome AS projeto_titulo,
          p.liga_id
        FROM tarefas t
        JOIN projetos p ON p.id = t.projeto_id
        LEFT JOIN milestones m ON m.id = t.milestone_id
        JOIN ligas l ON l.id = p.liga_id
        LEFT JOIN usuarios u_resp ON u_resp.id = t.responsavel_id
        WHERE l.professor_id = (SELECT id FROM usuarios WHERE email = ${user.email})
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
        t.icone,
        u_resp.nome AS responsavel_nome,
        u_resp.avatar_url AS responsavel_avatar,
        u_resp.role AS responsavel_role,
        COALESCE((SELECT json_agg(json_build_object('id', u.id, 'nome', u.nome, 'avatar', u.avatar_url)) FROM tarefa_responsaveis tr JOIN usuarios u ON u.id = tr.usuario_id WHERE tr.tarefa_id = t.id), '[]'::json) AS responsaveis,
        t.prazo,
        t.criado_em,
        t.milestone_id,
        m.titulo AS milestone_titulo,
        p.id AS projeto_id,
        p.nome AS projeto_titulo,
        p.liga_id
      FROM tarefas t
      JOIN projetos p ON p.id = t.projeto_id
      LEFT JOIN milestones m ON m.id = t.milestone_id
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
      const {
        milestone_id,
        projeto_id,
        titulo,
        descricao,
        responsavel_id,
        responsaveis,
        prazo,
        icone,
      } = req.body as {
        milestone_id?: string;
        projeto_id?: string;
        titulo: string;
        descricao?: string;
        responsavel_id?: string;
        responsaveis?: string[];
        prazo?: string;
        icone?: string;
      };

      // Lista efetiva de responsáveis (suporta o campo legado responsavel_id)
      const listaResponsaveis = Array.isArray(responsaveis)
        ? responsaveis.filter(Boolean)
        : responsavel_id
          ? [responsavel_id]
          : [];
      const responsavelPrincipal = listaResponsaveis[0] ?? null;

      // O projeto é o vínculo obrigatório; a milestone é opcional. Quando só a
      // milestone é informada (ex.: criação dentro de um milestone), deriva o projeto dela.
      let projetoIdFinal = projeto_id;
      if (!projetoIdFinal && milestone_id) {
        const [mRow] =
          await sql`SELECT projeto_id FROM milestones WHERE id = ${milestone_id} LIMIT 1`;
        projetoIdFinal = mRow?.["projeto_id"] as string | undefined;
      }

      if (!projetoIdFinal || !titulo) {
        res.status(400).json({ error: "projeto e titulo são obrigatórios." });
        return;
      }

      const [projRow] =
        await sql`SELECT liga_id FROM projetos WHERE id = ${projetoIdFinal} LIMIT 1`;
      if (!projRow) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }
      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, projRow["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Acesso negado." });
        return;
      }

      const [usuarioRow] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
      const criadorId = usuarioRow?.["id"] as string | undefined;

      const [nova] = await sql`
        INSERT INTO tarefas (milestone_id, projeto_id, titulo, descricao, responsavel_id, prazo, icone, criado_por)
        VALUES (
          ${milestone_id ?? null},
          ${projetoIdFinal},
          ${titulo},
          ${descricao ?? null},
          ${responsavelPrincipal},
          ${prazo ?? null},
          ${icone ?? null},
          ${criadorId ?? null}
        )
        RETURNING *
      `;

      if (listaResponsaveis.length > 0) {
        const tarefaId = nova!["id"] as string;
        await sql`
          INSERT INTO tarefa_responsaveis ${sql(
            listaResponsaveis.map((usuarioId) => ({ tarefa_id: tarefaId, usuario_id: usuarioId })),
          )}
          ON CONFLICT DO NOTHING
        `;
      }

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
    const {
      status,
      titulo,
      descricao,
      responsavel_id,
      responsaveis,
      prazo,
      icone,
      milestone_id,
      projeto_id,
    } = req.body as {
      status?: string;
      titulo?: string;
      descricao?: string;
      responsavel_id?: string;
      responsaveis?: string[];
      prazo?: string;
      icone?: string;
      milestone_id?: string | null;
      projeto_id?: string;
    };

    const [existente] = await sql`
      SELECT t.id, t.responsavel_id, p.liga_id, u_resp.id AS responsavel_usuario_id
      FROM tarefas t
      JOIN projetos p ON p.id = t.projeto_id
      LEFT JOIN milestones m ON m.id = t.milestone_id
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

      const [souResponsavel] = await sql`
        SELECT 1 FROM tarefa_responsaveis WHERE tarefa_id = ${id} AND usuario_id = ${meuId ?? null} LIMIT 1
      `;

      if (existente["responsavel_id"] !== meuId && !souResponsavel) {
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

    // Lista efetiva de responsáveis (suporta o campo legado responsavel_id)
    const listaResponsaveis = Array.isArray(responsaveis)
      ? responsaveis.filter(Boolean)
      : undefined;

    const campos: Record<string, unknown> = { atualizado_em: new Date() };
    if (status !== undefined) campos["status"] = status;
    if (titulo !== undefined) campos["titulo"] = titulo;
    if (descricao !== undefined) campos["descricao"] = descricao;
    if (prazo !== undefined) campos["prazo"] = prazo || null;
    if (icone !== undefined) campos["icone"] = icone || null;
    if (milestone_id !== undefined) campos["milestone_id"] = milestone_id || null;
    if (projeto_id !== undefined && projeto_id) campos["projeto_id"] = projeto_id;
    // responsavel_id (legado) acompanha o primeiro da lista quando ela é enviada
    if (listaResponsaveis !== undefined) campos["responsavel_id"] = listaResponsaveis[0] ?? null;
    else if (responsavel_id !== undefined) campos["responsavel_id"] = responsavel_id || null;

    const [atualizada] = await sql`
      UPDATE tarefas SET ${sql(campos)} WHERE id = ${id} RETURNING *
    `;

    // Substitui a lista de responsáveis quando enviada
    if (listaResponsaveis !== undefined) {
      await sql`DELETE FROM tarefa_responsaveis WHERE tarefa_id = ${id}`;
      if (listaResponsaveis.length > 0) {
        await sql`
          INSERT INTO tarefa_responsaveis ${sql(
            listaResponsaveis.map((usuarioId) => ({ tarefa_id: id, usuario_id: usuarioId })),
          )}
          ON CONFLICT DO NOTHING
        `;
      }
    }
    res.json(atualizada);
  } catch (err) {
    next(err);
  }
});

// DELETE /tarefas/:id — exclui tarefa (staff ou diretor da liga)
tarefasRouter.delete(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const [existente] = await sql`
        SELECT t.id, p.liga_id
        FROM tarefas t
        JOIN projetos p ON p.id = t.projeto_id
        LEFT JOIN milestones m ON m.id = t.milestone_id
        WHERE t.id = ${id}
        LIMIT 1
      `;

      if (!existente) {
        res.status(404).json({ error: "Tarefa não encontrada." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Acesso negado." });
        return;
      }

      await sql`DELETE FROM tarefas WHERE id = ${id}`;
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
