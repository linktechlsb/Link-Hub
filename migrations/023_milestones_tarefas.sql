-- Milestones: marcos de acompanhamento dentro de projetos
CREATE TABLE milestones (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id    UUID        NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  titulo        TEXT        NOT NULL,
  descricao     TEXT,
  prazo         DATE,
  status        TEXT        NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  ordem         SMALLINT    NOT NULL DEFAULT 0,
  criado_por    UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_projeto ON milestones(projeto_id);

-- Tarefas: itens atribuíveis dentro de um milestone
CREATE TABLE tarefas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id    UUID        NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  titulo          TEXT        NOT NULL,
  descricao       TEXT,
  responsavel_id  UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  status          TEXT        NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  prazo           DATE,
  criado_por      UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tarefas_milestone    ON tarefas(milestone_id);
CREATE INDEX idx_tarefas_responsavel  ON tarefas(responsavel_id);
