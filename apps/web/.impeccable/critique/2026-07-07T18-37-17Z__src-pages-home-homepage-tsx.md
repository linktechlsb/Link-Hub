---
target: home page
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-07-07T18-37-17Z
slug: src-pages-home-homepage-tsx
---

Method: dual-agent (A: revisão de design · B: detector determinístico)
Inspeção estática de código; app autenticada (Supabase) e sem ferramenta de browser nesta sessão — nenhum render real foi observado. Dev server detectado em localhost:3000, não utilizado.

Nota de escopo: o router monta apenas `HomePage` → `HomeDashboard` (`src/router/index.tsx:61`). Todo o diretório `v1/` (EditorialHero, 4 views por papel, primitives) não está montado em nenhuma rota — é código vivo no bundle, mas não renderizado. Os veredictos separam os dois.

## Design Health Score

| #         | Heurística                       | Score     | Achado-chave                                                                                                                                         |
| --------- | -------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibilidade de status           | 3         | Skeletons fiéis em todos os painéis; mas concluir tarefa não gera confirmação (HomeTasksPanel.tsx:143-152)                                           |
| 2         | Correspondência com o mundo real | 3         | PT-BR bom ("Pendências", "Próximos marcos"); "Share" em inglês no ranking (RankingPanel.tsx:209)                                                     |
| 3         | Controle e liberdade             | 2         | Concluir tarefa irreversível na UI, sem undo; deletar evento sem confirmação (HomeCalendarPanel.tsx:172-183)                                         |
| 4         | Consistência e padrões           | 2         | Duas homes paralelas (components/ vs v1/); hex fora de token (eventCategorias.ts:4-10); `--primary` preto contradiz navy do CLAUDE.md (index.css:51) |
| 5         | Prevenção de erros               | 2         | PATCH imediato no checkbox sem confirmação nem tratamento de falha de rede                                                                           |
| 6         | Reconhecimento vs memorização    | 3         | Legenda de categorias, badge "sua liga", rótulos em todos os KPIs                                                                                    |
| 7         | Flexibilidade e eficiência       | 3         | CommandMenu global existe; mas sem atalhos na home, sem bulk actions, filtros não persistem                                                          |
| 8         | Design estético e minimalista    | 3         | Densidade adequada ao registro; títulos de painel mais fracos que o conteúdo; micro-tipografia 9-11px em excesso                                     |
| 9         | Recuperação de erros             | 1         | Falha silenciosa sistêmica: erro de API renderiza como sucesso vazio (useHomeData.ts:75-77; PendenciasPanel.tsx:72)                                  |
| 10        | Ajuda e documentação             | 1         | Vazios não ensinam: "Nenhum marco a vencer." não diz o que é nem como criar (MilestonesPanel.tsx:90)                                                 |
| **Total** |                                  | **23/40** | **Aceitável — melhorias significativas necessárias**                                                                                                 |

## Anti-Patterns Verdict

**Avaliação LLM**: a página viva passa com ressalvas; o `v1/` reprova. Na página viva o tell mais forte é arqueológico, não visual: o dashboard foi decalcado de um template de AI-visibility — comentários "Unique Visitors / AI Visibility Score" (ChartPanel.tsx:15-16) e "padrão Citation Rank" (RankingPanel.tsx:83-84); ChartPanel e RankPanel são esqueletos mortos desse clone. Há glow âmbar decorativo no body dark (index.css:203-210) contrariando o próprio PRODUCT.md, `animate-pulse` perpétuo sem reduced-motion (HomeCalendarPanel.tsx:93) e `.glass-card`/`.hover-3d` órfãos. No `v1/`: side-stripe border (primitives.tsx:200-201, ban absoluto), hero-metric template (primitives.tsx:72-126; EditorialHero.tsx:146-157), eyebrow uppercase tracked em toda seção (primitives.tsx:49-63) e carrossel autoplay na home de produto interno. Crédito à página viva: sem side-stripes, sem gradient text, sem grid de cards idênticos; o KpiStrip é denso e sóbrio, uso legítimo em dashboard.

**Scan determinístico**: 0 achados, exit code 0, sem falsos positivos a triar (alvo: apps/web/src/pages/home + AppLayout.tsx). Divergência relevante: o detector não flagrou o `border-l-2` colorido do v1/primitives.tsx:200-201 — a revisão humana pegou o que o scan não parseia em classes Tailwind. O scan limpo não deve ser lido como "sem anti-patterns".

**Visualização em browser**: pulada — app autenticada e sem ferramenta de browser exposta; nenhum overlay visível foi criado.

## Overall Impression

Uma home competente na mecânica (skeletons exemplares, KPIs por papel) construída sobre duas dívidas: a identidade visual prometida (navy) não existe na página, e a camada de erro simplesmente não existe — qualquer falha de rede vira "tudo em dia". A maior oportunidade é fazer a home responder "o que eu preciso fazer agora" por papel, com o mobile funcionando.

## What's Working

1. **Disciplina de skeleton por painel** — todos os 6 painéis têm skeleton dimensionalmente fiel ao conteúdo (RankingPanel.tsx:157-173; `meta.skeleton` por coluna em HomeTasksPanel.tsx:258-267). Raro de ver bem feito.
2. **Amarelo genuinamente cirúrgico na página viva** — dia atual (HomeCalendarPanel.tsx:83), contador de pendências (PendenciasPanel.tsx:86), badge "sua liga" (RankingPanel.tsx:238). Exatamente o papel que o PRODUCT.md pede.
3. **KPIs por papel** (useHomeKpis.ts:116-183) — staff vê agregados, diretor vê a própria liga, membro vê presença/tarefas pessoais, sem UI extra.

## Priority Issues

1. **[P1] Layout não responsivo quebra o mobile inteiro** — `grid-cols-2`/`grid-cols-4` fixos e alturas travadas (HomeDashboard.tsx:24,29; KpiStrip.tsx:26,43). Membro e líder são explicitamente mobile no PRODUCT.md; em 375px cada painel fica com ~160px. Fix: `grid-cols-1 lg:grid-cols-2`, `grid-cols-2 md:grid-cols-4`, `min-h` em vez de `h` fixa. Comando: /impeccable adapt
2. **[P1] Falha silenciosa sistêmica: erro renderiza como sucesso vazio** — useHomeData.ts:75-77 engole exceções; todos os painéis tratam `!res.ok` como `[]`. Um 500 mostra "Tudo em dia por aqui." para a coordenação — o momento de maior risco é o menos sinalizado. Fix: estado `error` por painel com mensagem + "Tentar novamente". Comando: /impeccable harden
3. **[P1] Conclusão otimista de tarefa sem rollback nem undo** — HomeTasksPanel.tsx:143-152 remove a linha antes do PATCH e ignora o resultado. Fix: rollback em falha + toast com "Desfazer". Comando: /impeccable harden
4. **[P2] Contraste abaixo de AA em texto funcional** — títulos de painel `text-foreground/40` (≈2.2:1 dark, ≈2.8:1 light), weekdays `/30` a 10px, metadados `/40-/50` a 10-11px. São rótulos, não decoração. Fix: piso `/60-/70` para texto informativo e ≥11px. Comando: /impeccable polish
5. **[P2] Teclado/AT: foco removido e estado não anunciado** — `focus:outline-none` sem substituto (HomeCalendarPanel.tsx:75); conclusão de tarefa não anunciada; cor como único canal nos dots do calendário; `animate-pulse` sem `motion-reduce`. Fix: `focus-visible:ring-2`, `aria-live="polite"`, texto alternativo por dia, `motion-reduce:animate-none`. Comando: /impeccable audit

## Persona Red Flags

**Alex (power user, staff)**: sem atalhos na home; CommandMenu existe mas painéis não se integram; concluir 10 tarefas = 10 cliques com um fetch cada; filtros evaporam a cada visita; `/api/tarefas` buscado 2× (useHomeKpis.ts:80 e HomeTasksPanel.tsx:133).

**Sam (leitor de tela / teclado)**: foco invisível no calendário (HomeCalendarPanel.tsx:75); linha de tarefa some do DOM sem anúncio; painéis sem landmarks; cor de categoria é o único canal nos dots do calendário.

**Marina (líder de liga, mobile)**: home inutilizável no celular (issue P1); PendenciasPanel — o painel mais importante para ela — está abaixo do fold, com 260px fixos, scroll interno e é o único painel sem link "Ver todas"; `/api/pendencias` não recebe `liga_id`.

## Minor Observations

- `capitalize` na data capitaliza todas as palavras ("7 De Julho") — HomeHeader.tsx:58.
- Pódio por opacidade invertido: 3º lugar menos visível que o 1º e `/30` falha contraste (RankingPanel.tsx:69-73).
- "Em andamento" é violeta num painel e laranja `#F59E42` noutro — mesmo conceito, duas cores.
- `border-[#191919]` hardcoded no v1 — quebra em light mode.
- index.css:313-317 zera borda de qualquer `.rounded-xl.border.bg-card` globalmente — seletor estrutural frágil.
- `.hover-3d` (116 linhas) e `.glass-card` órfãos; ChartPanel/RankPanel mortos; aspas desbalanceadas em tailwind.config.ts:80-81 (`'IBM Plex Sans"'`); "Share" → "Participação".
- Identidade: `--primary` é preto e `font-display` é Inter, enquanto CLAUDE.md promete navy e Aeonik — o navy só existe na sidebar light.

## Questions to Consider

1. O `v1/` é passado ou futuro? Manter duas homes paralelas custa consistência todos os dias.
2. Onde está o navy? Na prática o produto virou um app dark neutro — oficializar (atualizar tokens/CLAUDE.md) ou reverter?
3. Para a Marina, a resposta de "o que fazer agora" está em Pendências — por que a hierarquia é KPI → calendário → ranking → pendências e não o inverso por papel?
