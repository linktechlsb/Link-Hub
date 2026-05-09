# Spec: Redesign da Página de Conta — Novo Padrão de Design

**Data:** 2026-05-09
**Status:** Aprovado

---

## Contexto

A página de Conta (`/conta`) existe em três variantes por papel (ContaLiderView, ContaMembroView, ContaStaffView). O design atual usa tokens navy-based antigos (`border-navy/20`, `text-navy/50`, `bg-navy/[0.02]`), inputs customizados (`InputTexto`) e botões sem `rounded-full`. As demais páginas da plataforma (Mural, Ligas, Projetos, Gerenciamento, Ranking) já foram migradas para o novo padrão. O objetivo é padronizar a página de Conta ao mesmo sistema.

---

## Objetivo

Migrar as três views de Conta para o novo padrão de design da plataforma, adicionando um card de perfil no topo e atualizando todos os tokens de cor, inputs, botões e espaçamentos.

---

## O Que Muda

### 1. Tokens de cor

| Elemento                         | Antes (antigo)                 | Depois (novo)              |
| -------------------------------- | ------------------------------ | -------------------------- |
| Bordas de seção                  | `border-navy/[0.08]`           | `border-foreground/[0.06]` |
| Bordas de input                  | `border-navy/20`               | `border-border`            |
| Texto secundário                 | `text-navy/50`, `text-navy/60` | `text-foreground/40`       |
| Background de input              | `white`                        | `bg-muted/50`              |
| Background de input desabilitado | `bg-navy/[0.02]`               | `bg-muted/30`              |
| Label monoespaçado               | `text-navy/50`                 | `text-foreground/40`       |
| Divisores internos               | `border-navy/15`               | `border-foreground/[0.06]` |

### 2. Inputs

Substituir o componente `InputTexto` customizado pelo padrão usado em Ligas/Projetos/Gerenciamento:

```tsx
// Antes
<InputTexto label="Nome" value={nome} onChange={...} />

// Depois — input inline com label separada
<div>
  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">Nome</p>
  <input
    className="w-full border border-border px-3 py-2.5 bg-muted/50 font-plex-sans text-[13px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
    value={nome}
    onChange={...}
  />
</div>
```

### 3. Botões

```tsx
// Salvar (primário)
<button className="bg-navy text-white text-[13px] font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
  Salvar alterações
</button>

// Ação destrutiva (desativar conta)
<button className="text-[13px] font-semibold text-foreground/40 border border-foreground/20 px-5 py-2.5 rounded-full hover:border-foreground/40 transition-colors">
  Desativar conta
</button>

// Botão de ação secundária (ex: "Alterar senha")
<button className="text-[13px] font-semibold text-foreground/50 border border-foreground/20 px-4 py-2 rounded-full hover:bg-foreground/[0.04]">
  ...
</button>
```

### 4. Card de perfil (elemento novo)

Posicionado **entre o subtítulo da página e as tabs**, presente nas três views.

```tsx
// Container
<div className="flex items-center gap-4 px-5 py-4 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06] mb-6">
  {/* Avatar */}
  {avatarUrl ? (
    <img src={avatarUrl} className="w-[52px] h-[52px] rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-[52px] h-[52px] rounded-full bg-navy flex items-center justify-center text-white font-bold text-lg shrink-0">
      {nome?.[0]?.toUpperCase()}
    </div>
  )}

  {/* Info */}
  <div className="flex-1 min-w-0">
    <p className="font-plex-sans font-bold text-[14px] text-navy truncate">{nome}</p>
    <p className="font-plex-sans text-[11px] text-foreground/40 mt-0.5">{email}</p>
    {/* Badge: "Cargo · Liga" ou "Staff" */}
    <span className="inline-block text-[10px] font-semibold text-foreground/50 border border-foreground/15 px-2 py-0.5 rounded-full mt-1.5 font-plex-mono uppercase tracking-[0.08em]">
      {badge}
    </span>
  </div>

  {/* Botão alterar foto — dispara o mesmo input[type=file] existente */}
  <button
    onClick={() => fileInputRef.current?.click()}
    className="shrink-0 text-[11px] font-semibold text-foreground/45 border border-foreground/[0.15] px-3 py-1.5 rounded-full bg-transparent hover:border-foreground/30 transition-colors"
  >
    Alterar foto
  </button>
</div>
```

**Badge por role:**

- ContaLiderView: `${cargo} · ${liga?.nome ?? "—"}`
- ContaMembroView: `${cargo} · ${liga?.nome ?? "—"}`
- ContaStaffView: `"Staff"`

### 5. Avatar na aba Perfil

O bloco de avatar (círculo clicável com câmera) que existe dentro da aba **Perfil** em cada view deve ser **removido** — o card de perfil passa a ser o único ponto de upload de foto. O `<input type="file">` e a lógica `uploadAvatarMe` permanecem, apenas o trigger muda para o botão "Alterar foto" do card.

### 6. Toggles (aba Notificações)

Manter o componente `Toggle` atual — ele já segue o padrão correto visualmente. Atualizar apenas os textos auxiliares para usar `text-foreground/40` em vez de `text-navy/40`.

### 7. Container

Manter `max-w-3xl` — a página de conta é um formulário pessoal, não uma listagem, então a largura reduzida é intencional e adequada.

---

## Arquivos a modificar

| Arquivo                                        | Mudança                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/src/pages/conta/ContaLiderView.tsx`  | Card de perfil + novos tokens + novos inputs + novos botões + remover avatar da aba Perfil |
| `apps/web/src/pages/conta/ContaMembroView.tsx` | Idem                                                                                       |
| `apps/web/src/pages/conta/ContaStaffView.tsx`  | Idem (sem campo liga no badge)                                                             |

---

## Verificação

1. Abrir `/conta` como Lider, Membro e Staff
2. Card de perfil aparece acima das tabs com avatar, nome, email e badge corretos por role
3. Clicar "Alterar foto" → abre o file picker → upload funciona → avatar atualiza no card
4. Aba Perfil não mostra mais o bloco de avatar duplicado
5. Todos os inputs usam o novo padrão visual (borda fina, bg muted, arredondamento)
6. Botões são `rounded-full`
7. Divisores de seção usam `border-foreground/[0.06]`
8. Labels monoespaçadas usam `text-foreground/40`
