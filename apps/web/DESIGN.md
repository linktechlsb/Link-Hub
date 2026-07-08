---
name: Link Leagues Platform
description: Sistema de gestão das ligas acadêmicas da Link — navy institucional na sidebar, superfícies neutras, amarelo cirúrgico.
colors:
  navy-institucional: "#10284E"
  navy-sidebar-claro: "#10254D"
  link-blue: "#546484"
  amarelo-de-servico: "#FEC641"
  papel-branco: "#FFFFFF"
  superficie-clara: "#F5F5F5"
  tinta: "#0A0A0A"
  cinza-texto: "#737373"
  borda-clara: "#E4E4E4"
  noite-navy: "#1A1C1F"
  superficie-noturna: "#1F2224"
  borda-noturna: "#2B2D31"
  sidebar-noturna: "#1C1E22"
  sucesso: "#10B981"
  info: "#8B5CF6"
  alerta: "#EAB308"
  erro: "#EF4444"
  destrutivo-claro: "#EF4444"
  destrutivo-escuro: "#D92D20"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Inter, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel-branco}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.papel-branco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.papel-branco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  card-dashboard:
    backgroundColor: "{colors.superficie-clara}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    padding: "20px"
  badge-status:
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: Link Leagues Platform

## 1. Overview

**Creative North Star: "A Secretaria Impecável"**

Uma secretaria de faculdade de negócios que funciona: tudo tem lugar, nada grita, e quem chega resolve o que veio resolver. A interface é institucional, confiável e organizada — densidade é bem-vinda em tabelas e listas, a ênfase vem de peso e tamanho tipográfico, e a ferramenta desaparece na tarefa. A identidade da marca não se espalha pelo conteúdo: o navy mora na sidebar, o amarelo aparece só onde há informação de estado, e todo o resto é neutro para deixar os dados falarem.

Este sistema rejeita explicitamente a estética de rede social e app de consumo: sem excesso de cor, sem emojis na UI, sem streaks chamativos, sem gradientes decorativos, sem cards-métricos gigantes de template SaaS e sem motion coreografado em carregamento de página. Mesmo o ranking é gestão, não gamificação.

**Key Characteristics:**

- Superfícies de conteúdo 100% neutras; marca concentrada na sidebar (navy) e em destaques pontuais (amarelo)
- Dark e light mode de primeira classe, com os mesmos pisos de contraste (WCAG AA), com transição circular (view transition) ao alternar tema
- Separação por tom de superfície, não por sombra — sistema flat
- Todo estado existe: skeleton fiel ao conteúdo, vazio que ensina, erro com "Tentar novamente"
- Microcopy em português brasileiro, imperativo educado

## 2. Colors

Estratégia contida: neutros dominam, um navy institucional carrega a identidade na navegação e um amarelo único pontua estado — nunca decoração.

### Primary

- **Navy Institucional** (`#10284E` / sidebar claro real `#10254D`, hsl 219 66% 18%): a cor da marca. No tema claro é o fundo da sidebar e nada mais — não vaza para botões, headings ou cards do conteúdo. No tema escuro, sobrevive como matiz: todos os neutros escuros são tingidos com hue 220 em croma baixo.
- **Tinta** (`#0A0A0A`, hsl 0 0% 4%): o "primary" funcional do conteúdo — botões primários, texto de corpo, foco. No dark inverte para branco (hsl 0 0% 100%).

### Secondary

- **Link Blue** (`#546484`): apoio institucional, usado com parcimônia em títulos de seção legados. Variantes light (`#6d7f9e`) e dark (`#3d4d6b`).
- **Amarelo de Serviço** (`#FEC641`): o único acento vivo do conteúdo. Aparece apenas onde carrega informação: o círculo do dia atual no calendário, o contador de pendências, o badge "Sua liga" (gradiente `135deg, #FEC641 → #F0A500` com texto `#10284E`), o 1º lugar do ranking (dark). Sobre fundo sólido, texto escuro `#1C1C1C` (10.9:1).

### Neutral

- **Papel Branco** (`#FFFFFF`, hsl 0 0% 100%): fundo do tema claro.
- **Superfície Clara** (`#F5F5F5`, hsl 0 0% 96.1%): cards no claro — a separação vem deste tom sobre o branco, sem borda (border explicitamente transparente) e sem sombra.
- **Cinza Texto** (`#737373`, hsl 0 0% 45%): texto secundário no claro (`muted-foreground`, ~4.6:1 sobre branco).
- **Borda Clara** (`#E4E4E4`, hsl 0 0% 89.4%): divisórias e inputs no claro.
- **Noite Navy** (`#1A1C1F`, hsl 220 8% 11%): fundo do tema escuro — cinza tingido de navy, imperceptível como azul, inconfundível como Link.
- **Superfície Noturna** (`#1F2224`, hsl 220 7% 13%): cards e popovers no escuro, com borda hairline (`#2B2D31`) porque 13% sobre 11% sozinho não separa.
- **Borda Noturna** (`#2B2D31`, hsl 220 6% 18%): borda, input, muted, secondary e accent do escuro — um único degrau para tudo que é estrutura.
- **Sidebar Noturna** (`#1C1E22`, hsl 220 10% 12%): a sidebar no escuro leva um passo a mais de croma que o conteúdo — o navy continua sendo dela.

### Semantic

- **Sucesso** (emerald `#10B981`), **Info** (violeta `#8B5CF6`), **Alerta** (âmbar `#EAB308`), **Erro/Destrutivo** (vermelho, `#EF4444` claro / `#D92D20` escuro). Em badges de status, a fórmula é fixa: fundo `{cor}-500` a 10% de alpha + texto `{cor}-600` no claro / `{cor}-300` no escuro.

### Named Rules

**A Regra do Navy na Sidebar.** O navy `#10284E` vive na sidebar e em mais lugar nenhum do tema claro. Se um botão, heading ou card do conteúdo aparecer navy, está errado.

**A Regra do Amarelo Cirúrgico.** O amarelo `#FEC641` só aparece colado a uma informação de estado (hoje, pendência, sua liga, 1º lugar). Amarelo como decoração — glow, gradiente de fundo, seção inteira — é proibido; a única exceção documentada é o badge "Minha" (gradiente pontual, não um fundo).

**A Regra do Piso /60.** Texto que carrega informação nunca desce de 60% de opacidade do foreground nem de 11px. Opacidades 30–50% são reservadas a elementos decorativos `aria-hidden` e weekdays de calendário (piso 50%).

## 3. Typography

**Display Font:** Inter (variable, 300–700)
**Body Font:** Inter (a mesma família — uma voz só)
**Label/Mono Font:** IBM Plex Mono (dados tabulares e contextos monoespaçados pontuais)

**Character:** Uma única sans neutra e trabalhadora em múltiplos pesos. A hierarquia vem de peso e tamanho, nunca de cor extra ou de uma segunda família. Escala fixa em rem (registro de produto — nada de clamp fluido em UI).

### Hierarchy

- **Display** (700, 1.5rem/24px): título de página ("Olá, {Nome}"). Um por tela.
- **Headline** (700, 1.875rem/30px): números de destaque — KPIs, posição no ranking. Sempre `tabular-nums` quando comparável em coluna.
- **Title** (500–600, 0.75rem/12px, foreground a 70%): títulos de painel ("Calendário", "Pendências"). Discretos, mas nunca abaixo de 70% de opacidade.
- **Body** (400, 0.875rem/14px): texto de corpo, células de tabela. Máximo 65–75ch em prosa.
- **Label** (500, 0.75rem/12px): labels de KPI, badges, botões pequenos. Metadados descem a 11px a 60% — nunca menos.

### Named Rules

**A Regra da Voz Única.** Inter carrega tudo. Não introduza segunda família de display; o `font-plex-*` existe apenas para dados monoespaçados.

## 4. Elevation

Sistema **flat**: profundidade por tom de superfície, não por sombra. No tema claro, um card é `#F5F5F5` sobre `#FFFFFF` — sem borda e sem box-shadow. No tema escuro, a diferença tonal (13% sobre 11%) é insuficiente sozinha, então a hierarquia inverte: cards ganham borda hairline `#2B2D31` de 1px. Popovers e dropdowns são a única exceção de sombra, herdada dos componentes shadcn/ui, e devem permanecer discretos. Alternar entre claro e escuro dispara uma transição circular (`view-transition`, 0.45s, `cubic-bezier(0.22, 1, 0.36, 1)`), desativada sob `prefers-reduced-motion`.

### Named Rules

**A Regra Flat.** Nenhuma superfície em repouso tem sombra. Se um card precisa se destacar, o caminho é tom de fundo (claro) ou borda hairline (escuro) — nunca `box-shadow` decorativo, nunca glassmorphism.

## 5. Components

Vocabulário shadcn/ui + Radix, ícones exclusivamente Lucide (14–16px em contexto denso). Consistência entre os ~19 módulos é lei: se dois "Salvar" diferem, um está errado.

### Buttons

- **Shape:** cantos suavemente arredondados (6px, `rounded-md`), altura 40px (`h-10`) no default, 36px (`h-9`) no `sm`, 44px (`h-11`) no `lg`.
- **Primary:** fundo tinta `#0A0A0A` (branco no dark), texto invertido, `hover:bg-primary/90`.
- **Outline:** borda `border-input`, fundo do tema, `hover:bg-accent`.
- **Secondary:** fundo `secondary` (`#F5F5F5` claro), `hover:bg-secondary/80`.
- **Hover / Focus:** transição de cor (`transition-colors`); foco sempre `focus-visible:ring-2 ring-ring ring-offset-2` — nunca remova o outline sem substituto.
- **Ghost / Destructive / Link:** disponíveis; destructive só para ações irreversíveis, sempre com confirmação ou undo.
- **Disabled:** `opacity-50`, `pointer-events-none`.

### Chips

- **Style (badge de status):** pílula (`rounded-full`), padding `2.5px 10px`, texto 12px peso 600. Variante `default` usa `bg-primary`; variantes semânticas de status usam fundo `{cor}-500` a 10% de alpha + texto `{cor}-600` claro / `{cor}-300` escuro, borda transparente.
- **State:** a mesma cor significa o mesmo estado em todos os módulos — "Em andamento" é violeta em qualquer tela.

### Cards / Containers

- **Corner Style:** 8px (`rounded-lg`) padrão do shadcn/ui; 12px (`rounded-xl`) em painéis de dashboard.
- **Background:** `#F5F5F5` claro / `#1F2224` escuro (`bg-card`).
- **Shadow Strategy:** nenhuma (ver Elevation).
- **Border:** transparente no claro (regra global que zera a borda de `.rounded-lg.border.bg-card`); hairline `#2B2D31` no escuro (restaurada explicitamente, pois a diferença tonal sozinha não separa).
- **Internal Padding:** 24px de header/content (`p-6`) no shadcn padrão; 20px (`p-5`) em cards de dashboard mais densos.

### Inputs / Fields

- **Style:** 40px de altura (`h-10`), raio 6px, borda `border-input`, fundo do tema, placeholder em `muted-foreground`.
- **Focus:** `focus-visible:ring-2 ring-ring ring-offset-2`.
- **Error / Disabled:** disabled a 50% de opacidade com `cursor-not-allowed`; erro via texto semântico, não só cor.

### Navigation

- **Sidebar:** navy `#10254D` no claro (texto branco; `text-muted-foreground` dentro da sidebar sobe para 60% de branco, já que o token `muted-foreground` padrão não teria contraste sobre navy), `#1C1E22` no escuro. Item ativo: fundo `sidebar-accent` (claro) / cor do card (escuro, `.dark [data-active="true"]` usa `bg-card`). Labels de grupo em uppercase 9.6px (`0.6rem`), tracking 0.12em, branco a 50% no escuro (piso AA, documentado no CSS: 0.22 ficava em 2:1). Colapsável para ícones; `CommandMenu` (⌘K) no header como navegação paralela.

### Feedback (assinatura)

- **Toasts (sonner, top-right, richColors):** toda mutação responde — sucesso com "Desfazer" quando a ação é reversível, erro com instrução. Skeletons replicam a forma real do conteúdo (nunca spinner centralizado). Estados vazios ensinam o que apareceria ali. Estados de erro oferecem "Tentar novamente".

## 6. Do's and Don'ts

### Do:

- **Do** manter o navy `#10284E`/`#10254D` exclusivamente na sidebar do tema claro; no escuro, ele vive como tint (hue 220) dos neutros.
- **Do** usar o amarelo `#FEC641` apenas colado a informação de estado — dia atual, contadores de pendência, "Sua liga", 1º lugar.
- **Do** respeitar os pisos: texto informativo ≥ 60% de opacidade e ≥ 11px; componentes de UI interativos ≥ 3:1 de contraste; corpo ≥ 4.5:1.
- **Do** entregar os quatro estados de toda tela: skeleton fiel, vazio que ensina, erro com retry, disabled.
- **Do** usar `focus-visible:ring-2 ring-ring` em todo interativo e `tabular-nums` em todo número comparável.
- **Do** escrever microcopy em PT-BR no imperativo educado ("Registre a presença") e traduzir tudo — "Share" não existe, "Partic." sim.
- **Do** respeitar `prefers-reduced-motion` em toda animação (padrão já praticado na view transition do dark mode).

### Don't:

- **Don't** usar estética de "rede social / app de consumo": excesso de cor, emojis na UI, streaks chamativos ou informalidade forçada (anti-referência do PRODUCT.md, verbatim).
- **Don't** usar gradientes decorativos, glows de marca no fundo, glassmorphism ou "cards-métricos gigantes de template SaaS".
- **Don't** usar motion coreografado em carregamento de página, nem `animate-pulse` decorativo perpétuo — motion só comunica estado, 150–250ms, ease-out.
- **Don't** usar `border-left`/`border-right` maior que 1px como faixa colorida de acento em cards, alertas ou listas.
- **Don't** remover `outline`/foco sem substituto visível, nem depender de cor como único canal de informação (dots de categoria precisam de texto acessível).
- **Don't** hardcodar hex fora dos tokens — as exceções documentadas são o par texto-sobre-amarelo (`#1C1C1C` sobre `#FEC641`) e o gradiente do badge "Minha" (`#FEC641 → #F0A500`).
- **Don't** deixar mutação sem feedback: ação otimista sem rollback + toast é bug de design, não de código.
