-- Tabela de contatos do CRM por liga

CREATE TABLE crm_contatos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id    UUID        NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  emprego    TEXT,
  empresa    TEXT,
  telefone   TEXT,
  email      TEXT,
  criado_por UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_contatos_liga_id ON crm_contatos(liga_id);
