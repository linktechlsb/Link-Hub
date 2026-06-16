-- Migration 031: Participação em conjunto (ligas co-participantes)
-- Permite vincular outras ligas como co-participantes em projetos/capacitações e eventos.

CREATE TABLE IF NOT EXISTS projeto_ligas (
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  liga_id    UUID NOT NULL REFERENCES ligas(id)    ON DELETE CASCADE,
  PRIMARY KEY (projeto_id, liga_id)
);

CREATE TABLE IF NOT EXISTS evento_ligas (
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  liga_id   UUID NOT NULL REFERENCES ligas(id)   ON DELETE CASCADE,
  PRIMARY KEY (evento_id, liga_id)
);

CREATE INDEX IF NOT EXISTS idx_projeto_ligas_liga ON projeto_ligas (liga_id);
CREATE INDEX IF NOT EXISTS idx_evento_ligas_liga  ON evento_ligas (liga_id);

-- Solicitações são intake denormalizado: guardamos as ligas em conjunto como JSONB ({id, nome}).
ALTER TABLE solicitacoes_eventos
  ADD COLUMN IF NOT EXISTS ligas_participantes JSONB;
