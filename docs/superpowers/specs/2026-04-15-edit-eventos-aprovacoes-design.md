# Design: Edição de Eventos na Agenda + Aprovações Pendentes no SuperAdmin

**Data:** 2026-04-15  
**Branch:** feature/pages  
**Status:** Aprovado

---

## Contexto

A plataforma já tem o fluxo de criação de eventos com aprovação (categorias "evento" e "hub" requerem aprovação do staff antes de serem publicados). Porém faltam duas peças:

1. **Interface de edição de eventos na Agenda** — diretores precisam poder editar eventos da própria liga, e o staff qualquer evento. A lógica de backend já existe, mas a UI de edição precisa ser finalizada e o comportamento de re-aprovação corrigido.

2. **Aba de aprovações no SuperAdmin** — a seção de aprovações pendentes existe mas é condicional (some quando vazia) e não tem destaque visual. O staff precisa de uma aba dedicada sempre visível para gerenciar aprovações de projetos e eventos.

---

## Arquitetura

### Backend

**Arquivo:** `apps/api/src/routes/eventos.ts`

**Mudança:** `PATCH /eventos/:id` — corrigir lógica de `status_aprovacao` ao editar.

Regra atual (incorreta): preserva o status existente quando `requer_aprovacao = true`.  
Regra nova:
- **Staff edita:** preserva `status_aprovacao` existente (não interrompe o fluxo)
- **Diretor edita:** se `requer_aprovacao = true`, sempre reseta para `"pendente"` — a edição resubmete para aprovação

```ts
// Linha ~100 em eventos.ts
const status_aprovacao = requer_aprovacao
  ? (user.role === "staff" ? (eventoAtual.status_aprovacao ?? "pendente") : "pendente")
  : null;
```

Controle de acesso já implementado: diretor só acessa eventos da própria liga via `lider_id`.

---

### Frontend — AgendaPage

**Arquivo:** `apps/web/src/pages/agenda/AgendaPage.tsx`

A estrutura de edit (modal, estado, handler) já está no código unstaged. Os ajustes são:

**1. Aviso de re-submissão no modal de edição**

Quando `eventoEditando.status_aprovacao === "aprovado"` e a categoria é "evento" ou "hub", exibir aviso:

> "Esta edição irá resubmeter o evento para aprovação do staff."

Usar a mesma classe visual do aviso de criação (`bg-brand-yellow/15 border-brand-yellow/40`).

**2. Badge de status nos eventos**

Mostrar badge apenas para `status_aprovacao` relevantes — não poluir eventos sem aprovação:

| Status | Visual | Onde mostrar |
|--------|--------|--------------|
| `pendente` | Dot amarelo + texto "pendente" | Sidebar do evento (painel lateral) |
| `rejeitado` | Dot vermelho + texto "rejeitado" | Sidebar do evento (painel lateral) |
| `aprovado` | Sem badge | — (não poluir UI) |
| `null` | Sem badge | — |

No pill do calendário (grade): apenas um pequeno dot colorido no canto do pill quando `pendente` ou `rejeitado` (espaço é limitado).

**3. Botões de editar/excluir**

Já renderizados via `podeGerenciarEvento(evento)` no painel lateral. Nenhuma mudança necessária.

---

### Frontend — SuperAdminPage

**Arquivo:** `apps/web/src/pages/super-admin/SuperAdminPage.tsx`

**Nova estrutura:**

```
┌─────────────────────────────────────────┐
│  Super Admin                            │
│  Stats (4 cards) — sempre visíveis      │
├─────────────────────────────────────────┤
│  [ Ligas ] [ Aprovações (N) ] [Usuários]│  ← Tabs
├─────────────────────────────────────────┤
│  Conteúdo da tab ativa                  │
└─────────────────────────────────────────┘
```

- Stats ficam **fora** das tabs (sempre visíveis no topo)
- Tab **Ligas**: conteúdo atual da seção "Gestão de Ligas"
- Tab **Aprovações (N)**: tabela de pendentes, sempre visível; badge com contagem atualiza dinamicamente; empty state quando não há itens
- Tab **Usuários**: conteúdo atual da seção "Gestão de Usuários"

**Componente de Tabs:** instalar `shadcn/ui Tabs` via:
```bash
cd apps/web && pnpm dlx shadcn@latest add tabs
```

Gera `apps/web/src/components/ui/tabs.tsx`.

**Empty state da aba de Aprovações:**
```tsx
<div className="px-6 py-12 flex flex-col items-center gap-2 text-center">
  <CheckCircle2 className="w-8 h-8 text-muted-foreground/30" />
  <p className="text-sm font-medium text-navy">Nenhuma aprovação pendente</p>
  <p className="text-xs text-muted-foreground">Tudo em dia!</p>
</div>
```

---

## Arquivos Afetados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `apps/api/src/routes/eventos.ts` | Fix: lógica de `status_aprovacao` no PATCH (1 linha) |
| `apps/web/src/pages/agenda/AgendaPage.tsx` | Fix: aviso de re-submissão no modal de edição + badges de status |
| `apps/web/src/pages/super-admin/SuperAdminPage.tsx` | Refactor: adicionar tabs, mover seções para dentro das tabs |
| `apps/web/src/components/ui/tabs.tsx` | Novo: gerado pelo shadcn/ui |

Nenhum novo tipo, rota de API ou pacote compartilhado precisa ser criado.

---

## Verificação

1. **Edição por diretor:** Logar como diretor → abrir um evento da própria liga no calendário → clicar Editar → salvar → confirmar que evento volta para status "pendente" no SuperAdmin
2. **Edição por staff:** Logar como staff → editar um evento aprovado → confirmar que status permanece "aprovado"
3. **Restrição de liga:** Logar como diretor → tentar editar evento de outra liga → confirmar que botão não aparece
4. **Badge de status:** Criar evento tipo "evento" como diretor → verificar badge "pendente" no sidebar da agenda
5. **Tabs no SuperAdmin:** Logar como staff → navegar pelas 3 tabs → confirmar que "Aprovações" mostra empty state quando vazia e contagem correta quando há pendentes
