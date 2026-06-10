-- Permite múltiplos responsáveis por tarefa (tabela de junção).
-- A coluna tarefas.responsavel_id é mantida por compatibilidade e recebe
-- o primeiro responsável da lista.
CREATE TABLE IF NOT EXISTS tarefa_responsaveis (
  tarefa_id  UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (tarefa_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_tarefa_responsaveis_tarefa ON tarefa_responsaveis(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefa_responsaveis_usuario ON tarefa_responsaveis(usuario_id);

-- Backfill: traz o responsável único existente para a tabela de junção
INSERT INTO tarefa_responsaveis (tarefa_id, usuario_id)
SELECT id, responsavel_id
FROM tarefas
WHERE responsavel_id IS NOT NULL
ON CONFLICT DO NOTHING;
