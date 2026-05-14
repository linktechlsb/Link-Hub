import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";

export const solicitacoesRouter: IRouter = Router();

// POST /solicitacoes — qualquer usuário autenticado pode solicitar
solicitacoesRouter.post("/", authenticate, async (req, res, next) => {
  try {
    const {
      nome_solicitante,
      liga_id,
      tipo_evento,
      participantes_info,
      tema,
      descricao_tema,
      nome_palestrante,
      linkedin_palestrante,
      data_inicio,
      data_fim,
      veiculo_info,
      observacoes,
    } = req.body as {
      nome_solicitante: string;
      liga_id?: string;
      tipo_evento: string;
      participantes_info?: string;
      tema: string;
      descricao_tema?: string;
      nome_palestrante?: string;
      linkedin_palestrante?: string;
      data_inicio?: string;
      data_fim?: string;
      veiculo_info?: string;
      observacoes?: string;
    };

    if (!nome_solicitante || !tipo_evento || !tema) {
      res.status(400).json({ error: "nome_solicitante, tipo_evento e tema são obrigatórios." });
      return;
    }

    const user = (req as AuthenticatedRequest).user!;

    if (!user.email) {
      res
        .status(401)
        .json({ error: "Não foi possível identificar o e-mail do usuário autenticado." });
      return;
    }

    const [solicitacao] = await sql`
      INSERT INTO solicitacoes_eventos (
        nome_solicitante, liga_id, tipo_evento, participantes_info,
        tema, descricao_tema, nome_palestrante, linkedin_palestrante,
        data_inicio, data_fim, veiculo_info, observacoes, criado_por_email
      )
      VALUES (
        ${nome_solicitante},
        ${liga_id ?? null},
        ${tipo_evento},
        ${participantes_info ?? null},
        ${tema},
        ${descricao_tema ?? null},
        ${nome_palestrante ?? null},
        ${linkedin_palestrante ?? null},
        ${data_inicio ?? null},
        ${data_fim ?? null},
        ${veiculo_info ?? null},
        ${observacoes ?? null},
        ${user.email}
      )
      RETURNING *
    `;

    res.status(201).json(solicitacao);
  } catch (err) {
    next(err);
  }
});
