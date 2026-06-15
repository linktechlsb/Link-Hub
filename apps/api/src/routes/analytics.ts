import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { podeAcessarAnalytics, requireLigaTech } from "../middleware/authorization.js";

import type {
  AcessoRecente,
  AnalyticsResumo,
  AnalyticsTipo,
  HeatmapPonto,
  HeatmapRota,
  PaginaAcesso,
  RegistrarEventoInput,
  TendenciaPonto,
} from "@link-leagues/types";

export const analyticsRouter: IRouter = Router();

const TIPOS_VALIDOS: AnalyticsTipo[] = ["pageview", "click", "scroll"];

/** Converte ?periodo=hoje|7d|30d num intervalo SQL. Default: 7d. */
function intervaloDoPeriodo(periodo: unknown): string {
  if (periodo === "hoje") return "1 day";
  if (periodo === "30d") return "30 days";
  return "7 days";
}

const LIMITE_LOTE = 50; // máximo de eventos por requisição

function clampNorm(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, 0), 1);
}

// POST /analytics/eventos — ingestão de pageviews/cliques (aceita 1 evento ou um lote)
analyticsRouter.post("/eventos", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const entrada = Array.isArray(req.body) ? req.body : [req.body];
    const eventos = (entrada as RegistrarEventoInput[]).slice(0, LIMITE_LOTE);

    // Resolve a liga do usuário uma única vez (primeira liga ativa em que é membro).
    const [membro] = await sql`
      SELECT lm.liga_id
      FROM liga_membros lm
      JOIN ligas l ON l.id = lm.liga_id AND l.ativo = true
      WHERE lm.usuario_id = ${user.id}
      ORDER BY lm.ingressou_em
      LIMIT 1
    `;
    const ligaId = (membro?.["liga_id"] as string | undefined) ?? null;

    const linhas = eventos
      .filter((e) => typeof e?.rota === "string" && e.rota.trim())
      .map((e) => ({
        usuario_id: user.id,
        tipo: TIPOS_VALIDOS.includes(e.tipo as AnalyticsTipo)
          ? (e.tipo as AnalyticsTipo)
          : "pageview",
        rota: e.rota.slice(0, 255),
        caminho: typeof e.caminho === "string" ? e.caminho.slice(0, 512) : null,
        papel: user.role,
        liga_id: ligaId,
        pos_x: clampNorm(e.pos_x),
        pos_y: clampNorm(e.pos_y),
        viewport_w: Number.isFinite(Number(e.viewport_w)) ? Math.trunc(Number(e.viewport_w)) : null,
        viewport_h: Number.isFinite(Number(e.viewport_h)) ? Math.trunc(Number(e.viewport_h)) : null,
      }));

    if (linhas.length === 0) {
      res.status(400).json({ error: "Nenhum evento válido." });
      return;
    }

    await sql`INSERT INTO analytics_eventos ${sql(
      linhas,
      "usuario_id",
      "tipo",
      "rota",
      "caminho",
      "papel",
      "liga_id",
      "pos_x",
      "pos_y",
      "viewport_w",
      "viewport_h",
    )}`;

    res.status(201).json({ ok: true, registrados: linhas.length });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/acesso — usado pela sidebar para mostrar/ocultar o item "Dados"
analyticsRouter.get("/acesso", authenticate, async (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const permitido = await podeAcessarAnalytics(user.email, user.role);
    res.json({ permitido });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/resumo — cartões de visão geral
analyticsRouter.get("/resumo", authenticate, requireLigaTech(), async (_req, res, next) => {
  try {
    const [linha] = await sql`
      SELECT
        COUNT(DISTINCT usuario_id) FILTER (WHERE criado_em >= NOW() - INTERVAL '1 day')   AS usuarios_hoje,
        COUNT(DISTINCT usuario_id) FILTER (WHERE criado_em >= NOW() - INTERVAL '7 days')  AS usuarios_7d,
        COUNT(DISTINCT usuario_id) FILTER (WHERE criado_em >= NOW() - INTERVAL '30 days') AS usuarios_30d,
        COUNT(DISTINCT usuario_id) FILTER (WHERE criado_em >= NOW() - INTERVAL '5 minutes') AS online_agora,
        COUNT(*) FILTER (WHERE tipo = 'pageview') AS total_pageviews
      FROM analytics_eventos
    `;

    const resumo: AnalyticsResumo = {
      usuarios_hoje: Number(linha?.["usuarios_hoje"] ?? 0),
      usuarios_7d: Number(linha?.["usuarios_7d"] ?? 0),
      usuarios_30d: Number(linha?.["usuarios_30d"] ?? 0),
      online_agora: Number(linha?.["online_agora"] ?? 0),
      total_pageviews: Number(linha?.["total_pageviews"] ?? 0),
    };
    res.json(resumo);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/paginas — ranking de acessos por página
analyticsRouter.get("/paginas", authenticate, requireLigaTech(), async (req, res, next) => {
  try {
    const intervalo = intervaloDoPeriodo(req.query["periodo"]);
    const linhas = await sql`
      SELECT
        rota,
        COUNT(*)                   AS total,
        COUNT(DISTINCT usuario_id) AS usuarios_unicos
      FROM analytics_eventos
      WHERE tipo = 'pageview'
        AND criado_em >= NOW() - ${intervalo}::interval
      GROUP BY rota
      ORDER BY total DESC
      LIMIT 50
    `;

    const paginas: PaginaAcesso[] = linhas.map((l) => ({
      rota: l["rota"] as string,
      total: Number(l["total"]),
      usuarios_unicos: Number(l["usuarios_unicos"]),
    }));
    res.json(paginas);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/tendencia — série diária de pageviews e usuários
analyticsRouter.get("/tendencia", authenticate, requireLigaTech(), async (req, res, next) => {
  try {
    const intervalo = intervaloDoPeriodo(req.query["periodo"] ?? "30d");
    const linhas = await sql`
      SELECT
        to_char(date_trunc('day', criado_em), 'YYYY-MM-DD') AS dia,
        COUNT(*) FILTER (WHERE tipo = 'pageview')           AS pageviews,
        COUNT(DISTINCT usuario_id)                          AS usuarios
      FROM analytics_eventos
      WHERE criado_em >= NOW() - ${intervalo}::interval
      GROUP BY 1
      ORDER BY 1
    `;

    const tendencia: TendenciaPonto[] = linhas.map((l) => ({
      dia: l["dia"] as string,
      pageviews: Number(l["pageviews"]),
      usuarios: Number(l["usuarios"]),
    }));
    res.json(tendencia);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/recentes — lista de acessos recentes (Nome · Papel · Liga)
analyticsRouter.get("/recentes", authenticate, requireLigaTech(), async (req, res, next) => {
  try {
    const limiteRaw = Number(req.query["limite"]);
    const limite = Number.isFinite(limiteRaw) ? Math.min(Math.max(limiteRaw, 1), 100) : 30;

    const linhas = await sql`
      SELECT
        u.nome  AS usuario_nome,
        ae.papel,
        l.nome  AS liga_nome,
        ae.rota,
        ae.criado_em
      FROM analytics_eventos ae
      LEFT JOIN usuarios u ON u.id = ae.usuario_id
      LEFT JOIN ligas l    ON l.id = ae.liga_id
      WHERE ae.tipo = 'pageview'
      ORDER BY ae.criado_em DESC
      LIMIT ${limite}
    `;

    const recentes: AcessoRecente[] = linhas.map((l) => ({
      usuario_nome: (l["usuario_nome"] as string | null) ?? null,
      papel: (l["papel"] as AcessoRecente["papel"]) ?? null,
      liga_nome: (l["liga_nome"] as string | null) ?? null,
      rota: l["rota"] as string,
      criado_em: l["criado_em"] as string,
    }));
    res.json(recentes);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/heatmap/rotas — rotas que possuem cliques registrados (para o seletor)
analyticsRouter.get("/heatmap/rotas", authenticate, requireLigaTech(), async (_req, res, next) => {
  try {
    const linhas = await sql`
      SELECT
        rota,
        COUNT(*) AS total,
        MODE() WITHIN GROUP (ORDER BY caminho) AS caminho
      FROM analytics_eventos
      WHERE tipo = 'click' AND pos_x IS NOT NULL AND pos_y IS NOT NULL
        AND rota NOT LIKE '/dados%'
      GROUP BY rota
      ORDER BY total DESC
      LIMIT 100
    `;
    const rotas: HeatmapRota[] = linhas.map((l) => ({
      rota: l["rota"] as string,
      total: Number(l["total"]),
      caminho: (l["caminho"] as string | null) ?? null,
    }));
    res.json(rotas);
  } catch (err) {
    next(err);
  }
});

// GET /analytics/heatmap?rota=... — coordenadas dos cliques de uma rota
analyticsRouter.get("/heatmap", authenticate, requireLigaTech(), async (req, res, next) => {
  try {
    const rota = typeof req.query["rota"] === "string" ? req.query["rota"] : "";
    if (!rota) {
      res.status(400).json({ error: "Rota é obrigatória." });
      return;
    }
    const intervalo = intervaloDoPeriodo(req.query["periodo"] ?? "30d");
    const linhas = await sql`
      SELECT pos_x, pos_y
      FROM analytics_eventos
      WHERE tipo = 'click'
        AND rota = ${rota}
        AND pos_x IS NOT NULL AND pos_y IS NOT NULL
        AND criado_em >= NOW() - ${intervalo}::interval
      ORDER BY criado_em DESC
      LIMIT 5000
    `;
    const pontos: HeatmapPonto[] = linhas.map((l) => ({
      pos_x: Number(l["pos_x"]),
      pos_y: Number(l["pos_y"]),
    }));
    res.json(pontos);
  } catch (err) {
    next(err);
  }
});
