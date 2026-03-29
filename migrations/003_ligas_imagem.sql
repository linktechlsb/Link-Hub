-- migrations/003_ligas_imagem.sql
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS imagem_url TEXT;
