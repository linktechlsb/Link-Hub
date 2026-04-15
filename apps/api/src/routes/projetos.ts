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
projetosRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const body = { ...req.body, status: "rascunho" as StatusProjeto };

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
