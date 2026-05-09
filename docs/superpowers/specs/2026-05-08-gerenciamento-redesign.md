# Gerenciamento Page Redesign

**Data:** 2026-05-08
**Escopo:** `GerenciamentoPage` (view Lider/Diretor) + `GerenciamentoStaffPage` (view Staff)
**Referências de design:** LigasPage, FormulariosPage, ProjetosStaffView

---

## Decisões de Design

| Decisão               | Escolha                      |
| --------------------- | ---------------------------- |
| Navegação de abas     | Underline tabs (atual)       |
| Layout de conteúdo    | `SectionHeader` + tabela     |
| Formulários de adição | Sheet lateral                |
| KPI cards             | `KpiRow` de `primitives.tsx` |

---

## Shell da Página

Aplica-se às duas views sem alteração estrutural:

- **Wrapper:** `max-w-5xl mx-auto px-8 py-10`
- **Cabeçalho:** `font-display font-bold text-[22px] tracking-[-0.02em] text-navy` + subtítulo `font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50`
- **Tabs:** `border-b border-navy/15`, aba ativa com `border-navy text-navy border-b-2`, inativa com `text-navy/40 hover:text-navy border-transparent`
- **Seletor de liga (Staff):** mantém dropdown atual, substitui `bg-white` por `bg-background`

---

## Padrão de Aba

Cada aba segue este padrão:

```
SectionHeader titulo="Nome da Aba" acao={<button rounded-full>+ Ação</button>}
<table border-collapse>
  <thead> colunas com font-plex-mono text-[10px] uppercase text-navy/40 </thead>
  <tbody> linhas com hover:bg-navy/[0.02], border-b border-foreground/[0.06] </tbody>
</table>
```

Botão de ação primário: `border border-foreground/40 rounded-full px-3 py-1.5 text-[11px] font-plex-mono uppercase hover:bg-navy hover:text-white`

---

## Aba Membros

**Lista:**

- Tabela com colunas: **Nome** (avatar + nome + email), **Cargo** (badge), **Ações** (DropdownMenu)
- Avatar: `h-8 w-8` quadrado com iniciais ou foto, cor gerada por nome
- Badge de cargo: rounded-full — `bg-purple-100 text-purple-700` (Diretor), `bg-gray-100 text-gray-600` (Membro), `bg-red-100 text-red-700` (Admin)
- Ações via `DropdownMenu` (shadcn/ui): Editar cargo, Remover (com confirmação inline na linha)

**Sheet "Adicionar Membro":**

- Campo: E-mail institucional
- Select: Cargo (Membro / Diretor)
- Botão: "Adicionar" (navy)

---

## Aba Informações

Remove as caixas `border border-navy/15 p-5`. As seções são separadas por `SectionHeader`:

- `SectionHeader` "Dados Gerais" → campos: Nome, Área, Descrição, Semestre de fundação
- `SectionHeader` "Foto / Banner" → upload de imagem (mantém lógica atual)
- `SectionHeader` "Contatos" → campos: E-mail, Instagram, LinkedIn
- (Staff only) `SectionHeader` "Professor Mentor" → campo único
- (Staff only) `SectionHeader` "Zona de Perigo" → botão Arquivar liga

**Botão salvar:** aparece no header da aba (ao lado do título) como badge/botão rounded-full `Salvar alterações` quando `alterado === true`. Não fica fixo no rodapé.

---

## Aba Recursos

**Lista:**

- Tabela com colunas: **Recurso** (ícone colorido 8×8 + nome + tipo), **URL** (truncada, monoespaced), **Ações** (DropdownMenu: Editar, Remover)

**Sheet "Adicionar / Editar Recurso":**

- Picker de ícone+cor (mantém componente `IconeCor` existente)
- Campo: Nome
- Select: Tipo (URL, Documento, Notion, Planilha, Apresentação, Vídeo, Outro)
- Campo / Upload: URL ou arquivo (para tipos com arquivo)
- Botão: "Salvar"

---

## Aba Receita

**KPI no topo:**

- `KpiRow` com 3 cards: Receitas (verde), Custos (vermelho), Saldo (navy ou vermelho se negativo)

**Lista de lançamentos:**

- `SectionHeader` "Lançamentos" + botão `+ Adicionar`
- Tabela com colunas: **Tipo** (badge `+Receita` verde / `−Custo` vermelho), **Descrição** + observação, **Data**, **Recorrência** (badge), **Valor**, **Ações** (remover)

**Sheet "Adicionar Lançamento":**

- Toggle Receita/Custo (2 botões com borda)
- Select recorrência
- Campo descrição
- Campo observação (opcional)
- Valor + Data
- Botão "Adicionar"

---

## Aba Presença

`AbaPresenca` é um componente isolado — a lógica interna não muda. Aplica-se:

- `SectionHeader` para os headers de cada sub-seção (lista de eventos, grid de membros)
- Botão `+ Novo Evento` rounded-full no lugar do botão atual
- Badges de status: rounded-full (Presente = verde, Ausente = vermelho, Justificado = amarelo)

---

## Aba CRM

`AbaCRM` já usa Sheet+Dialog — mantém toda a lógica. Aplica-se:

- `SectionHeader` "Contatos" + botão `+ Adicionar` rounded-full (substitui o botão atual)
- Lista de contatos convertida para tabela: Nome, Empresa/Cargo, E-mail, Ações

---

## Aba Desempenho

**Score:**

- `Card` único com score grande (`font-display font-bold text-4xl`), badge de posição (brand-yellow), barra de progresso

**Métricas resumidas:**

- `KpiRow` com 4-5 cards: Projetos concluídos, Em andamento, Presenças, Receita total, Membros ativos

**Indicadores:**

- `Card` com barras de progresso por métrica (mantém lógica de composição do score)

**Comparativo ranking:**

- Lista em `Card` com posição, nome e barra (estilo `RankingList` de `primitives.tsx`)

---

## Componentes Reutilizados

| Componente               | Origem                         | Uso                                      |
| ------------------------ | ------------------------------ | ---------------------------------------- |
| `SectionHeader`          | `pages/home/v1/primitives.tsx` | Header de cada seção dentro das abas     |
| `KpiRow`                 | `pages/home/v1/primitives.tsx` | Receita (3 KPIs) e Desempenho (4-5 KPIs) |
| `RankingList`            | `pages/home/v1/primitives.tsx` | Comparativo de ranking na aba Desempenho |
| `DropdownMenu`           | shadcn/ui                      | Ações por linha (Editar, Remover)        |
| `Sheet` / `SheetContent` | shadcn/ui                      | Formulários de adição/edição             |
| `IconeCor`               | `GerenciamentoPage.tsx`        | Picker de ícone+cor para Recursos        |

---

## Arquivos Afetados

| Arquivo                                                       | Mudança                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx`      | Redesign completo (todas as abas)                        |
| `apps/web/src/pages/gerenciamento/GerenciamentoStaffPage.tsx` | Redesign completo (shell + abas)                         |
| `apps/web/src/pages/gerenciamento/AbaPresenca.tsx`            | Atualização visual (SectionHeader + badges rounded-full) |
| `apps/web/src/pages/gerenciamento/AbaCRM.tsx`                 | Atualização visual (SectionHeader + tabela)              |

---

## O Que Não Muda

- Toda a lógica de fetch, estado e mutações permanece intacta
- Middleware de autenticação e verificação de role
- Componente `IconeCor` reutilizado sem alteração de comportamento
- `AbaPresenca` e `AbaCRM` mantêm toda a lógica interna — só o visual é atualizado
