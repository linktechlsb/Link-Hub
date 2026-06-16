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
      local,
      mudanca_layout,
      coffee_break,
      cenografia,
      apoio_infraestrutura,
      criacao_mkt,
      audio_visual,
      ligas_participantes,
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
      local?: string;
      mudanca_layout?: string;
      coffee_break?: string;
      cenografia?: string;
      apoio_infraestrutura?: string;
      criacao_mkt?: string;
      audio_visual?: string;
      ligas_participantes?: { id: string; nome: string }[];
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
        data_inicio, data_fim, veiculo_info, observacoes,
        local, mudanca_layout, coffee_break, cenografia,
        apoio_infraestrutura, criacao_mkt, audio_visual, ligas_participantes, criado_por_email
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
        ${local ?? null},
        ${mudanca_layout ?? null},
        ${coffee_break ?? null},
        ${cenografia ?? null},
        ${apoio_infraestrutura ?? null},
        ${criacao_mkt ?? null},
        ${audio_visual ?? null},
        ${ligas_participantes && ligas_participantes.length > 0 ? sql.json(ligas_participantes) : null},
        ${user.email}
      )
      RETURNING *
    `;

    res.status(201).json(solicitacao);
  } catch (err) {
    next(err);
  }
});
