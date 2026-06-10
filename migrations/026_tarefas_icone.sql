-- Ícone exibido no card da tarefa (nome do ícone Lucide, ex.: "file-text")
ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS icone TEXT;
