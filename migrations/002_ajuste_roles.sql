-- ============================================================
-- Link Leagues Platform — Migration 002: Ajuste de Roles
-- ============================================================
-- Renomeia os valores do enum user_role para alinhar com o
-- sistema de permissões da aplicação.
--
-- De:  staff | diretor | membro | aluno
-- Para: admin | lider   | membro | estudante
-- ============================================================

ALTER TYPE user_role RENAME VALUE 'staff'   TO 'admin';
ALTER TYPE user_role RENAME VALUE 'diretor' TO 'lider';
ALTER TYPE user_role RENAME VALUE 'aluno'   TO 'estudante';

-- Atualiza o default da coluna para o novo nome
ALTER TABLE usuarios ALTER COLUMN role SET DEFAULT 'estudante';
