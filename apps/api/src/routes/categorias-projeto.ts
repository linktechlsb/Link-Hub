import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";

export const categoriasProjetoRouter: IRouter = Router();

// GET /categorias-projeto — categorias base + da liga do usuário logado
categoriasProjetoRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const ligaId = req.query["liga_id"] as string | undefined;

    if (ligaId) {
      // Categorias base + categorias da liga específica
      const categorias = await sql`
        SELECT * FROM categorias_projeto
        WHERE ativo = true
          AND (liga_id IS NULL OR liga_id = ${ligaId})
        ORDER BY liga_id NULLS FIRST, nome ASC
      `;
      res.json(categorias);
      return;
    }

    if (user.role === "staff") {
      // Staff vê todas as categorias ativas
      const categorias = await sql`
        SELECT cp.*, l.nome AS liga_nome
        FROM categorias_projeto cp
        LEFT JOIN ligas l ON l.id = cp.liga_id
        WHERE cp.ativo = true
        ORDER BY cp.liga_id NULLS FIRST, cp.nome ASC
      `;
      res.json(categorias);
      return;
    }

    // Diretor/lider/membro: busca a liga do usuário e retorna base + da liga
    const [usuarioAtual] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
    if (!usuarioAtual) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const [ligaDoUsuario] = await sql`
      SELECT l.id FROM ligas l
      LEFT JOIN liga_membros lm ON lm.liga_id = l.id
      WHERE lm.usuario_id = ${usuarioAtual["id"] as string}
         OR l.lider_id = ${usuarioAtual["id"] as string}
      LIMIT 1
    `;

    const ligaIdDoUsuario = (ligaDoUsuario?.["id"] as string | undefined) ?? null;

    const categorias = ligaIdDoUsuario
      ? await sql`
          SELECT * FROM categorias_projeto
          WHERE ativo = true
            AND (liga_id IS NULL OR liga_id = ${ligaIdDoUsuario})
          ORDER BY liga_id NULLS FIRST, nome ASC
        `
      : await sql`
          SELECT * FROM categorias_projeto
          WHERE ativo = true AND liga_id IS NULL
          ORDER BY nome ASC
        `;

    res.json(categorias);
  } catch (err) {
    next(err);
  }
});

// POST /categorias-projeto — cria categoria customizada (lider/diretor = da sua liga, staff = base)
categoriasProjetoRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { nome, descricao, liga_id } = req.body as {
        nome: string;
        descricao?: string;
        liga_id?: string;
      };

      if (!nome?.trim()) {
        res.status(400).json({ error: "Nome é obrigatório." });
        return;
      }

      if (user.role === "staff") {
        // Staff pode criar base (sem liga_id) ou para uma liga específica
        const [categoria] = await sql`
          INSERT INTO categorias_projeto ${sql({ nome: nome.trim(), descricao: descricao ?? null, liga_id: liga_id ?? null })}
          RETURNING *
        `;
        res.status(201).json(categoria);
        return;
      }

      // Diretor/lider: categoria da própria liga
      if (!liga_id) {
        res.status(400).json({ error: "liga_id é obrigatório para criar categoria de liga." });
        return;
      }
      if (!(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode criar categorias da sua própria liga." });
        return;
      }

      const [categoria] = await sql`
        INSERT INTO categorias_projeto ${sql({ nome: nome.trim(), descricao: descricao ?? null, liga_id })}
        RETURNING *
      `;
      res.status(201).json(categoria);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /categorias-projeto/:id — editar categoria
categoriasProjetoRouter.patch(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const id = req.params["id"] as string;
      const { nome, descricao } = req.body as { nome?: string; descricao?: string };

      const [existente] = await sql`SELECT * FROM categorias_projeto WHERE id = ${id} LIMIT 1`;
      if (!existente) {
        res.status(404).json({ error: "Categoria não encontrada." });
        return;
      }

      if (user.role === "diretor") {
        if (!existente["liga_id"]) {
          res.status(403).json({ error: "Categorias base só podem ser editadas pelo staff." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))) {
          res.status(403).json({ error: "Você só pode editar categorias da sua própria liga." });
          return;
        }
      }

      const updates: Record<string, unknown> = {};
      if (nome !== undefined) updates["nome"] = nome.trim();
      if (descricao !== undefined) updates["descricao"] = descricao;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "Nenhum campo para atualizar." });
        return;
      }

      const [categoria] = await sql`
        UPDATE categorias_projeto SET ${sql(updates)} WHERE id = ${id} RETURNING *
      `;
      res.json(categoria);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /categorias-projeto/:id — soft delete (ativo = false), apenas categorias de liga
categoriasProjetoRouter.delete(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const id = req.params["id"] as string;

      const [existente] = await sql`SELECT * FROM categorias_projeto WHERE id = ${id} LIMIT 1`;
      if (!existente) {
        res.status(404).json({ error: "Categoria não encontrada." });
        return;
      }

      if (user.role === "diretor") {
        if (!existente["liga_id"]) {
          res.status(403).json({ error: "Categorias base não podem ser removidas." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))) {
          res.status(403).json({ error: "Você só pode remover categorias da sua própria liga." });
          return;
        }
      }

      if (!existente["liga_id"] && user.role !== "staff") {
        res.status(403).json({ error: "Categorias base não podem ser removidas." });
        return;
      }

      await sql`UPDATE categorias_projeto SET ativo = false WHERE id = ${id}`;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
