-- Torna a milestone opcional na tarefa: a tarefa passa a referenciar o
-- projeto diretamente (antes o vínculo era apenas via milestone).

-- 1. Coluna projeto_id (temporariamente nullable para backfill)
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS projeto_id UUID REFERENCES projetos(id) ON DELETE CASCADE;

-- 2. Backfill a partir da milestone atual
UPDATE tarefas t
SET projeto_id = m.projeto_id
FROM milestones m
WHERE t.milestone_id = m.id AND t.projeto_id IS NULL;

-- 3. projeto_id passa a ser obrigatório; milestone_id passa a ser opcional
ALTER TABLE tarefas ALTER COLUMN projeto_id SET NOT NULL;
ALTER TABLE tarefas ALTER COLUMN milestone_id DROP NOT NULL;

-- 4. Ao excluir a milestone, manter a tarefa (agora ligada ao projeto)
ALTER TABLE tarefas DROP CONSTRAINT IF EXISTS tarefas_milestone_id_fkey;
ALTER TABLE tarefas ADD CONSTRAINT tarefas_milestone_id_fkey
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
