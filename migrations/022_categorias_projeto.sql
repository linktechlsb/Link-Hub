-- Migration 022: Categorias de Projeto
-- Tabela de categorias (base + por liga) e coluna categoria_id em projetos

CREATE TABLE categorias_projeto (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  liga_id     UUID        REFERENCES ligas(id) ON DELETE CASCADE,
  -- NULL = categoria base (todas as ligas), preenchido = categoria da liga específica
  ativo       BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categorias_projeto_liga ON categorias_projeto(liga_id);

-- Categorias base iniciais
INSERT INTO categorias_projeto (nome, descricao) VALUES
  ('Pesquisa', 'Projetos de pesquisa científica e acadêmica'),
  ('Extensão', 'Projetos de extensão e impacto comunitário'),
  ('Inovação', 'Projetos de inovação e empreendedorismo'),
  ('Capacitação', 'Projetos de treinamento e desenvolvimento de membros'),
  ('Evento', 'Organização de eventos e workshops');

-- Coluna categoria_id em projetos
ALTER TABLE projetos ADD COLUMN categoria_id UUID REFERENCES categorias_projeto(id) ON DELETE SET NULL;
