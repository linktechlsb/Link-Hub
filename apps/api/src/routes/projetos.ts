import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga, usuarioEhProfessorDaLiga } from "../middleware/authorization.js";

import type { StatusProjeto } from "@link-leagues/types";

export const projetosRouter: IRouter = Router();

// GET /projetos
projetosRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const ligaId = req.query["liga_id"] as string | undefined;

    const [usuarioAtual] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
    const usuarioId = (usuarioAtual?.["id"] as string | undefined) ?? null;

    // Rascunhos só aparecem para o criador
    const projetos = ligaId
      ? await sql`
          SELECT p.*, p.nome AS titulo,
            json_build_object('id', l.id, 'nome', l.nome) AS liga,
            u.nome AS responsavel_nome
          FROM projetos p
          LEFT JOIN ligas l ON l.id = p.liga_id
          LEFT JOIN usuarios u ON u.id = p.responsavel_id
          WHERE p.liga_id = ${ligaId}
            AND (p.status <> 'rascunho' OR p.criado_por = ${usuarioId})
          ORDER BY p.criado_em DESC
        `
      : await sql`
          SELECT p.*, p.nome AS titulo,
            json_build_object('id', l.id, 'nome', l.nome) AS liga,
            u.nome AS responsavel_nome
          FROM projetos p
          LEFT JOIN ligas l ON l.id = p.liga_id
          LEFT JOIN usuarios u ON u.id = p.responsavel_id
          WHERE p.status <> 'rascunho' OR p.criado_por = ${usuarioId}
          ORDER BY p.criado_em DESC
        `;

    res.json(projetos);
  } catch (err) {
    next(err);
  }
});

// POST /projetos
projetosRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor", "professor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const {
        liga_id,
        titulo,
        descricao,
        responsavel_id,
        prazo,
        impacto,
        professor_id,
        empresa_parceira,
        tipo_projeto,
      } = req.body as {
        liga_id: string;
        titulo: string;
        descricao?: string;
        responsavel_id: string;
        prazo?: string;
        impacto?: string;
        professor_id?: string;
        empresa_parceira?: string;
        tipo_projeto?: string;
      };

      if (!liga_id || !titulo || !responsavel_id) {
        res.status(400).json({ error: "liga_id, titulo e responsavel_id são obrigatórios." });
        return;
      }

      if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode criar projetos da sua própria liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
      if (!criador) {
        res.status(404).json({ error: "Usuário não encontrado." });
        return;
      }

      const aprovaAutomaticamente = user.role === "staff" || user.role === "professor";
      const body: Record<string, unknown> = {
        liga_id,
        nome: titulo,
        status: (aprovaAutomaticamente ? "aprovado" : "rascunho") as StatusProjeto,
        responsavel_id,
        criado_por: criador["id"] as string,
        ...(aprovaAutomaticamente && {
          aprovacao_staff: "aprovado",
          aprovacao_professor: "aprovado",
        }),
      };
      if (descricao !== undefined) body["descricao"] = descricao;
      if (prazo !== undefined) body["prazo"] = prazo;
      if (impacto !== undefined) body["impacto"] = impacto;
      if (professor_id !== undefined) body["professor_id"] = professor_id;
      if (empresa_parceira !== undefined) body["empresa_parceira"] = empresa_parceira;
      if (tipo_projeto !== undefined) body["tipo_projeto"] = tipo_projeto;

      const [projeto] = await sql`
      INSERT INTO projetos ${sql(body)} RETURNING *, nome AS titulo
    `;

      res.status(201).json(projeto);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /projetos/:id/status — fluxo de aprovação
projetosRouter.patch(
  "/:id/status",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { status } = req.body as { status: StatusProjeto };
      const statusValidos: StatusProjeto[] = [
        "rascunho",
        "em_aprovacao",
        "aprovado",
        "rejeitado",
        "em_andamento",
        "concluido",
      ];

      if (!statusValidos.includes(status)) {
        res.status(400).json({ error: "Status inválido." });
        return;
      }

      const id = req.params["id"] as string;

      const [alvo] = await sql`
        SELECT liga_id, status, criado_por FROM projetos WHERE id = ${id} LIMIT 1
      `;
      if (!alvo) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }

      if (user.role === "diretor") {
        if (!(await usuarioEhDiretorDaLiga(user.email, alvo.liga_id as string))) {
          res.status(403).json({ error: "Você só pode alterar projetos da sua própria liga." });
          return;
        }
      }

      if (status === "concluido") {
        const statusAtual = alvo["status"] as StatusProjeto;
        if (statusAtual !== "aprovado" && statusAtual !== "em_andamento") {
          res.status(400).json({
            error: "Só é possível concluir projetos aprovados ou em andamento.",
          });
          return;
        }
      }

      // Envio para aprovação (rascunho → em_aprovacao) só pelo criador
      const enviandoParaAprovacao = alvo.status === "rascunho" && status === "em_aprovacao";
      if (enviandoParaAprovacao) {
        const [usuarioAtual] =
          await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
        if (!usuarioAtual || alvo.criado_por !== usuarioAtual["id"]) {
          res
            .status(403)
            .json({ error: "Apenas o criador do rascunho pode enviá-lo para aprovação." });
          return;
        }
      }

      // Se o staff enviar seu próprio rascunho, já marca a aprovação dele
      const autoAprovarStaff = enviandoParaAprovacao && user.role === "staff";

      const [projeto] = autoAprovarStaff
        ? await sql`
            UPDATE projetos
            SET status = ${status}, aprovacao_staff = 'aprovado'
            WHERE id = ${id}
            RETURNING *, nome AS titulo
          `
        : await sql`
            UPDATE projetos SET status = ${status}
            WHERE id = ${id}
            RETURNING *, nome AS titulo
          `;

      res.json(projeto);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /projetos/:id/aprovacao — professor ou staff registra sua decisão
projetosRouter.patch(
  "/:id/aprovacao",
  authenticate,
  requireRole("professor", "staff"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { papel, decisao } = req.body as {
        papel: "professor" | "staff";
        decisao: "aprovado" | "rejeitado";
      };

      if (!["professor", "staff"].includes(papel)) {
        res.status(400).json({ error: "Papel inválido. Use 'professor' ou 'staff'." });
        return;
      }
      if (user.role !== papel) {
        res.status(403).json({ error: "Você só pode registrar aprovações no seu próprio papel." });
        return;
      }
      if (!["aprovado", "rejeitado"].includes(decisao)) {
        res.status(400).json({ error: "Decisão inválida. Use 'aprovado' ou 'rejeitado'." });
        return;
      }

      const id = req.params["id"] as string;

      if (papel === "professor") {
        const [alvo] = await sql`SELECT liga_id FROM projetos WHERE id = ${id} LIMIT 1`;
        if (!alvo) {
          res.status(404).json({ error: "Projeto não encontrado." });
          return;
        }
        if (!(await usuarioEhProfessorDaLiga(user.id, alvo.liga_id as string))) {
          res.status(403).json({
            error: "Você só pode aprovar projetos de ligas em que é o professor responsável.",
          });
          return;
        }
      }

      const resultado = await sql.begin(async (tx) => {
        const t = tx as unknown as typeof sql;
        const atualizadoRows =
          papel === "professor"
            ? await t`UPDATE projetos SET aprovacao_professor = ${decisao} WHERE id = ${id} AND status = 'em_aprovacao' RETURNING *, nome AS titulo`
            : await t`UPDATE projetos SET aprovacao_staff = ${decisao} WHERE id = ${id} AND status = 'em_aprovacao' RETURNING *, nome AS titulo`;

        const atualizado = atualizadoRows[0];
        if (!atualizado) return null;

        if (
          atualizado["aprovacao_professor"] === "aprovado" &&
          atualizado["aprovacao_staff"] === "aprovado"
        ) {
          const rows =
            await t`UPDATE projetos SET status = 'aprovado' WHERE id = ${id} RETURNING *, nome AS titulo`;
          return rows[0];
        }
        if (
          atualizado["aprovacao_professor"] === "rejeitado" ||
          atualizado["aprovacao_staff"] === "rejeitado"
        ) {
          const rows =
            await t`UPDATE projetos SET status = 'rejeitado' WHERE id = ${id} RETURNING *, nome AS titulo`;
          return rows[0];
        }
        return atualizado;
      });

      if (!resultado) {
        res.status(404).json({ error: "Projeto não encontrado ou não está em aprovação." });
        return;
      }

      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /projetos/:id — atualizar dados do projeto
projetosRouter.patch(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const id = req.params["id"] as string;
      const {
        titulo,
        descricao,
        responsavel_id,
        prazo,
        status,
        impacto,
        professor_id,
        empresa_parceira,
        tipo_projeto,
      } = req.body as {
        titulo?: string;
        descricao?: string;
        responsavel_id?: string;
        prazo?: string;
        status?: StatusProjeto;
        impacto?: string;
        professor_id?: string;
        empresa_parceira?: string;
        tipo_projeto?: string;
      };

      const [existente] =
        await sql`SELECT liga_id, criado_por FROM projetos WHERE id = ${id} LIMIT 1`;
      if (!existente) {
        res.status(404).json({ error: "Projeto não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, existente["liga_id"] as string))
      ) {
        res.status(403).json({ error: "Você só pode editar projetos da sua própria liga." });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (titulo !== undefined) updates["nome"] = titulo;
      if (descricao !== undefined) updates["descricao"] = descricao;
      if (responsavel_id !== undefined) updates["responsavel_id"] = responsavel_id;
      if (prazo !== undefined) updates["prazo"] = prazo;
      if (status !== undefined) updates["status"] = status;
      if (impacto !== undefined) updates["impacto"] = impacto;
      if (professor_id !== undefined) updates["professor_id"] = professor_id;
      if (empresa_parceira !== undefined) updates["empresa_parceira"] = empresa_parceira;
      if (tipo_projeto !== undefined) updates["tipo_projeto"] = tipo_projeto;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "Nenhum campo para atualizar." });
        return;
      }

      const [projeto] = await sql`
      UPDATE projetos SET ${sql(updates)} WHERE id = ${id} RETURNING *, nome AS titulo
    `;

      res.json(projeto);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /projetos/:id
projetosRouter.delete("/:id", authenticate, requireRole("staff"), async (req, res, next) => {
  try {
    const id = req.params["id"] as string;
    await sql`DELETE FROM projetos WHERE id = ${id}`;
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
