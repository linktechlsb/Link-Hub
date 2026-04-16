import { Router, type Router as IRouter } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sql } from "../config/db.js";
import type { StatusProjeto } from "@link-leagues/types";

export const projetosRouter: IRouter = Router();

// GET /projetos
projetosRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const ligaId = req.query["liga_id"] as string | undefined;

    const projetos = ligaId
      ? await sql`
          SELECT p.*, json_build_object('id', l.id, 'nome', l.nome) AS liga
          FROM projetos p
          LEFT JOIN ligas l ON l.id = p.liga_id
          WHERE p.liga_id = ${ligaId}
          ORDER BY p.criado_em DESC
        `
      : await sql`
          SELECT p.*, json_build_object('id', l.id, 'nome', l.nome) AS liga
          FROM projetos p
          LEFT JOIN ligas l ON l.id = p.liga_id
          ORDER BY p.criado_em DESC
        `;

    res.json(projetos);
  } catch (err) {
    next(err);
  }
});

// POST /projetos
projetosRouter.post("/", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const { liga_id, titulo, descricao, responsavel_id, prazo } = req.body as {
      liga_id: string;
      titulo: string;
      descricao?: string;
      responsavel_id: string;
      prazo?: string;
    };
    const body: Record<string, unknown> = { liga_id, titulo, status: "rascunho" as StatusProjeto, responsavel_id };
    if (descricao !== undefined) body["descricao"] = descricao;
    if (prazo !== undefined) body["prazo"] = prazo;

    const [projeto] = await sql`
      INSERT INTO projetos ${sql(body)} RETURNING *
    `;

    res.status(201).json(projeto);
  } catch (err) {
    next(err);
  }
});

// PATCH /projetos/:id/status — fluxo de aprovação
projetosRouter.patch("/:id/status", authenticate, requireRole("staff", "diretor"), async (req, res, next) => {
  try {
    const { status } = req.body as { status: StatusProjeto };
    const statusValidos: StatusProjeto[] = ["rascunho", "em_aprovacao", "aprovado", "rejeitado"];

    if (!statusValidos.includes(status)) {
      res.status(400).json({ error: "Status inválido." });
      return;
    }

    const id = req.params["id"] as string;
    const [projeto] = await sql`
      UPDATE projetos SET status = ${status} WHERE id = ${id} RETURNING *
    `;

    if (!projeto) { res.status(404).json({ error: "Projeto não encontrado." }); return; }
    res.json(projeto);
  } catch (err) {
    next(err);
  }
});

// PATCH /projetos/:id/aprovacao — professor ou staff registra sua decisão
projetosRouter.patch("/:id/aprovacao", authenticate, requireRole("professor", "staff", "diretor"), async (req, res, next) => {
  try {
    const { papel, decisao } = req.body as {
      papel: "professor" | "staff";
      decisao: "aprovado" | "rejeitado";
    };

    if (!["professor", "staff"].includes(papel)) {
      res.status(400).json({ error: "Papel inválido. Use 'professor' ou 'staff'." });
      return;
    }
    if (!["aprovado", "rejeitado"].includes(decisao)) {
      res.status(400).json({ error: "Decisão inválida. Use 'aprovado' ou 'rejeitado'." });
      return;
    }

    const id = req.params["id"] as string;

    const resultado = await sql.begin(async (tx) => {
      const t = tx as unknown as typeof sql;
      const atualizadoRows = papel === "professor"
        ? await t`UPDATE projetos SET aprovacao_professor = ${decisao} WHERE id = ${id} AND status = 'em_aprovacao' RETURNING *`
        : await t`UPDATE projetos SET aprovacao_staff = ${decisao} WHERE id = ${id} AND status = 'em_aprovacao' RETURNING *`;

      const atualizado = atualizadoRows[0];
      if (!atualizado) return null;

      if (atualizado["aprovacao_professor"] === "aprovado" && atualizado["aprovacao_staff"] === "aprovado") {
        const rows = await t`UPDATE projetos SET status = 'aprovado' WHERE id = ${id} RETURNING *`;
        return rows[0];
      }
      if (atualizado["aprovacao_professor"] === "rejeitado" || atualizado["aprovacao_staff"] === "rejeitado") {
        const rows = await t`UPDATE projetos SET status = 'rejeitado' WHERE id = ${id} RETURNING *`;
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
});

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
