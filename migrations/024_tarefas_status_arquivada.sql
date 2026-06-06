ALTER TABLE tarefas
  DROP CONSTRAINT tarefas_status_check,
  ADD CONSTRAINT tarefas_status_check
    CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'arquivada'));
