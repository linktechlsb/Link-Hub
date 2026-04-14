-- Migration 004: adiciona coluna biografia na tabela usuarios

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS biografia TEXT;
