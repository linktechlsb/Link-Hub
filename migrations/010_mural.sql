-- ============================================================
-- Link Leagues Platform — Migration 010: Mural / Feed
-- ============================================================
-- Publicações das ligas (posts), curtidas e comentários.
-- Apenas diretor (da própria liga) ou staff podem publicar.
-- Qualquer usuário autenticado pode curtir e comentar.
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id       UUID        NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  autor_id      UUID        NOT NULL REFERENCES usuarios(id),
  conteudo      TEXT        NOT NULL CHECK (char_length(conteudo) > 0),
  imagem_url    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_liga_id ON posts(liga_id);
CREATE INDEX IF NOT EXISTS idx_posts_criado_em ON posts(criado_em DESC);

CREATE TABLE IF NOT EXISTS post_curtidas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  usuario_id UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_post_curtidas_post_id ON post_curtidas(post_id);

CREATE TABLE IF NOT EXISTS post_comentarios (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  autor_id   UUID        NOT NULL REFERENCES usuarios(id),
  conteudo   TEXT        NOT NULL CHECK (char_length(conteudo) > 0),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comentarios_post_id ON post_comentarios(post_id);

-- Trigger para atualizado_em em posts
DROP TRIGGER IF EXISTS trg_posts_atualizado_em ON posts;
CREATE TRIGGER trg_posts_atualizado_em
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
