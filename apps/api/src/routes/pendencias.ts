import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";

import type { Pendencia } from "@link-leagues/types";

export const pendenciasRouter: IRouter = Router();

const LIMITE = 6;

// GET /pendencias — itens acionáveis do usuário, derivados conforme o papel.
pendenciasRouter.get("/", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const itens: Pendencia[] = [];

    if (user.role === "staff") {
      const [projetos, eventos] = await Promise.all([
        sql`
          SELECT p.id, p.nome AS titulo, l.nome AS contexto, p.prazo
          FROM projetos p
          LEFT JOIN ligas l ON l.id = p.liga_id
          WHERE p.status = 'em_aprovacao'
          ORDER BY p.criado_em ASC
          LIMIT ${LIMITE}
        `,
        sql`
          SELECT e.id, e.titulo, l.nome AS contexto, e.data AS prazo
          FROM eventos e
          LEFT JOIN ligas l ON l.id = e.liga_id
          WHERE e.requer_aprovacao = TRUE AND e.status_aprovacao = 'pendente'
          ORDER BY e.criado_em ASC
          LIMIT ${LIMITE}
        `,
      ]);
      for (const p of projetos) {
        itens.push({
          id: p["id"] as string,
          tipo: "projeto_aprovacao",
          titulo: p["titulo"] as string,
          contexto: (p["contexto"] as string | null) ?? undefined,
          prazo: (p["prazo"] as string | null) ?? null,
        });
      }
      for (const e of eventos) {
        itens.push({
          id: e["id"] as string,
          tipo: "evento_aprovacao",
          titulo: e["titulo"] as string,
          contexto: (e["contexto"] as string | null) ?? undefined,
          prazo: (e["prazo"] as string | null) ?? null,
        });
      }
    } else if (user.role === "professor") {
      const projetos = await sql`
        SELECT p.id, p.nome AS titulo, l.nome AS contexto, p.prazo
        FROM projetos p
        JOIN ligas l ON l.id = p.liga_id
        WHERE p.aprovacao_professor = 'pendente'
          AND l.professor_id = ${user.id}
          AND p.status <> 'rascunho'
        ORDER BY p.criado_em ASC
        LIMIT ${LIMITE}
      `;
      for (const p of projetos) {
        itens.push({
          id: p["id"] as string,
          tipo: "projeto_aprovacao",
          titulo: p["titulo"] as string,
          contexto: (p["contexto"] as string | null) ?? undefined,
          prazo: (p["prazo"] as string | null) ?? null,
        });
      }
    } else if (user.role === "diretor") {
      const projetos = await sql`
        SELECT p.id, p.nome AS titulo, l.nome AS contexto, p.prazo, p.status
        FROM projetos p
        JOIN ligas l ON l.id = p.liga_id
        WHERE (
          l.lider_id = ${user.id}
          OR EXISTS (
            SELECT 1 FROM liga_membros lm
            WHERE lm.liga_id = l.id AND lm.usuario_id = ${user.id} AND lm.cargo = 'Diretor'
          )
        )
        AND (
          p.status = 'em_aprovacao'
          OR (
            p.prazo IS NOT NULL
            AND p.prazo < CURRENT_DATE
            AND p.status IN ('aprovado', 'em_andamento')
          )
        )
        ORDER BY p.prazo ASC NULLS LAST
        LIMIT ${LIMITE}
      `;
      for (const p of projetos) {
        itens.push({
          id: p["id"] as string,
          tipo: p["status"] === "em_aprovacao" ? "projeto_aprovacao" : "projeto_atrasado",
          titulo: p["titulo"] as string,
          contexto: (p["contexto"] as string | null) ?? undefined,
          prazo: (p["prazo"] as string | null) ?? null,
        });
      }
    } else {
      // membro / estudante — minhas tarefas em aberto
      const tarefas = await sql`
        SELECT t.id, t.titulo, t.prazo
        FROM tarefas t
        WHERE t.responsavel_id = ${user.id}
          AND t.status <> 'concluida'
        ORDER BY t.prazo ASC NULLS LAST
        LIMIT ${LIMITE}
      `;
      for (const t of tarefas) {
        itens.push({
          id: t["id"] as string,
          tipo: "tarefa",
          titulo: t["titulo"] as string,
          prazo: (t["prazo"] as string | null) ?? null,
        });
      }
    }

    res.json(itens);
  } catch (err) {
    next(err);
  }
});
