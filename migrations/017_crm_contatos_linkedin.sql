-- Adiciona campo linkedin aos contatos do CRM

ALTER TABLE crm_contatos
  ADD COLUMN linkedin TEXT;
