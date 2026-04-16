# Redesign da Página Home — Spec

**Data:** 2026-04-16
**Status:** Aprovado

---

## Contexto

A página `HomePage.tsx` (809 linhas) está funcional e role-aware, mas o design visual está aquém do padrão desejado. O objetivo é elevar a aparência para um nível mais refinado e profissional, mantendo **todas** as seções e funcionalidades existentes — apenas redesenhando os componentes.

---

## Decisões de Design

| Dimensão | Decisão |
|---|---|
| Layout | Dashboard Moderno — KPI cards no topo + tabela paginada |
| Visões por papel | Separadas (staff / diretor / professor / membro) |
| Tom visual | Corporativo Premium (estilo Linear/Notion) |
| Fundo | `#f8fafc` (bg-slate-50) na área de conteúdo |
| Cards | Fundo branco, `border border-border`, `shadow-sm` |
| Tipografia de labels | `uppercase tracking-wide text-xs text-muted-foreground` |
| Badges | Com borda colorida (`border`), não só fundo sólido |
| Loading | Skeleton nos KPI cards e nas linhas da tabela |
| Paginação | Componente `Pagination` do shadcn |

---

## Componentes shadcn a instalar

| Componente | Uso |
|---|---|
| `table` | Tabela de projetos/eventos em todas as visões |
| `pagination` | Paginação da tabela |
| `progress` | Barra de progresso nos projetos |

Já instalados e a usar: `skeleton`, `dropdown-menu`, `tabs`, `card`, `badge`, `button`, `separator`.

---

## Estrutura Global (todos os papéis)

### Header da Página
```
Olá, {nome}                          [Badge: Papel]
Quarta, 16 de Abril · Liga de Finanças
```
- Saudação com `font-display font-bold text-2xl text-navy`
- Data atual formatada à direita com badge de papel
- Skeleton sobre o nome enquanto `user` não está disponível

### KPI Cards
- Grid de 4 colunas (`grid-cols-4 gap-4`)
- Cada card: `<Card>` com `shadow-sm border`
- Conteúdo: valor grande (`text-3xl font-bold text-navy`) + label uppercase + indicador de trend (↑ verde / ↓ vermelho / ↔ amber)
- Estado de skeleton: `<Skeleton className="h-8 w-20" />` + `<Skeleton className="h-3 w-28 mt-2" />`

---

## Visão Staff

### KPI Cards (4)
1. Ligas Ativas
2. Total de Membros
3. Projetos Ativos
4. Engajamento Global (%)

### Tabela de Projetos (paginada)
- **Colunas:** Projeto, Liga, Status, Progresso, Prazo
- **Filtro:** `<DropdownMenu>` "Todas as Ligas" — lista todas as ligas disponíveis
- **Status:** `<Badge variant="outline">` com cor por status:
  - `aprovado` → verde
  - `em_revisao` → amarelo
  - `em_andamento` → azul
  - `rejeitado` → vermelho
- **Progresso:** `<Progress value={percentual} className="h-1.5" />`
- **Paginação:** 10 itens por página, `<Pagination>` no rodapé da tabela
- **Skeleton rows:** 3 linhas skeleton enquanto carrega

### Seção Alertas
- Lista vertical com ícone colorido (ponto) + texto descritivo
- Categorias: urgente (vermelho), atenção (âmbar), info (azul), ok (verde)
- Itens: baixo engajamento de ligas, aprovações pendentes de projetos e eventos

### Ranking de Presença
- Tabela compacta: Liga, Membros, Presença %
- `<Progress>` colorida: vermelho se < 50%, âmbar se < 70%, verde se ≥ 70%

### Highlights da Semana
- 3 `<Card>` em linha horizontal
- Ícone Lucide + título + valor em destaque

---

## Visão Diretor

### Toggle Minha Liga / Visão Global
- `<Tabs defaultValue="minha-liga">` com `TabsList` + `TabsTrigger`

### KPI Cards (4)
1. Projetos da Liga
2. Receita
3. Membros
4. Score da Liga

### Tabela de Projetos (paginada)
- **Colunas:** Projeto, Responsável, Status, Progresso, Prazo
- **Filtro:** `<DropdownMenu>` por Status
- Mesmos padrões de badge/progress do staff
- 10 itens por página

### Card "Próxima Sala Reservada"
- `<Card>` inline ao lado dos KPIs ou abaixo deles
- Exibe: número da sala, título da reserva, horário de início/fim
- Ícone `MapPin` do Lucide
- Se não houver reserva: estado vazio com texto `"Sem reservas próximas"`

### Ranking Geral de Ligas
- Tabela: posição (#), Liga, Score, `<Progress value={score/100 * 100} />`
- Liga do diretor destacada com `bg-navy/5 font-medium`

---

## Visão Professor

### KPI Cards (4)
1. Score da Liga
2. Projetos Ativos
3. Membros
4. Frequência (%)

### Tabela de Aprovações (paginada)
- **Colunas:** Projeto, Liga, Aguardando (dias), Ação
- **Filtro:** `<DropdownMenu>` por Liga
- **Badge de urgência:** vermelho com borda se dias > 7, âmbar se 4–7, cinza se ≤ 3
- **Coluna Ação:** `<Button size="sm" variant="outline">Revisar</Button>`
- 10 itens por página

### Próximos Eventos da Liga
- Lista vertical de cards compactos
- Cada item: data formatada (ex: "Qui, 18 Abr") + título + hora + categoria badge

---

## Visão Membro

### KPI Cards (4)
1. Meu Score
2. Minha Presença (%)
3. Projetos da Liga
4. Próxima Reunião (data)

### Tabela de Projetos da Liga (somente leitura, paginada)
- **Colunas:** Projeto, Responsável, Status, Progresso
- Sem filtro de dropdown (membro só vê sua liga)
- 10 itens por página

### Ranking Geral de Ligas
- Mesma tabela da visão diretor
- Liga do membro destacada com `bg-navy/5 font-medium`

---

## Carrossel de Ligas (Global)

- Redesenhado com cards mais refinados
- Fundo `bg-navy` com texto branco, borda sutil
- Informações: nome, líder, projetos ativos
- Controles de navegação (chevron) com `hover:bg-white/10` arredondado
- Auto-rotação a cada 4s (mantido)

---

## Padrões de Implementação

### Skeleton Loading
```tsx
// KPI card em loading
<Card className="shadow-sm">
  <CardContent className="pt-6">
    <Skeleton className="h-8 w-20 mb-2" />
    <Skeleton className="h-3 w-28" />
  </CardContent>
</Card>
```

### Badge de Status
```tsx
const statusConfig = {
  aprovado:     { label: 'Aprovado',    className: 'border-green-300 text-green-700 bg-green-50' },
  em_andamento: { label: 'Andamento',   className: 'border-blue-300 text-blue-700 bg-blue-50' },
  em_aprovacao: { label: 'Revisão',     className: 'border-amber-300 text-amber-700 bg-amber-50' },
  rejeitado:    { label: 'Rejeitado',   className: 'border-red-300 text-red-700 bg-red-50' },
  concluido:    { label: 'Concluído',   className: 'border-navy/30 text-navy bg-navy/5' },
}
```

### Paginação
```tsx
// Estado: const [page, setPage] = useState(1); const PER_PAGE = 10;
// Slice: items.slice((page-1)*PER_PAGE, page*PER_PAGE)
// Componente: <Pagination> no rodapé da tabela
```

### Dropdown Filtro
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      {filtroAtual} <ChevronDown className="ml-2 h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {opcoes.map(op => <DropdownMenuItem key={op}>{op}</DropdownMenuItem>)}
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `apps/web/src/pages/home/HomePage.tsx` | Redesign completo (arquivo principal) |
| `packages/types/src/projeto.ts` | Verificar se tipos cobrem todos os campos usados |

## Componentes shadcn a instalar (via `pnpm dlx shadcn@latest add`)

```bash
cd apps/web
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add pagination
pnpm dlx shadcn@latest add progress
```

---

## Verificação

1. Rodar `pnpm dev` e abrir `http://localhost:3000/home`
2. Testar cada papel: staff, diretor, professor, membro (trocar via Supabase ou mock)
3. Verificar skeleton loading (simular latência de rede ou remover dados temporariamente)
4. Testar paginação com > 10 itens
5. Testar dropdown de filtros em staff e diretor
6. Verificar responsividade em tela menor (sidebar colapsada)
7. Rodar `pnpm typecheck` — zero erros
