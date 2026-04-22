-- ============================================================
-- Link Leagues Platform — Migration 011: Ranking Automatizado
-- ============================================================
-- Ranking de ligas calculado a partir de presenças, projetos,
-- receitas e publicações no mural.
-- Os pesos ficam em configuracoes_pontuacao para fácil ajuste.
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracoes_pontuacao (
  chave        TEXT        PRIMARY KEY,
  valor        NUMERIC     NOT NULL,
  descricao    TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracoes_pontuacao (chave, valor, descricao) VALUES
  ('projeto_concluido', 50, 'Pontos por projeto concluído'),
  ('projeto_em_andamento', 20, 'Pontos por projeto em andamento'),
  ('presenca', 10, 'Pontos por presença registrada (presente)'),
  ('receita_por_real', 0.015, 'Pontos por real arrecadado em receitas'),
  ('post_mural', 5, 'Pontos por post publicado no mural')
ON CONFLICT (chave) DO NOTHING;

CREATE OR REPLACE VIEW v_ranking_ligas AS
WITH pesos AS (
  SELECT
    (SELECT valor FROM configuracoes_pontuacao WHERE chave = 'projeto_concluido') AS p_proj_concluido,
    (SELECT valor FROM configuracoes_pontuacao WHERE chave = 'projeto_em_andamento') AS p_proj_andamento,
    (SELECT valor FROM configuracoes_pontuacao WHERE chave = 'presenca') AS p_presenca,
    (SELECT valor FROM configuracoes_pontuacao WHERE chave = 'receita_por_real') AS p_receita,
    (SELECT valor FROM configuracoes_pontuacao WHERE chave = 'post_mural') AS p_post
)
SELECT
  l.id AS liga_id,
  l.nome,
  l.imagem_url,
  COALESCE(proj_concluido.qtd, 0)::int AS projetos_concluidos,
  COALESCE(proj_andamento.qtd, 0)::int AS projetos_em_andamento,
  COALESCE(pres.qtd, 0)::int AS presencas,
  COALESCE(rec.total, 0)::numeric AS receita_total,
  COALESCE(post.qtd, 0)::int AS posts,
  (
    COALESCE(proj_concluido.qtd, 0) * (SELECT p_proj_concluido FROM pesos)
    + COALESCE(proj_andamento.qtd, 0) * (SELECT p_proj_andamento FROM pesos)
    + COALESCE(pres.qtd, 0) * (SELECT p_presenca FROM pesos)
    + COALESCE(rec.total, 0) * (SELECT p_receita FROM pesos)
    + COALESCE(post.qtd, 0) * (SELECT p_post FROM pesos)
  )::numeric(12, 2) AS pontuacao
FROM ligas l
LEFT JOIN (
  SELECT liga_id, COUNT(*) AS qtd FROM projetos WHERE status = 'concluido' GROUP BY liga_id
) proj_concluido ON proj_concluido.liga_id = l.id
LEFT JOIN (
  SELECT liga_id, COUNT(*) AS qtd FROM projetos WHERE status = 'em_andamento' GROUP BY liga_id
) proj_andamento ON proj_andamento.liga_id = l.id
LEFT JOIN (
  SELECT liga_id, COUNT(*) AS qtd FROM presencas WHERE status = 'presente' GROUP BY liga_id
) pres ON pres.liga_id = l.id
LEFT JOIN (
  SELECT liga_id, SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total
  FROM receitas GROUP BY liga_id
) rec ON rec.liga_id = l.id
LEFT JOIN (
  SELECT liga_id, COUNT(*) AS qtd FROM posts GROUP BY liga_id
) post ON post.liga_id = l.id
WHERE l.ativo = true;
