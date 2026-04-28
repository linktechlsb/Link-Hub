-- Adiciona campos extras ao cadastro de projetos
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS impacto TEXT,
  ADD COLUMN IF NOT EXISTS professor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS empresa_parceira TEXT,
  ADD COLUMN IF NOT EXISTS tipo_projeto TEXT;
