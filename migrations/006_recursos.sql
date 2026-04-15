-- Migration 005: ajusta schema da tabela recursos
-- IMPORTANTE: crie o bucket "recursos" no Supabase Storage (público) antes de usar upload de arquivos

-- Renomeia coluna nome -> titulo (padrão da API)
ALTER TABLE recursos RENAME COLUMN nome TO titulo;

-- Garante colunas que podem estar faltando
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS tipo       TEXT        NOT NULL DEFAULT 'URL';
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS icone      TEXT        NOT NULL DEFAULT 'link';
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS cor        TEXT        NOT NULL DEFAULT '#546484';
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS criado_por UUID        REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_recursos_liga_id ON recursos(liga_id);
