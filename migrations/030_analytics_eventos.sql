-- Migration 030: Instrumentação de uso da plataforma (analytics in-house)
-- Registra pageviews (Fase 1) e, futuramente, cliques/scroll para heatmap (Fase 2).

CREATE TABLE IF NOT EXISTS analytics_eventos (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL DEFAULT 'pageview',              -- 'pageview' | 'click' | 'scroll'
  rota        TEXT NOT NULL,                                 -- padrão normalizado, ex: /ligas/:id
  caminho     TEXT,                                          -- caminho real navegado
  papel       user_role,                                     -- papel no momento do evento (denormalizado)
  liga_id     UUID REFERENCES ligas(id) ON DELETE SET NULL,  -- liga do usuário no momento (acessos recentes)
  -- campos de heatmap (Fase 2):
  pos_x       REAL,
  pos_y       REAL,
  viewport_w  INTEGER,
  viewport_h  INTEGER,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_criado_em ON analytics_eventos (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_rota      ON analytics_eventos (rota);
CREATE INDEX IF NOT EXISTS idx_analytics_usuario   ON analytics_eventos (usuario_id);
