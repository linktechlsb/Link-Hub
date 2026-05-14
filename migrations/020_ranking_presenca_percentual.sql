-- Adiciona presenca_percentual à view v_ranking_ligas
-- Mesma fórmula do endpoint /ligas/:id/presenca:
--   numerador:   presencas com status='presente', membro atual, evento passado
--   denominador: presencas com status IS NOT NULL, membro atual, evento passado

DROP VIEW IF EXISTS v_ranking_ligas;

CREATE VIEW v_ranking_ligas AS
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
  CASE
    WHEN COALESCE(pres_pct_den.qtd, 0) > 0
    THEN ROUND(COALESCE(pres_pct_num.qtd, 0) * 100.0 / pres_pct_den.qtd)
    ELSE 0
  END::int AS presenca_percentual,
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
  -- numerador do %: status='presente', só membros atuais, só eventos passados
  SELECT pr.liga_id, COUNT(*) AS qtd
  FROM presencas pr
  JOIN liga_membros lm ON lm.usuario_id = pr.usuario_id AND lm.liga_id = pr.liga_id
  JOIN eventos e ON e.id = pr.evento_id AND e.liga_id = pr.liga_id AND e.data <= NOW()
  WHERE pr.status = 'presente'
  GROUP BY pr.liga_id
) pres_pct_num ON pres_pct_num.liga_id = l.id
LEFT JOIN (
  -- denominador do %: status IS NOT NULL, só membros atuais, só eventos passados
  SELECT pr.liga_id, COUNT(*) AS qtd
  FROM presencas pr
  JOIN liga_membros lm ON lm.usuario_id = pr.usuario_id AND lm.liga_id = pr.liga_id
  JOIN eventos e ON e.id = pr.evento_id AND e.liga_id = pr.liga_id AND e.data <= NOW()
  WHERE pr.status IS NOT NULL
  GROUP BY pr.liga_id
) pres_pct_den ON pres_pct_den.liga_id = l.id
LEFT JOIN (
  SELECT liga_id, SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total
  FROM receitas GROUP BY liga_id
) rec ON rec.liga_id = l.id
LEFT JOIN (
  SELECT liga_id, COUNT(*) AS qtd FROM posts GROUP BY liga_id
) post ON post.liga_id = l.id
WHERE l.ativo = true;
