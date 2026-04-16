-- Migration 007: Adiciona categoria, sala, horário e aprovação aos eventos

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS categoria        TEXT    NOT NULL DEFAULT 'encontro',
  ADD COLUMN IF NOT EXISTS sala_id          UUID    REFERENCES salas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hora_inicio      TIME,
  ADD COLUMN IF NOT EXISTS hora_fim         TIME,
  ADD COLUMN IF NOT EXISTS requer_aprovacao BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status_aprovacao TEXT    DEFAULT NULL; -- 'pendente' | 'aprovado' | 'rejeitado'
