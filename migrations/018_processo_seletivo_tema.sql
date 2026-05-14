-- Adiciona coluna de tema de personalização ao processo seletivo
alter table processos_seletivos add column if not exists tema jsonb;
