-- ============================================================
-- Link Leagues Platform — Migration 001: Schema Inicial
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSÕES
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('staff', 'diretor', 'membro', 'aluno');

CREATE TYPE status_projeto AS ENUM (
  'rascunho',
  'em_aprovacao',
  'aprovado',
  'rejeitado',
  'em_andamento',
  'concluido',
  'cancelado'
);

CREATE TYPE status_presenca AS ENUM ('presente', 'ausente', 'justificado');


-- ------------------------------------------------------------
-- USUARIOS
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL UNIQUE,
  nome         TEXT        NOT NULL,
  role         user_role   NOT NULL DEFAULT 'aluno',
  avatar_url   TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- LIGAS
-- ------------------------------------------------------------
CREATE TABLE ligas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT        NOT NULL,
  descricao     TEXT,
  lider_id      UUID        NOT NULL REFERENCES usuarios(id),
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- LIGA_MEMBROS
-- ------------------------------------------------------------
CREATE TABLE liga_membros (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id      UUID        NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  usuario_id   UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cargo        TEXT,
  ingressou_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (liga_id, usuario_id)
);


-- ------------------------------------------------------------
-- PROJETOS
-- ------------------------------------------------------------
CREATE TABLE projetos (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id              UUID           NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  nome                 TEXT           NOT NULL,
  descricao            TEXT,
  responsavel_id       UUID           NOT NULL REFERENCES usuarios(id),
  status               status_projeto NOT NULL DEFAULT 'rascunho',
  prazo                DATE,
  percentual_concluido SMALLINT       NOT NULL DEFAULT 0 CHECK (percentual_concluido BETWEEN 0 AND 100),
  criado_em            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- EVENTOS
-- ------------------------------------------------------------
CREATE TABLE eventos (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id   UUID        NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  titulo    TEXT        NOT NULL,
  descricao TEXT,
  data      DATE        NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- PRESENCAS
-- ------------------------------------------------------------
CREATE TABLE presencas (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id     UUID             NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  liga_id       UUID             NOT NULL REFERENCES ligas(id),
  usuario_id    UUID             NOT NULL REFERENCES usuarios(id),
  status        status_presenca  NOT NULL DEFAULT 'ausente',
  justificativa TEXT,
  criado_em     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (evento_id, usuario_id)
);


-- ------------------------------------------------------------
-- SALAS
-- ------------------------------------------------------------
CREATE TABLE salas (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT    NOT NULL,
  capacidade  INTEGER,
  localizacao TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE
);


-- ------------------------------------------------------------
-- RESERVAS_SALAS
-- ------------------------------------------------------------
CREATE TABLE reservas_salas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id    UUID        NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  liga_id    UUID        NOT NULL REFERENCES ligas(id),
  titulo     TEXT        NOT NULL,
  inicio     TIMESTAMPTZ NOT NULL,
  fim        TIMESTAMPTZ NOT NULL,
  criado_por UUID        NOT NULL REFERENCES usuarios(id),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fim > inicio)
);


-- ------------------------------------------------------------
-- TRIGGERS: atualizado_em automático
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_ligas_atualizado_em
  BEFORE UPDATE ON ligas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_projetos_atualizado_em
  BEFORE UPDATE ON projetos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_presencas_atualizado_em
  BEFORE UPDATE ON presencas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();


-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------
CREATE INDEX idx_liga_membros_liga_id   ON liga_membros(liga_id);
CREATE INDEX idx_liga_membros_usuario   ON liga_membros(usuario_id);
CREATE INDEX idx_projetos_liga_id       ON projetos(liga_id);
CREATE INDEX idx_projetos_status        ON projetos(status);
CREATE INDEX idx_eventos_liga_id        ON eventos(liga_id);
CREATE INDEX idx_presencas_evento_id    ON presencas(evento_id);
CREATE INDEX idx_presencas_usuario_id   ON presencas(usuario_id);
CREATE INDEX idx_presencas_liga_id      ON presencas(liga_id);
CREATE INDEX idx_reservas_sala_id       ON reservas_salas(sala_id);
CREATE INDEX idx_reservas_inicio_fim    ON reservas_salas(inicio, fim);
