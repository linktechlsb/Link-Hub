-- migrations/005_ligas_campos_extra.sql
ALTER TABLE ligas
  ADD COLUMN IF NOT EXISTS area              TEXT,
  ADD COLUMN IF NOT EXISTS semestre_fundacao TEXT,
  ADD COLUMN IF NOT EXISTS email_contato     TEXT,
  ADD COLUMN IF NOT EXISTS instagram         TEXT,
  ADD COLUMN IF NOT EXISTS linkedin          TEXT,
  ADD COLUMN IF NOT EXISTS professor_mentor  TEXT;
