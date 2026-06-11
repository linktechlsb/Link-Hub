-- migrations/025_recursos_crm_publico.sql
-- Visibilidade pública/privada de recursos e contatos.
-- Membros da liga (e staff/professor) veem tudo; pessoas de fora só veem os
-- itens marcados como públicos.
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS publico BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_contatos ADD COLUMN IF NOT EXISTS publico BOOLEAN NOT NULL DEFAULT false;
