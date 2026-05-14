-- 021_tally_formularios.sql
-- Renomeia e generaliza o módulo de processos seletivos para "formulários"
-- e troca Google Forms por Tally como provedor.
-- Versão idempotente — segura para re-executar se parcialmente aplicada.

BEGIN;

-- 1. Renomeia tabelas (só se ainda existirem com o nome antigo)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'processos_seletivos') THEN
    ALTER TABLE processos_seletivos RENAME TO formularios;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'processo_perguntas') THEN
    ALTER TABLE processo_perguntas RENAME TO formulario_campos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'processo_candidatos') THEN
    ALTER TABLE processo_candidatos RENAME TO formulario_respostas;
  END IF;
END $$;

-- 2. Renomeia FKs nas tabelas filhas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formulario_campos' AND column_name = 'processo_id') THEN
    ALTER TABLE formulario_campos RENAME COLUMN processo_id TO formulario_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formulario_respostas' AND column_name = 'processo_id') THEN
    ALTER TABLE formulario_respostas RENAME COLUMN processo_id TO formulario_id;
  END IF;
END $$;

-- 3. Renomeia colunas Google → Tally
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formularios' AND column_name = 'google_form_id') THEN
    ALTER TABLE formularios RENAME COLUMN google_form_id TO tally_form_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formularios' AND column_name = 'google_form_url') THEN
    ALTER TABLE formularios RENAME COLUMN google_form_url TO tally_form_url;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formulario_campos' AND column_name = 'google_item_id') THEN
    ALTER TABLE formulario_campos RENAME COLUMN google_item_id TO tally_question_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formulario_respostas' AND column_name = 'google_response_id') THEN
    ALTER TABLE formulario_respostas RENAME COLUMN google_response_id TO tally_submission_id;
  END IF;
END $$;

-- 4. Drop coluna tema (não usamos mais — Tally controla branding)
ALTER TABLE formularios DROP COLUMN IF EXISTS tema;

-- 5. Novas colunas em formularios (IF NOT EXISTS para idempotência)
ALTER TABLE formularios
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'generico',
  ADD COLUMN IF NOT EXISTS scoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pontuacao_minima_aprovacao INT,
  ADD COLUMN IF NOT EXISTS tally_webhook_id TEXT;

-- 5b. Garante que pontuacao_minima_aprovacao é nullable (pode existir como NOT NULL em DBs antigos)
ALTER TABLE formularios ALTER COLUMN pontuacao_minima_aprovacao DROP NOT NULL;

-- Adiciona o CHECK constraint de tipo separadamente (ignora se já existe)
DO $$ BEGIN
  ALTER TABLE formularios ADD CONSTRAINT formularios_tipo_check
    CHECK (tipo IN ('generico','processo_seletivo','pesquisa','inscricao','feedback'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. liga_id opcional
ALTER TABLE formularios ALTER COLUMN liga_id DROP NOT NULL;

-- 7. Backfill: registros que existiam eram todos processo_seletivo com scoring implícito
UPDATE formularios SET tipo = 'processo_seletivo', scoring_enabled = TRUE WHERE tipo = 'generico';

-- 8. Constraints

DO $$ BEGIN
  ALTER TABLE formulario_campos
    ADD CONSTRAINT formulario_campos_form_tally_uniq
    UNIQUE (formulario_id, tally_question_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE formulario_respostas
    ADD CONSTRAINT formulario_respostas_tally_submission_uniq
    UNIQUE (tally_submission_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Validação: se scoring_enabled, exige pontuacao_minima
DO $$ BEGIN
  ALTER TABLE formularios
    ADD CONSTRAINT formularios_scoring_requires_minima
    CHECK (
      (scoring_enabled = FALSE) OR
      (scoring_enabled = TRUE AND pontuacao_minima_aprovacao IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
