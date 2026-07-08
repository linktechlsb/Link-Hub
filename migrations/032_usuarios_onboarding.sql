-- Migration 032: Tour de onboarding
-- Guarda quando o usuário concluiu (ou pulou) o tour guiado da plataforma.
-- NULL = ainda não viu; o tour dispara automaticamente no próximo login.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS onboarding_concluido_em TIMESTAMPTZ;
