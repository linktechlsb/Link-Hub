# Edit Eventos + Aprovações SuperAdmin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o comportamento de re-aprovação ao editar eventos, adicionar badges de status na Agenda, e refatorar o SuperAdmin para ter tabs com aba de Aprovações sempre visível.

**Architecture:** Três mudanças independentes: (1) fix de 1 linha no backend para resetar `status_aprovacao` quando diretor edita; (2) adição de badges e aviso de re-submissão na AgendaPage; (3) refatoração da SuperAdminPage para usar shadcn/ui Tabs com 3 abas (Ligas / Aprovações / Usuários).

**Tech Stack:** React 18 + TypeScript, Express, shadcn/ui (`Tabs`), Tailwind CSS, Lucide React

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `apps/api/src/routes/eventos.ts` | Modificar linha ~100 | Lógica de `status_aprovacao` no PATCH |
| `apps/web/src/components/ui/tabs.tsx` | Criar (shadcn) | Componente de tabs gerado automaticamente |
| `apps/web/src/pages/agenda/AgendaPage.tsx` | Modificar | Aviso de re-submissão + badges de status |
| `apps/web/src/pages/super-admin/SuperAdminPage.tsx` | Modificar | Refatorar layout para tabs |

---

## Task 1: Fix backend — resetar status_aprovacao ao editar (diretor)

**Files:**
- Modify: `apps/api/src/routes/eventos.ts:98-100`

Hoje a linha `status_aprovacao = requer_aprovacao ? (eventoAtual.status_aprovacao ?? "pendente") : null` preserva o status existente para qualquer role. Precisa resetar para `"pendente"` quando o editor for diretor.

- [ ] **Step 1: Abrir o arquivo e localizar o trecho**

Arquivo: `apps/api/src/routes/eventos.ts`, função `PATCH /:id`, aproximadamente linha 98.

Trecho atual:
```ts
const cat = categoria ?? eventoAtual.categoria;
const requer_aprovacao = cat === "evento" || cat === "hub";
const status_aprovacao = requer_aprovacao ? (eventoAtual.status_aprovacao ?? "pendente") : null;
```

- [ ] **Step 2: Aplicar a correção**

Substituir as 3 linhas acima por:

```ts
const cat = categoria ?? eventoAtual.categoria;
const requer_aprovacao = cat === "evento" || cat === "hub";
const status_aprovacao = requer_aprovacao
  ? (user.role === "staff" ? (eventoAtual.status_aprovacao ?? "pendente") : "pendente")
  : null;
```

**Lógica:** Staff preserva o status atual (não interrompe fluxo de revisão). Diretor sempre reseta para `"pendente"` — a edição resubmete o evento para aprovação.

- [ ] **Step 3: Verificar typecheck da API**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub
pnpm typecheck
```

Esperado: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/eventos.ts
git commit -m "fix(eventos): resetar status_aprovacao para pendente quando diretor edita"
```

---

## Task 2: Instalar shadcn/ui Tabs

**Files:**
- Create: `apps/web/src/components/ui/tabs.tsx` (gerado pelo shadcn CLI)

- [ ] **Step 1: Instalar o componente**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub/apps/web
pnpm dlx shadcn@latest add tabs
```

Quando perguntado sobre sobrescrever arquivos existentes, responder `y`. O comando gera `src/components/ui/tabs.tsx`.

- [ ] **Step 2: Confirmar que o arquivo foi criado**

```bash
ls /Users/diogochiapetagarcia/Cursor/Link-Hub/apps/web/src/components/ui/tabs.tsx
```

Esperado: arquivo existe.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/tabs.tsx
git commit -m "chore(web): adicionar componente Tabs do shadcn/ui"
```

---

## Task 3: AgendaPage — aviso de re-submissão no modal de edição

**Files:**
- Modify: `apps/web/src/pages/agenda/AgendaPage.tsx`

No modal de edição, quando o evento original já estava aprovado e a categoria ainda requer aprovação, mostrar aviso de que a edição vai resubmeter o evento.

- [ ] **Step 1: Localizar o bloco de aviso existente no modal de edição**

No arquivo `apps/web/src/pages/agenda/AgendaPage.tsx`, dentro do `{showEditarEvento && eventoEditando && (...)}`, há um bloco de aviso:

```tsx
{/* Aviso de aprovação */}
{["evento", "hub"].includes(editarForm.categoria) && (
  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-yellow/15 border border-brand-yellow/40">
    <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow flex-shrink-0" />
    <p className="text-xs text-navy/80 font-medium">
      Este evento requer aprovação do staff antes de ser publicado.
    </p>
  </div>
)}
```

- [ ] **Step 2: Adicionar aviso de re-submissão ANTES do aviso existente**

Inserir o seguinte bloco IMEDIATAMENTE ANTES do bloco `{/* Aviso de aprovação */}` encontrado no step 1:

```tsx
{/* Aviso de re-submissão para eventos já aprovados */}
{eventoEditando.status_aprovacao === "aprovado" &&
  ["evento", "hub"].includes(editarForm.categoria) && (
  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
    <p className="text-xs text-amber-800 font-medium">
      Esta edição irá resubmeter o evento para aprovação do staff.
    </p>
  </div>
)}
```

- [ ] **Step 3: Verificar typecheck**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub
pnpm typecheck
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/agenda/AgendaPage.tsx
git commit -m "feat(agenda): aviso de re-submissão no modal de edição de evento aprovado"
```

---

## Task 4: AgendaPage — badges de status nos eventos

**Files:**
- Modify: `apps/web/src/pages/agenda/AgendaPage.tsx`

Duas adições: (a) dot colorido nos pills da grade do calendário; (b) badge de texto no painel lateral.

### Parte A — Dot indicador nos pills da grade

- [ ] **Step 1: Localizar o pill de evento na grade**

No arquivo, dentro de `calendarDays.map(...)`, há um bloco:

```tsx
<div
  key={evento.id}
  title={evento.titulo}
  className={cn(
    "text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium leading-snug",
    color?.bg ?? "bg-navy",
    color?.text ?? "text-white",
  )}
>
  {evento.titulo}
</div>
```

- [ ] **Step 2: Adicionar `relative` e o dot de status**

Substituir o bloco acima por:

```tsx
<div
  key={evento.id}
  title={evento.titulo}
  className={cn(
    "relative text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium leading-snug",
    color?.bg ?? "bg-navy",
    color?.text ?? "text-white",
  )}
>
  {evento.titulo}
  {evento.requer_aprovacao &&
    (evento.status_aprovacao === "pendente" || evento.status_aprovacao === "rejeitado") && (
    <span
      className={cn(
        "absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-white/40",
        evento.status_aprovacao === "pendente" ? "bg-brand-yellow" : "bg-rose-400",
      )}
    />
  )}
</div>
```

### Parte B — Badge de status no painel lateral

- [ ] **Step 3: Localizar o nome e liga do evento no painel lateral**

Dentro de `selectedDayEventos.map(evento => ...)`, há o bloco:

```tsx
<div className="min-w-0">
  <p className="text-sm font-semibold text-navy truncate">
    {evento.titulo}
  </p>
  <p className="text-xs text-muted-foreground mt-0.5">
    {evento.liga?.nome ?? "Liga"}
    {formatTime(evento.data) && (
      <span className="ml-2 font-medium text-link-blue">
        {formatTime(evento.data)}
      </span>
    )}
  </p>
  {isOpen && evento.descricao && (
    <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-brand-gray/60 pt-2">
      {evento.descricao}
    </p>
  )}
</div>
```

- [ ] **Step 4: Adicionar badge de status após o parágrafo de liga/hora**

Inserir o seguinte bloco IMEDIATAMENTE APÓS o `</p>` do nome da liga/hora (antes do bloco `{isOpen && evento.descricao && ...}`):

```tsx
{evento.requer_aprovacao &&
  (evento.status_aprovacao === "pendente" || evento.status_aprovacao === "rejeitado") && (
  <span className={cn(
    "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1",
    evento.status_aprovacao === "pendente"
      ? "bg-brand-yellow/20 text-amber-700"
      : "bg-rose-100 text-rose-700",
  )}>
    <span className="w-1 h-1 rounded-full bg-current" />
    {evento.status_aprovacao === "pendente" ? "pendente" : "rejeitado"}
  </span>
)}
```

- [ ] **Step 5: Verificar typecheck**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub
pnpm typecheck
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/agenda/AgendaPage.tsx
git commit -m "feat(agenda): badges de status pendente/rejeitado nos eventos"
```

---

## Task 5: SuperAdminPage — refatorar para tabs

**Files:**
- Modify: `apps/web/src/pages/super-admin/SuperAdminPage.tsx`

Adicionar import de `Tabs`, e refatorar o JSX para 3 abas: Ligas, Aprovações, Usuários. Stats ficam fora das tabs.

- [ ] **Step 1: Adicionar o import do Tabs**

No topo do arquivo, após o import do `cn`, adicionar:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

- [ ] **Step 2: Localizar o início das seções no return()**

No `return(...)`, após o bloco de Stats (`</div>` do grid de 4 cards), há dois blocos principais:
- `{/* ── Gestão de Ligas ─── */}`
- `{(pendentes...) && ...}` (aprovações condicionais)
- `{/* ── Gestão de Usuários ─── */}`

- [ ] **Step 3: Substituir os 3 blocos por estrutura com Tabs**

Remover os 3 blocos existentes (Ligas, Aprovações condicional, Usuários) e substituir por:

```tsx
{/* ── Tabs de gestão ──────────────────────────────────────────────── */}
<Tabs defaultValue="ligas" className="space-y-4">
  <TabsList className="bg-brand-gray/60 border border-brand-gray">
    <TabsTrigger value="ligas" className="data-[state=active]:bg-white data-[state=active]:text-navy font-semibold">
      Ligas
    </TabsTrigger>
    <TabsTrigger value="aprovacoes" className="data-[state=active]:bg-white data-[state=active]:text-navy font-semibold">
      Aprovações
      {(pendentes.projetos.length + pendentes.eventos.length) > 0 && (
        <span className="ml-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
          {pendentes.projetos.length + pendentes.eventos.length}
        </span>
      )}
    </TabsTrigger>
    <TabsTrigger value="usuarios" className="data-[state=active]:bg-white data-[state=active]:text-navy font-semibold">
      Usuários
    </TabsTrigger>
  </TabsList>

  {/* ── Tab: Ligas ───────────────────────────────────────────────── */}
  <TabsContent value="ligas">
    <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
      <div className="p-6 border-b border-brand-gray flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-navy">Gestão de Ligas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Criar, editar, arquivar ligas e gerenciar membros</p>
        </div>
        <Button
          className="bg-navy hover:bg-navy/90 text-white font-semibold flex-shrink-0"
          onClick={() => {
            setLigaParaEditar(undefined);
            setSheetLigaOpen(true);
          }}
        >
          + Nova Liga
        </Button>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground p-6">Carregando...</p>
      ) : ligas.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6">Nenhuma liga cadastrada.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-brand-gray/40 border-b border-brand-gray">
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Liga</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Líder</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Projetos</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ligas.map((l) => (
              <tr key={l.id} className="border-b border-brand-gray last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-6 py-3 text-sm font-semibold text-navy">{l.nome}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{l.lider_email ?? "—"}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{l.projetos_ativos ?? 0}</td>
                <td className="px-6 py-3">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-navy/10 text-navy">
                    ativa
                  </span>
                </td>
                <td className="px-6 py-3">
                  {confirmarArquivoId === l.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">Arquivar?</span>
                      <button
                        onClick={() => arquivarLiga(l.id)}
                        className="text-xs font-semibold text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmarArquivoId(null)}
                        className="text-xs text-muted-foreground hover:text-navy"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setLigaParaEditar(l);
                          setSheetLigaOpen(true);
                        }}
                        className="text-xs font-medium text-link-blue border border-brand-gray px-2.5 py-1 rounded hover:border-link-blue/40 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setLigaMembros(l);
                          setSheetMembrosOpen(true);
                        }}
                        className="text-xs font-medium text-link-blue border border-brand-gray px-2.5 py-1 rounded hover:border-link-blue/40 transition-colors"
                      >
                        Membros
                      </button>
                      <button
                        onClick={() => setConfirmarArquivoId(l.id)}
                        className="text-xs font-medium text-red-500 border border-red-100 px-2.5 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Arquivar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </TabsContent>

  {/* ── Tab: Aprovações ──────────────────────────────────────────── */}
  <TabsContent value="aprovacoes">
    <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
      <div className="p-6 border-b border-brand-gray">
        <h2 className="font-display font-bold text-lg text-navy flex items-center gap-2">
          Aprovações Pendentes
          {(pendentes.projetos.length + pendentes.eventos.length) > 0 && (
            <span className="text-sm font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {pendentes.projetos.length + pendentes.eventos.length}
            </span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Projetos e eventos que aguardam aprovação do staff</p>
      </div>

      {pendentes.projetos.length === 0 && pendentes.eventos.length === 0 ? (
        <div className="px-6 py-12 flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-navy">Nenhuma aprovação pendente</p>
          <p className="text-xs text-muted-foreground">Tudo em dia!</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-brand-gray/40 border-b border-brand-gray">
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Tipo</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Nome</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Liga</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Enviado em</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pendentes.projetos.map((p) => (
              <tr key={`proj-${p.id}`} className="border-b border-brand-gray last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-6 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy uppercase tracking-wide">
                    <FolderOpen className="h-3 w-3" />
                    Projeto
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-navy">{p.titulo}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{p.liga?.nome ?? "—"}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">
                  {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={aprovando === p.id}
                      onClick={() => aprovarProjeto(p.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-green-700 border border-green-200 px-2.5 py-1 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovar
                    </button>
                    <button
                      disabled={aprovando === p.id}
                      onClick={() => rejeitarProjeto(p.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-100 px-2.5 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeitar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pendentes.eventos.map((e) => (
              <tr key={`evt-${e.id}`} className="border-b border-brand-gray last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-6 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-link-blue/10 text-link-blue uppercase tracking-wide">
                    <CalendarDays className="h-3 w-3" />
                    {e.categoria}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-navy">{e.titulo}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{e.liga?.nome ?? "—"}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">
                  {new Date(e.criado_em).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={aprovando === e.id}
                      onClick={() => aprovarEvento(e.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-green-700 border border-green-200 px-2.5 py-1 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovar
                    </button>
                    <button
                      disabled={aprovando === e.id}
                      onClick={() => rejeitarEvento(e.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-100 px-2.5 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeitar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </TabsContent>

  {/* ── Tab: Usuários ────────────────────────────────────────────── */}
  <TabsContent value="usuarios">
    <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
      <div className="p-6 border-b border-brand-gray flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg text-navy">Gestão de Usuários</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Criar, editar e remover usuários da plataforma</p>
        </div>
        <Button
          className="bg-navy hover:bg-navy/90 text-white font-semibold flex-shrink-0"
          onClick={() => {
            setUsuarioParaEditar(undefined);
            setSheetUsuarioOpen(true);
          }}
        >
          + Novo Usuário
        </Button>
      </div>

      <div className="px-6 py-4 border-b border-brand-gray">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-brand-gray rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground p-6">Carregando...</p>
      ) : usuariosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6">Nenhum usuário encontrado.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-brand-gray/40 border-b border-brand-gray">
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Nome</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Email</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Role</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Liga</th>
              <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u.id} className="border-b border-brand-gray last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-6 py-3 text-sm font-semibold text-navy">{u.nome}</td>
                <td className="px-6 py-3 text-sm text-link-blue">{u.email}</td>
                <td className="px-6 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{u.liga_nome ?? "—"}</td>
                <td className="px-6 py-3">
                  {confirmarRemocaoId === u.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">Confirmar?</span>
                      <button
                        onClick={() => removerUsuario(u.id)}
                        className="text-xs font-semibold text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmarRemocaoId(null)}
                        className="text-xs text-muted-foreground hover:text-navy"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setUsuarioParaEditar(u);
                          setSheetUsuarioOpen(true);
                        }}
                        className="text-xs font-medium text-link-blue border border-brand-gray px-2.5 py-1 rounded hover:border-link-blue/40 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmarRemocaoId(u.id)}
                        className="text-xs font-medium text-red-500 border border-red-100 px-2.5 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </TabsContent>
</Tabs>
```

- [ ] **Step 4: Verificar typecheck**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub
pnpm typecheck
```

Esperado: sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/super-admin/SuperAdminPage.tsx
git commit -m "feat(super-admin): refatorar para tabs (Ligas / Aprovações / Usuários)"
```

---

## Verificação End-to-End

Após todas as tasks, verificar manualmente:

1. **Diretor edita evento aprovado:** Login como diretor → Agenda → clicar em evento tipo "evento" ou "hub" já aprovado → Editar → aviso de re-submissão aparece → salvar → SuperAdmin aba Aprovações mostra o evento novamente como pendente
2. **Staff edita evento aprovado:** Login como staff → mesmo evento → editar → salvar → status permanece "aprovado"
3. **Badge na agenda:** Evento com `status_aprovacao = "pendente"` exibe dot amarelo no pill da grade e badge "pendente" no painel lateral; "rejeitado" exibe dot/badge vermelho
4. **SuperAdmin tabs:** Navegar pelas 3 abas → "Aprovações" mostra contagem no trigger quando há pendentes → empty state quando não há
5. **Restrição de diretor:** Login como diretor → evento de outra liga → botões de editar/excluir não aparecem
