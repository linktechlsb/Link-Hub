import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga, usuarioPertenceALiga } from "../middleware/authorization.js";

import type { CreateCrmContatoInput, UpdateCrmContatoInput } from "@link-leagues/types";

export const crmRouter: IRouter = Router();

// GET /crm?liga_id= — lista contatos de uma liga (somente membros, staff ou professor)
crmRouter.get("/", authenticate, async (req, res, next) => {
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

    const contatos = await sql`
      SELECT id, liga_id, nome, emprego, empresa, telefone, email, linkedin, criado_por, criado_em
      FROM crm_contatos
      WHERE liga_id = ${liga_id}
      ORDER BY nome ASC
    `;

    res.json(contatos);
  } catch (err) {
    next(err);
  }
});

// POST /crm — cria um contato (diretor da liga, staff ou lider)
crmRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor", "lider"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { liga_id, nome, emprego, empresa, telefone, email, linkedin } =
        req.body as CreateCrmContatoInput;

      if (!liga_id || !nome) {
        res.status(400).json({ error: "liga_id e nome são obrigatórios." });
        return;
      }

      if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode criar contatos da sua própria liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      const [contato] = await sql`
      INSERT INTO crm_contatos (liga_id, nome, emprego, empresa, telefone, email, linkedin, criado_por)
      VALUES (
        ${liga_id},
        ${nome},
        ${emprego ?? null},
        ${empresa ?? null},
        ${telefone ?? null},
        ${email ?? null},
        ${linkedin ?? null},
        ${criador?.id ?? null}
      )
      RETURNING id, liga_id, nome, emprego, empresa, telefone, email, linkedin, criado_por, criado_em
    `;

      res.status(201).json(contato);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /crm/:id — atualiza um contato (diretor da liga, staff ou lider)
crmRouter.patch(
  "/:id",
  authenticate,
  requireRole("staff", "diretor", "lider"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;
      const { nome, emprego, empresa, telefone, email, linkedin } =
        req.body as UpdateCrmContatoInput;

      if (user.role === "diretor") {
        const [alvo] = await sql`SELECT liga_id FROM crm_contatos WHERE id = ${id} LIMIT 1`;
        if (!alvo) {
          res.status(404).json({ error: "Contato não encontrado." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, alvo.liga_id as string))) {
          res.status(403).json({ error: "Você só pode editar contatos da sua própria liga." });
          return;
        }
      }

      const [contato] = await sql`
        UPDATE crm_contatos
        SET
          nome     = COALESCE(${nome ?? null},     nome),
          emprego  = COALESCE(${emprego ?? null},  emprego),
          empresa  = COALESCE(${empresa ?? null},  empresa),
          telefone = COALESCE(${telefone ?? null}, telefone),
          email    = COALESCE(${email ?? null},    email),
          linkedin = COALESCE(${linkedin ?? null}, linkedin)
        WHERE id = ${id}
        RETURNING id, liga_id, nome, emprego, empresa, telefone, email, linkedin, criado_por, criado_em
      `;

      if (!contato) {
        res.status(404).json({ error: "Contato não encontrado." });
        return;
      }

      res.json(contato);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /crm/:id — remove um contato (diretor da liga, staff ou lider)
crmRouter.delete(
  "/:id",
  authenticate,
  requireRole("staff", "diretor", "lider"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      if (user.role === "diretor") {
        const [alvo] = await sql`SELECT liga_id FROM crm_contatos WHERE id = ${id} LIMIT 1`;
        if (!alvo) {
          res.status(404).json({ error: "Contato não encontrado." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, alvo.liga_id as string))) {
          res.status(403).json({
            error: "Você só pode remover contatos da sua própria liga.",
          });
          return;
        }
      }

      await sql`DELETE FROM crm_contatos WHERE id = ${id}`;

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
