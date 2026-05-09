# Padronização Visual da Aba Presença — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajustar os estilos CSS da tabela matriz em `AbaPresenca.tsx` para igualar visualmente o padrão das outras abas do Gerenciamento (Membros, Recursos, Receita).

**Architecture:** Mudança puramente de CSS — sem alteração de lógica, tipos ou chamadas de API. O container `border border-navy/15` é removido e a tabela passa a usar o mesmo padrão de `border-b border-foreground/[0.08]` / `border-foreground/[0.06]` das demais abas.

**Tech Stack:** React, Tailwind CSS v3

---

### Task 1: Atualizar estilos da tabela em AbaPresenca.tsx

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/AbaPresenca.tsx`

- [ ] **Step 1: Remover o container com borda ao redor da tabela**

Em `AbaPresenca.tsx`, localizar o bloco que envolve a tabela (por volta da linha 254) e substituir:

```tsx
{
  /* Antes */
}
<div className="border border-navy/15 overflow-hidden">
  {eventosVisiveis.length === 0 ? (
    <div className="p-6">
      <p className="font-plex-sans text-[13px] text-navy/50">
        Nenhum evento cadastrado. Crie eventos na página de Agenda.
      </p>
    </div>
  ) : (
    <div className="overflow-x-auto">{/* ... tabela ... */}</div>
  )}
</div>;
```

Por:

```tsx
{
  /* Depois */
}
{
  eventosVisiveis.length === 0 ? (
    <p className="font-plex-sans text-[13px] text-navy/40">
      Nenhum evento cadastrado. Crie eventos na página de Agenda.
    </p>
  ) : (
    <div className="overflow-x-auto">{/* ... tabela ... */}</div>
  );
}
```

- [ ] **Step 2: Atualizar o cabeçalho da tabela (`<thead><tr>` e `<th>`)**

Substituir:

```tsx
<thead>
  <tr className="bg-navy/[0.02] border-b border-navy/15">
    <th className="text-left font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 px-4 py-3 sticky left-0 bg-navy/[0.02] z-10">
      Membro
    </th>
    {eventosVisiveis.map((e) => (
      <th
        key={e.id}
        className="text-center font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 px-2 py-3 whitespace-nowrap"
        title={e.titulo}
      >
```

Por:

```tsx
<thead>
  <tr className="border-b border-foreground/[0.08]">
    <th className="text-left font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal px-4 py-3 sticky left-0 bg-background z-10">
      Membro
    </th>
    {eventosVisiveis.map((e) => (
      <th
        key={e.id}
        className="text-center font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal px-2 py-3 whitespace-nowrap"
        title={e.titulo}
      >
```

- [ ] **Step 3: Atualizar as linhas do `<tbody>` (membros)**

Substituir:

```tsx
membros.map((m) => (
  <tr key={m.usuario_id} className="border-b border-navy/10 last:border-0">
    <td className="px-4 py-2.5 font-plex-sans text-[13px] font-medium text-navy whitespace-nowrap sticky left-0 bg-white">
      {m.nome}
    </td>
    {eventosVisiveis.map((e) => {
      const reg = matriz.get(m.usuario_id)?.get(e.id);
      const status = reg?.status ?? null;
      return (
        <td key={e.id} className="px-2 py-2.5 text-center">
          {status ? (
            <span
              className={cn(
                "inline-block font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5 rounded-full",
                STATUS_CONFIG[status].className,
              )}
            >
              {STATUS_CONFIG[status].label[0]}
            </span>
          ) : (
            <span className="font-plex-sans text-[12px] text-navy/30">—</span>
          )}
        </td>
      );
    })}
  </tr>
));
```

Por:

```tsx
membros.map((m) => (
  <tr
    key={m.usuario_id}
    className="border-b border-foreground/[0.06] last:border-0 hover:bg-foreground/[0.02] transition-colors"
  >
    <td className="px-4 py-2.5 font-plex-sans text-[13px] font-semibold text-foreground whitespace-nowrap sticky left-0 bg-background">
      {m.nome}
    </td>
    {eventosVisiveis.map((e) => {
      const reg = matriz.get(m.usuario_id)?.get(e.id);
      const status = reg?.status ?? null;
      return (
        <td key={e.id} className="px-2 py-2.5 text-center">
          {status ? (
            <span
              className={cn(
                "inline-block font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5 rounded-full",
                STATUS_CONFIG[status].className,
              )}
            >
              {STATUS_CONFIG[status].label[0]}
            </span>
          ) : (
            <span className="font-plex-sans text-[12px] text-foreground/30">—</span>
          )}
        </td>
      );
    })}
  </tr>
));
```

- [ ] **Step 4: Atualizar o estado vazio dentro do tbody (linha "Nenhum membro")**

Substituir:

```tsx
<td
  colSpan={eventosVisiveis.length + 1}
  className="px-4 py-4 font-plex-sans text-[13px] text-navy/50 text-center"
>
  Nenhum membro cadastrado.
</td>
```

Por:

```tsx
<td
  colSpan={eventosVisiveis.length + 1}
  className="px-4 py-4 font-plex-sans text-[13px] text-foreground/40 text-center"
>
  Nenhum membro cadastrado.
</td>
```

- [ ] **Step 5: Verificar visualmente no browser**

Rodar o dev server:

```bash
npm run dev:web
```

Navegar para Gerenciamento → aba Presença. Verificar:

- Tabela sem borda externa
- Cabeçalho com linha divisória sutil `border-foreground/[0.08]` (igual às abas Membros/Recursos)
- Linhas com `border-foreground/[0.06]`
- Hover suave nas linhas
- Coluna "Membro" sticky sem artefato de fundo branco ao rolar horizontalmente
- Sheet de registro/edição funcionando normalmente

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/gerenciamento/AbaPresenca.tsx
git commit -m "style: padronizar tabela da aba Presença com demais abas do Gerenciamento"
```
