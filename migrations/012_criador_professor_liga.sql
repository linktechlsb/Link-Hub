-- Criador do projeto (quem abriu o rascunho)
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_projetos_criado_por ON projetos(criado_por);

-- Professor responsável pela liga (nullable p/ ligas já existentes)
ALTER TABLE ligas
  ADD COLUMN IF NOT EXISTS professor_id UUID REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_ligas_professor_id ON ligas(professor_id);
