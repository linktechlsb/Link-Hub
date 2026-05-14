-- Migração de Typeform para Google Forms
-- Renomeia colunas nas 3 tabelas afetadas

ALTER TABLE processos_seletivos
  RENAME COLUMN typeform_form_id TO google_form_id;

ALTER TABLE processos_seletivos
  RENAME COLUMN typeform_form_url TO google_form_url;

ALTER TABLE processo_perguntas
  RENAME COLUMN typeform_field_id TO google_item_id;

ALTER TABLE processo_candidatos
  RENAME COLUMN typeform_response_id TO google_response_id;
