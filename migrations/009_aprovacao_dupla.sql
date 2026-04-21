-- ============================================================
-- Link Leagues Platform — Migration 009: Aprovação Dupla de Projetos
-- ============================================================
-- Adiciona colunas de aprovação individual (professor e staff)
-- à tabela projetos e role professor ao enum user_role.
-- ============================================================

-- Adiciona role professor ao enum (se ainda não existir)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'professor';

-- Adiciona colunas de aprovação individual
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS aprovacao_professor TEXT
    NOT NULL DEFAULT 'pendente'
    CHECK (aprovacao_professor IN ('pendente', 'aprovado', 'rejeitado')),
  ADD COLUMN IF NOT EXISTS aprovacao_staff TEXT
    NOT NULL DEFAULT 'pendente'
    CHECK (aprovacao_staff IN ('pendente', 'aprovado', 'rejeitado'));

-- Índice para filtragem por aprovações
CREATE INDEX IF NOT EXISTS idx_projetos_aprovacoes
  ON projetos(aprovacao_professor, aprovacao_staff)
  WHERE status = 'em_aprovacao';
