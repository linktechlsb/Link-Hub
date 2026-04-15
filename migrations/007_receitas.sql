-- 007_receitas.sql
-- Tabela de receitas e custos por liga
-- DROP garante schema correto caso a tabela já exista com colunas diferentes

DROP TABLE IF EXISTS receitas CASCADE;

CREATE TABLE receitas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id      UUID        NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  tipo         TEXT        NOT NULL CHECK (tipo IN ('receita', 'custo')),
  recorrencia  TEXT        NOT NULL DEFAULT 'unico' CHECK (recorrencia IN ('unico', 'recorrente')),
  descricao    TEXT        NOT NULL,
  observacao   TEXT,
  valor        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  data         DATE        NOT NULL DEFAULT CURRENT_DATE,
  criado_por   UUID        REFERENCES usuarios(id),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receitas_liga_id ON receitas(liga_id);
