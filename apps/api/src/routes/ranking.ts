import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export const rankingRouter: IRouter = Router();

// GET /ranking — ordenado por pontuação
rankingRouter.get("/", authenticate, async (_req, res, next) => {
  try {
    const rows = await sql`
      SELECT
        liga_id,
        nome,
        imagem_url,
        projetos_concluidos,
        projetos_em_andamento,
        presencas,
        receita_total,
        posts,
        pontuacao,
        ROW_NUMBER() OVER (ORDER BY pontuacao DESC, nome ASC)::int AS posicao
      FROM v_ranking_ligas
      ORDER BY pontuacao DESC, nome ASC
    `;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /ranking/configuracoes — pesos atuais (staff)
rankingRouter.get("/configuracoes", authenticate, requireRole("staff"), async (_req, res, next) => {
  try {
    const configs = await sql`
      SELECT chave, valor, descricao, atualizado_em
      FROM configuracoes_pontuacao
      ORDER BY chave
    `;
    res.json(configs);
  } catch (err) {
    next(err);
  }
});

// PATCH /ranking/configuracoes/:chave — ajuste de peso (staff)
rankingRouter.patch(
  "/configuracoes/:chave",
  authenticate,
  requireRole("staff"),
  async (req, res, next) => {
    try {
      const chave = req.params["chave"] as string;
      const { valor } = req.body as { valor?: number };

      if (valor === undefined || isNaN(Number(valor))) {
        res.status(400).json({ error: "valor numérico é obrigatório." });
        return;
      }

      const [config] = await sql`
        UPDATE configuracoes_pontuacao
        SET valor = ${valor}, atualizado_em = NOW()
        WHERE chave = ${chave}
        RETURNING chave, valor, descricao, atualizado_em
      `;
      if (!config) {
        res.status(404).json({ error: "Configuração não encontrada." });
        return;
      }
      res.json(config);
    } catch (err) {
      next(err);
    }
  },
);
