import type { UserRole } from "./user.js";

export type AnalyticsTipo = "pageview" | "click" | "scroll";

export type AnalyticsPeriodo = "hoje" | "7d" | "30d";

/** Payload enviado pelo frontend para registrar um evento de uso. */
export interface RegistrarEventoInput {
  tipo?: AnalyticsTipo;
  /** Caminho real navegado, ex: /ligas/abc-123 */
  caminho: string;
  /** Rota normalizada, ex: /ligas/:id */
  rota: string;
  // campos de heatmap (Fase 2):
  pos_x?: number;
  pos_y?: number;
  viewport_w?: number;
  viewport_h?: number;
}

/** Cartões de visão geral da página de Dados. */
export interface AnalyticsResumo {
  usuarios_hoje: number;
  usuarios_7d: number;
  usuarios_30d: number;
  online_agora: number;
  total_pageviews: number;
}

/** Linha do ranking de acessos por página. */
export interface PaginaAcesso {
  rota: string;
  total: number;
  usuarios_unicos: number;
}

/** Ponto da série temporal diária. */
export interface TendenciaPonto {
  dia: string;
  pageviews: number;
  usuarios: number;
}

/** Item da lista de acessos recentes (Nome · Papel · Liga). */
export interface AcessoRecente {
  usuario_nome: string | null;
  papel: UserRole | null;
  liga_nome: string | null;
  rota: string;
  criado_em: string;
}

/** Rota com cliques registrados, para o seletor do mapa de calor. */
export interface HeatmapRota {
  rota: string;
  total: number;
  /** Caminho concreto representativo (mais frequente) para carregar no preview. */
  caminho: string | null;
}

/** Coordenada relativa (0..1) de um clique, para renderizar o mapa de calor. */
export interface HeatmapPonto {
  pos_x: number;
  pos_y: number;
}
