-- Migration 029: Adiciona campos de logística às solicitações de eventos

ALTER TABLE solicitacoes_eventos
  ADD COLUMN IF NOT EXISTS local                TEXT,
  ADD COLUMN IF NOT EXISTS mudanca_layout       TEXT,
  ADD COLUMN IF NOT EXISTS coffee_break         TEXT,
  ADD COLUMN IF NOT EXISTS cenografia           TEXT,
  ADD COLUMN IF NOT EXISTS apoio_infraestrutura TEXT,
  ADD COLUMN IF NOT EXISTS criacao_mkt          TEXT,
  ADD COLUMN IF NOT EXISTS audio_visual         TEXT;
