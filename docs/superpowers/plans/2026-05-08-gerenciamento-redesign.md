# Gerenciamento Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar GerenciamentoPage e GerenciamentoStaffPage usando o padrão visual de Ligas/Formulários/Projetos: SectionHeader + tabela + Sheet lateral + KpiRow.

**Architecture:** Toda a lógica de fetch, estado e mutações permanece intacta. Apenas o JSX de render é alterado: caixas `border border-navy/15 p-5` → `SectionHeader` + `<table>`, botões "Adicionar" inline → Sheet lateral, KPI boxes → `KpiRow`. Os quatro arquivos afetados são independentes entre si — podem ser executados em qualquer ordem.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + shadcn/ui (Sheet, DropdownMenu) + `SectionHeader`, `KpiRow`, `RankingList` de `@/pages/home/v1/primitives`

---

## Padrões reutilizados em todos os tasks

**Botão de ação (header de seção):**

```tsx
<button
  onClick={handler}
  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
>
  + Label
</button>
```

**SectionHeader com ação:**

```tsx
import { SectionHeader } from "@/pages/home/v1/primitives";

<SectionHeader
  titulo="Nome da Seção"
  tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
  acao={<button className="...rounded-full...">+ Adicionar</button>}
/>;
```

**Tabela padrão:**

```tsx
<table className="w-full border-collapse">
  <thead>
    <tr className="border-b border-foreground/[0.08]">
      <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
        Coluna
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors">
      <td className="py-4 px-4 font-plex-sans text-[13px] text-foreground">...</td>
    </tr>
  </tbody>
</table>
```

**Sheet lateral (padrão já existente no projeto):**

```tsx
<Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
  <SheetContent
    side="right"
    className="w-[480px] sm:w-[560px] flex flex-col gap-0 p-0 bg-background"
  >
    <div className="flex-shrink-0">
      <div className="h-px bg-navy/90" />
      <div className="px-8 pt-8 pb-6">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
          Subtítulo
        </p>
        <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
          Título do Sheet
        </h2>
      </div>
      <div className="h-px bg-navy/15" />
    </div>
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">{/* campos do formulário */}</div>
    <div className="flex-shrink-0">
      <div className="h-px bg-navy/15" />
      <div className="px-8 py-6 flex gap-3">
        <button
          disabled={salvando}
          className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40"
        >
          Salvar
        </button>
        <button
          onClick={() => setSheetAberto(false)}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-3 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  </SheetContent>
</Sheet>
```

**DropdownMenu de ações por linha:**

```tsx
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
      <MoreHorizontal size={14} />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="min-w-[140px]">
    <DropdownMenuItem className="text-[12px] cursor-pointer" onClick={() => iniciarEdicao(item)}>
      Editar
    </DropdownMenuItem>
    <DropdownMenuItem
      className="text-[12px] cursor-pointer text-red-500"
      onClick={() => confirmarRemover(item.id)}
    >
      Remover
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

---

## Task 1: AbaCRM — tabela + SectionHeader

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/AbaCRM.tsx`

- [ ] **Step 1: Adicionar imports necessários**

No topo de `AbaCRM.tsx`, substituir os imports existentes de Lucide e shadcn/ui por:

```tsx
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Linkedin,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SectionHeader } from "@/pages/home/v1/primitives";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import type { CrmContato, CreateCrmContatoInput, UpdateCrmContatoInput } from "@link-leagues/types";
```

- [ ] **Step 2: Substituir o bloco de render do componente AbaCRM**

Localizar `return (` dentro de `export function AbaCRM` e substituir todo o JSX retornado por:

```tsx
if (carregando) {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-navy/40" />
    </div>
  );
}

return (
  <div className="space-y-6">
    <SectionHeader
      titulo="Contatos"
      tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      acao={
        <button
          onClick={abrirFormularioNovo}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
        >
          + Novo Contato
        </button>
      }
    />

    {contatos.length === 0 ? (
      <div className="border border-dashed border-navy/20 py-16 text-center">
        <p className="font-plex-sans text-[13px] text-navy/40">Nenhum contato adicionado ainda.</p>
        <button
          onClick={abrirFormularioNovo}
          className="mt-3 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
        >
          Criar primeiro contato
        </button>
      </div>
    ) : (
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-foreground/[0.08]">
            <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
              Nome
            </th>
            <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
              Empresa / Cargo
            </th>
            <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
              Contato
            </th>
            <th className="py-3 px-4 w-10" />
          </tr>
        </thead>
        <tbody>
          {contatos.map((contato) => (
            <tr
              key={contato.id}
              className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
            >
              <td className="py-4 px-4">
                <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                  {contato.nome}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="space-y-0.5">
                  {contato.empresa && (
                    <div className="flex items-center gap-1.5 font-plex-sans text-[12px] text-foreground/60">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {contato.empresa}
                    </div>
                  )}
                  {contato.emprego && (
                    <div className="flex items-center gap-1.5 font-plex-sans text-[12px] text-foreground/60">
                      <Briefcase className="h-3 w-3 shrink-0" />
                      {contato.emprego}
                    </div>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="space-y-0.5">
                  {contato.email && (
                    <a
                      href={`mailto:${contato.email}`}
                      className="flex items-center gap-1.5 font-plex-mono text-[11px] text-foreground/60 hover:text-navy transition-colors"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[160px]">{contato.email}</span>
                    </a>
                  )}
                  {contato.telefone && (
                    <a
                      href={`tel:${contato.telefone}`}
                      className="flex items-center gap-1.5 font-plex-mono text-[11px] text-foreground/60 hover:text-navy transition-colors"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      {contato.telefone}
                    </a>
                  )}
                  {contato.linkedin && (
                    <a
                      href={contato.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-plex-mono text-[11px] text-foreground/60 hover:text-navy transition-colors"
                    >
                      <Linkedin className="h-3 w-3 shrink-0" />
                      LinkedIn
                    </a>
                  )}
                </div>
              </td>
              <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuItem
                      className="text-[12px] cursor-pointer"
                      onClick={() => abrirFormularioEdicao(contato)}
                    >
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                      onClick={() => abrirDialogoDeletar(contato)}
                    >
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    {/* Sheet add/edit — mantém lógica existente, atualiza apenas o estilo */}
    <Sheet open={modoSheet !== null} onOpenChange={(aberto) => !aberto && setModoSheet(null)}>
      <SheetContent
        side="right"
        className="w-[480px] sm:w-[560px] flex flex-col gap-0 p-0 bg-background"
      >
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
              CRM
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
              {modoSheet === "adicionar" ? "Novo Contato" : "Editar Contato"}
            </h2>
          </div>
          <div className="h-px bg-navy/15" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {[
            {
              label: "Nome *",
              placeholder: "Nome do contato",
              field: "nome" as const,
              type: "text",
            },
            {
              label: "Email",
              placeholder: "email@exemplo.com",
              field: "email" as const,
              type: "email",
            },
            {
              label: "Telefone",
              placeholder: "(11) 9999-9999",
              field: "telefone" as const,
              type: "text",
            },
            {
              label: "Empresa",
              placeholder: "Nome da empresa",
              field: "empresa" as const,
              type: "text",
            },
            {
              label: "Cargo",
              placeholder: "Cargo do contato",
              field: "emprego" as const,
              type: "text",
            },
            {
              label: "LinkedIn",
              placeholder: "https://linkedin.com/in/...",
              field: "linkedin" as const,
              type: "url",
            },
          ].map(({ label, placeholder, field, type }) => (
            <div key={field}>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                {label}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                value={formData[field]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
              />
            </div>
          ))}
        </div>

        <div className="flex-shrink-0">
          <div className="h-px bg-navy/15" />
          <div className="px-8 py-6 flex gap-3">
            <button
              onClick={salvarContato}
              disabled={salvando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </button>
            <button
              onClick={() => setModoSheet(null)}
              disabled={salvando}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-3 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Dialog de confirmação de remoção — mantém lógica */}
    <Dialog
      open={!!contatoDeletando}
      onOpenChange={(aberto) => !aberto && setContatoDeletando(null)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Remover Contato</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        {contatoDeletando && (
          <p className="font-plex-sans text-[13px] text-navy py-2">
            Remover <strong>{contatoDeletando.nome}</strong>?
          </p>
        )}
        <DialogFooter className="gap-2">
          <button
            onClick={() => setContatoDeletando(null)}
            disabled={deletando}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-2.5 border border-navy/20 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarDeletar}
            disabled={deletando}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-red-500 hover:bg-red-600 px-4 py-2.5 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {deletando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Remover
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
```

- [ ] **Step 3: Remover imports não mais usados**

Remover do topo do arquivo:

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
```

- [ ] **Step 4: Verificar**

Iniciar o dev server (`npm run dev:web`) e navegar para `/gerenciamento` → aba CRM. Verificar:

- Tabela renderiza com Nome, Empresa/Cargo, Contato
- Botão "+ Novo Contato" rounded-full no header
- DropdownMenu abre com Editar/Remover
- Sheet lateral abre ao clicar "+ Novo Contato"
- Sheet de edição abre ao clicar "Editar" no dropdown
- Dialog de confirmação abre ao clicar "Remover"

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/gerenciamento/AbaCRM.tsx
git commit -m "feat(gerenciamento): redesign CRM tab — table + SectionHeader + sheet"
```

---

## Task 2: AbaPresenca — header + botões rounded-full

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/AbaPresenca.tsx`

A matriz de presença já é uma tabela e funciona bem. Apenas o header e os botões de ação precisam ser atualizados.

- [ ] **Step 1: Adicionar import SectionHeader**

No topo do arquivo, após os imports existentes, adicionar:

```tsx
import { SectionHeader } from "@/pages/home/v1/primitives";
```

- [ ] **Step 2: Substituir o bloco de header (linhas 220–248 do arquivo original)**

Localizar o bloco `{/* Cabeçalho + ações */}` e substituir por:

```tsx
      <SectionHeader
        titulo="Controle de Presença"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        acao={
          <div className="flex items-center gap-2">
            <button
              onClick={abrirEditar}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground/[0.06] transition-colors"
            >
              Editar presença
            </button>
            <button
              onClick={abrirAdicionar}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
            >
              + Adicionar presença
            </button>
          </div>
        }
      />
      <p className="font-plex-sans text-[12px] text-navy/40 -mt-4">
        {membros.length} membros · {eventosVisiveis.length} evento(s) exibido(s)
      </p>
```

- [ ] **Step 3: Atualizar badges de status na matriz (dentro do `<tbody>`)**

Localizar o bloco de render dos badges de status:

```tsx
{status ? (
  <span
    className={cn(
      "inline-block font-plex-mono text-[9px] uppercase tracking-[0.10em] px-1.5 py-0.5",
      STATUS_CONFIG[status].className,
    )}
  >
    {STATUS_CONFIG[status].label[0]}
  </span>
```

Substituir por:

```tsx
{status ? (
  <span
    className={cn(
      "inline-block font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5 rounded-full",
      STATUS_CONFIG[status].className,
    )}
  >
    {STATUS_CONFIG[status].label[0]}
  </span>
```

- [ ] **Step 4: Verificar**

Navegar para `/gerenciamento` → aba Presença. Verificar:

- Header com "Controle de Presença" como SectionHeader
- Dois botões rounded-full no lado direito
- Badges de status com `rounded-full`
- Sheet de registro continua funcional

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/gerenciamento/AbaPresenca.tsx
git commit -m "feat(gerenciamento): redesign Presença tab — SectionHeader + rounded-full"
```

---

## Task 3: GerenciamentoPage — Aba Membros

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx` (componente `AbaMembros`)

Adicionar estado de Sheet, remover o bloco inline de "Adicionar Novo Membro", converter lista para tabela, adicionar Sheet lateral.

- [ ] **Step 1: Adicionar imports necessários no topo de GerenciamentoPage.tsx**

Adicionar aos imports existentes (mantendo os que já existem):

```tsx
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SectionHeader, KpiRow, RankingList } from "@/pages/home/v1/primitives";
```

Remover dos imports Lucide: `Check` (será substituído pelo novo fluxo de edição via Sheet).

- [ ] **Step 2: Substituir toda a função `AbaMembros`**

Localizar `function AbaMembros(` e substituir a função completa por:

```tsx
function AbaMembros({ ligaId }: { ligaId: string | null }) {
  const [membros, setMembros] = useState<MembroAtivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [sheetModo, setSheetModo] = useState<"adicionar" | "editar">("adicionar");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [emailConvite, setEmailConvite] = useState("");
  const [cargoConvite, setCargoConvite] = useState<Cargo>("Membro");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [novoCargoEdit, setNovoCargoEdit] = useState<Cargo>("Membro");
  const [salvandoEdicaoId, setSalvandoEdicaoId] = useState<string | null>(null);
  const [confirmandoRemoverId, setConfirmandoRemoverId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  useEffect(() => {
    if (!ligaId) {
      setCarregando(false);
      return;
    }
    async function carregar() {
      try {
        const token = await getToken();
        const res = await fetch(`/api/ligas/${ligaId}/membros`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as MembroAPI[];
          setMembros(data.map(apiParaMembro));
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, [ligaId]);

  if (carregando)
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando membros…</p>;

  async function convidar() {
    if (!ligaId) {
      toast.error("Liga não identificada.");
      return;
    }
    const email = emailConvite.trim();
    if (!email) {
      toast.error("Informe o e-mail institucional.");
      return;
    }
    setEnviandoConvite(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, cargo: cargoConvite === "Diretor" ? "Diretor" : null }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string } & MembroAPI;
      if (!res.ok) {
        toast.error(body.error ?? "Erro ao adicionar membro.");
        return;
      }
      const novo = apiParaMembro({
        id: body.id,
        usuario_id: body.usuario_id,
        nome: body.nome ?? email,
        email: body.email ?? email,
        cargo: body.cargo ?? (cargoConvite === "Diretor" ? "Diretor" : null),
        role: body.role ?? null,
      });
      setMembros((prev) => [{ ...novo, novo: true }, ...prev.filter((m) => m.id !== novo.id)]);
      setEmailConvite("");
      setSheetAberto(false);
      toast.success("Membro adicionado.");
    } finally {
      setEnviandoConvite(false);
    }
  }

  async function salvarEdicao(id: string) {
    if (!ligaId) return;
    setSalvandoEdicaoId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cargo: novoCargoEdit === "Diretor" ? "Diretor" : null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao salvar cargo.");
        return;
      }
      setMembros((prev) => prev.map((m) => (m.id === id ? { ...m, cargo: novoCargoEdit } : m)));
      setSheetAberto(false);
      toast.success("Cargo atualizado.");
    } finally {
      setSalvandoEdicaoId(null);
    }
  }

  async function remover(id: string) {
    if (!ligaId) return;
    setRemovendoId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao remover membro.");
        return;
      }
      setMembros((prev) => prev.filter((m) => m.id !== id));
      toast.success("Membro removido.");
    } finally {
      setRemovendoId(null);
      setConfirmandoRemoverId(null);
    }
  }

  function abrirEditar(membro: MembroAtivo) {
    setEditandoId(membro.id);
    setNovoCargoEdit(membro.cargo);
    setSheetModo("editar");
    setSheetAberto(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        titulo="Membros"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        acao={
          <button
            onClick={() => {
              setSheetModo("adicionar");
              setEmailConvite("");
              setCargoConvite("Membro");
              setSheetAberto(true);
            }}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
          >
            + Adicionar
          </button>
        }
      />

      {membros.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/40">Nenhum membro cadastrado.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Nome
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Cargo
              </th>
              <th className="py-3 px-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <tr
                key={m.id}
                className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 shrink-0 flex items-center justify-center text-white font-plex-mono text-[11px] overflow-hidden"
                      style={m.avatarUrl ? undefined : { backgroundColor: m.cor }}
                    >
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        m.iniciais
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                          {m.nome}
                        </span>
                        {m.novo && (
                          <span className="font-plex-mono text-[9px] uppercase tracking-[0.10em] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            Novo
                          </span>
                        )}
                      </div>
                      <span className="font-plex-mono text-[10px] text-foreground/40">
                        {m.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  {confirmandoRemoverId === m.id ? (
                    <div className="flex items-center gap-3">
                      <span className="font-plex-sans text-[12px] text-red-600">Remover?</span>
                      <button
                        onClick={() => void remover(m.id)}
                        disabled={removendoId === m.id}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-600 hover:text-red-800 transition-colors disabled:opacity-40"
                      >
                        {removendoId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Sim"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmandoRemoverId(null)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5 rounded-full",
                        cargoBadgeClass(m.cargo),
                      )}
                    >
                      {m.cargo}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer"
                        onClick={() => abrirEditar(m)}
                      >
                        Editar cargo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                        onClick={() => setConfirmandoRemoverId(m.id)}
                      >
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Sheet Adicionar/Editar */}
      <Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
        <SheetContent
          side="right"
          className="w-[480px] sm:w-[560px] flex flex-col gap-0 p-0 bg-background"
        >
          <div className="flex-shrink-0">
            <div className="h-px bg-navy/90" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
                Membros
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                {sheetModo === "adicionar" ? "Adicionar Membro" : "Editar Cargo"}
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
            {sheetModo === "adicionar" ? (
              <>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                    E-mail institucional
                  </label>
                  <input
                    type="email"
                    placeholder="usuario@faculdade.edu"
                    value={emailConvite}
                    onChange={(e) => setEmailConvite(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !enviandoConvite) void convidar();
                    }}
                    className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
                  />
                  <p className="font-plex-sans text-[11px] text-navy/40 mt-1.5">
                    O usuário precisa já estar cadastrado no sistema.
                  </p>
                </div>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                    Cargo
                  </label>
                  <select
                    value={cargoConvite}
                    onChange={(e) => setCargoConvite(e.target.value as Cargo)}
                    className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-navy/60"
                  >
                    <option value="Membro">Membro</option>
                    <option value="Diretor">Diretor</option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                  Cargo
                </label>
                <select
                  value={novoCargoEdit}
                  onChange={(e) => setNovoCargoEdit(e.target.value as Cargo)}
                  className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-navy/60"
                >
                  <option value="Membro">Membro</option>
                  <option value="Diretor">Diretor</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-6 flex gap-3">
              {sheetModo === "adicionar" ? (
                <button
                  onClick={() => void convidar()}
                  disabled={enviandoConvite}
                  className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {enviandoConvite && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Adicionar
                </button>
              ) : (
                <button
                  onClick={() => editandoId && void salvarEdicao(editandoId)}
                  disabled={salvandoEdicaoId !== null}
                  className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {salvandoEdicaoId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </button>
              )}
              <button
                onClick={() => setSheetAberto(false)}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-3 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Navegar para `/gerenciamento` → aba Membros. Verificar:

- Tabela com avatar, nome, email e badge de cargo rounded-full
- Botão "+ Adicionar" abra Sheet lateral
- Dropdown por linha com "Editar cargo" e "Remover"
- Remover mostra confirmação inline na linha

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx
git commit -m "feat(gerenciamento): redesign Membros tab — table + sheet lateral"
```

---

## Task 4: GerenciamentoPage — Aba Informações

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx` (componente `AbaInformacoes` da view Lider)

Remover as caixas `border border-navy/15 p-5`, substituir por `SectionHeader` por seção. Botão "Salvar alterações" move para dentro do SectionHeader de "Dados Gerais" quando `alterado === true`.

- [ ] **Step 1: Substituir o render de AbaInformacoes (lider)**

Localizar `function AbaInformacoes({ ligaId, initialInfo }` (a versão sem `onArquivar`, que está em `GerenciamentoPage.tsx`) e substituir todo o bloco `return (` por:

```tsx
const inputCls =
  "w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60";

return (
  <div className="space-y-8">
    {/* Dados Gerais */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Dados Gerais"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        acao={
          alterado ? (
            <div className="flex items-center gap-3">
              {salvo && <span className="font-plex-sans text-[12px] text-green-600">Salvo!</span>}
              {erro && <span className="font-plex-sans text-[12px] text-red-600">{erro}</span>}
              <button
                onClick={() => void salvar()}
                disabled={salvando}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors disabled:opacity-40"
              >
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          ) : null
        }
      />
      <div className="space-y-4">
        {[
          { label: "Nome da liga", field: "nome" as const, placeholder: "" },
          { label: "Área de atuação", field: "area" as const, placeholder: "" },
          { label: "Semestre de fundação", field: "semestre" as const, placeholder: "ex: 2023.1" },
        ].map(({ label, field, placeholder }) => (
          <div key={field}>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              {label}
            </label>
            <input
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={placeholder}
              className={inputCls}
            />
          </div>
        ))}
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
            Descrição
          </label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={3}
            className={cn(inputCls, "resize-none")}
          />
        </div>
      </div>
    </section>

    {/* Foto / Banner */}
    <section className="space-y-3">
      <SectionHeader
        titulo="Foto / Banner da Liga"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      {bannerPreview ? (
        <div className="relative overflow-hidden border border-navy/15 h-36">
          <img src={bannerPreview} alt="Banner da liga" className="w-full h-full object-cover" />
          <button
            onClick={() => {
              setBannerPreview("");
              setForm((prev) => ({ ...prev, bannerUrl: "" }));
            }}
            className="absolute top-2 right-2 bg-background/80 hover:bg-background text-red-500 p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="border border-dashed border-navy/20 h-36 flex flex-col items-center justify-center gap-2 text-navy/40">
          <Image className="h-6 w-6" />
          <span className="font-plex-sans text-[12px]">Nenhuma imagem selecionada</span>
        </div>
      )}
      <label className="inline-flex items-center gap-2 cursor-pointer font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors">
        <Plus className="h-3.5 w-3.5" />
        {bannerPreview ? "Trocar imagem" : "Selecionar imagem"}
        <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
      </label>
    </section>

    {/* Contatos */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Contatos da Liga"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <div className="space-y-4">
        {[
          {
            label: "E-mail de contato",
            field: "emailContato" as const,
            type: "email",
            placeholder: "contato@faculdade.edu",
          },
          {
            label: "Instagram",
            field: "instagram" as const,
            type: "text",
            placeholder: "@ligatech",
          },
          {
            label: "LinkedIn",
            field: "linkedin" as const,
            type: "text",
            placeholder: "liga-tech-faculdade",
          },
        ].map(({ label, field, type, placeholder }) => (
          <div key={field}>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              {label}
            </label>
            <input
              type={type}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={placeholder}
              className={inputCls}
            />
          </div>
        ))}
      </div>
    </section>
  </div>
);
```

- [ ] **Step 2: Verificar**

Navegar para `/gerenciamento` → aba Informações. Verificar:

- Sem caixas com borda — seções separadas por SectionHeader
- Botão "Salvar alterações" aparece no header de "Dados Gerais" ao editar qualquer campo
- Upload de imagem continua funcional

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx
git commit -m "feat(gerenciamento): redesign Informações tab — SectionHeader sections"
```

---

## Task 5: GerenciamentoPage — Aba Recursos

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx` (componente `AbaRecursos` da view Lider)

- [ ] **Step 1: Adicionar estado de Sheet e substituir render de AbaRecursos**

Localizar `function AbaRecursos({ ligaId }: { ligaId: string | null })` (versão Lider) e substituir todo o bloco `return (` por:

```tsx
// Adicionar ao estado existente da função (depois de const [carregando, ...]):
// const [sheetAberto, setSheetAberto] = useState(false);
// const [sheetModo, setSheetModo] = useState<"adicionar" | "editar">("adicionar");

if (carregando)
  return <p className="font-plex-sans text-[13px] text-navy/50">Carregando recursos…</p>;

return (
  <div className="space-y-6">
    <SectionHeader
      titulo="Recursos"
      tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      acao={
        <button
          onClick={() => {
            setNovoNome("");
            setNovoTipo("URL");
            setNovoUrl("");
            setNovoIcone("link");
            setNovoCor("#546484");
            setEditandoId(null);
            setSheetAberto(true);
          }}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
        >
          + Adicionar
        </button>
      }
    />

    {recursos.length === 0 ? (
      <p className="font-plex-sans text-[13px] text-navy/40">Nenhum recurso cadastrado ainda.</p>
    ) : (
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-foreground/[0.08]">
            <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
              Recurso
            </th>
            <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
              URL
            </th>
            <th className="py-3 px-4 w-10" />
          </tr>
        </thead>
        <tbody>
          {recursos.map((r) => (
            <tr
              key={r.id}
              className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
            >
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: r.cor }}
                  >
                    <RecursoIcone id={r.icone} />
                  </div>
                  <div>
                    <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                      {r.nome}
                    </span>
                    <span className="block font-plex-mono text-[10px] text-foreground/40">
                      {r.tipo}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 hidden sm:table-cell">
                <span className="font-plex-mono text-[11px] text-foreground/40 truncate max-w-[200px] block">
                  {r.url}
                </span>
              </td>
              <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuItem
                      className="text-[12px] cursor-pointer"
                      onClick={() => iniciarEdicao(r)}
                    >
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                      onClick={() => void remover(r.id)}
                    >
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    {/* Sheet Adicionar/Editar */}
    <Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
      <SheetContent
        side="right"
        className="w-[480px] sm:w-[560px] flex flex-col gap-0 p-0 bg-background"
      >
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
              Recursos
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
              {editandoId ? "Editar Recurso" : "Adicionar Recurso"}
            </h2>
          </div>
          <div className="h-px bg-navy/15" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <IconeCor
              icone={editandoId ? (editForm.icone ?? "link") : novoIcone}
              cor={editandoId ? (editForm.cor ?? "#546484") : novoCor}
              onChange={(ic, c) => {
                if (editandoId) setEditForm({ ...editForm, icone: ic, cor: c });
                else {
                  setNovoIcone(ic);
                  setNovoCor(c);
                }
              }}
            />
            <div className="flex-1">
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                Nome
              </label>
              <input
                value={editandoId ? (editForm.nome ?? "") : novoNome}
                onChange={(e) =>
                  editandoId
                    ? setEditForm({ ...editForm, nome: e.target.value })
                    : setNovoNome(e.target.value)
                }
                placeholder="Nome do recurso"
                className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
              />
            </div>
          </div>
          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              Tipo
            </label>
            <select
              value={editandoId ? (editForm.tipo ?? "URL") : novoTipo}
              onChange={(e) =>
                editandoId
                  ? setEditForm({ ...editForm, tipo: e.target.value })
                  : setNovoTipo(e.target.value)
              }
              className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-navy/60"
            >
              {["URL", "Documento", "Notion", "Planilha", "Apresentação", "Vídeo", "Outro"].map(
                (t) => (
                  <option key={t}>{t}</option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              URL
            </label>
            <input
              value={editandoId ? (editForm.url ?? "") : novoUrl}
              onChange={(e) =>
                editandoId
                  ? setEditForm({ ...editForm, url: e.target.value })
                  : setNovoUrl(e.target.value)
              }
              placeholder="https://..."
              className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
            />
          </div>
          {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
        </div>

        <div className="flex-shrink-0">
          <div className="h-px bg-navy/15" />
          <div className="px-8 py-6 flex gap-3">
            <button
              onClick={() => {
                if (editandoId) void salvarEdicao(editandoId).then(() => setSheetAberto(false));
                else
                  void adicionar().then(() => {
                    if (!erro) setSheetAberto(false);
                  });
              }}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors"
            >
              {editandoId ? "Salvar" : "Adicionar"}
            </button>
            <button
              onClick={() => setSheetAberto(false)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-3 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
);
```

**Nota:** Adicionar `const [sheetAberto, setSheetAberto] = useState(false);` ao estado da função `AbaRecursos` (lider), e atualizar `iniciarEdicao` para chamar `setSheetAberto(true)`.

- [ ] **Step 2: Atualizar `iniciarEdicao` na versão lider**

Dentro de `function AbaRecursos` (lider), localizar:

```tsx
function iniciarEdicao(r: Recurso) {
  setEditandoId(r.id);
  setEditForm({ nome: r.nome, tipo: r.tipo, url: r.url, icone: r.icone, cor: r.cor });
}
```

Substituir por:

```tsx
function iniciarEdicao(r: Recurso) {
  setEditandoId(r.id);
  setEditForm({ nome: r.nome, tipo: r.tipo, url: r.url, icone: r.icone, cor: r.cor });
  setSheetAberto(true);
}
```

- [ ] **Step 3: Verificar**

Navegar para `/gerenciamento` → aba Recursos. Verificar:

- Tabela com ícone colorido, nome, tipo, URL truncada
- Botão "+ Adicionar" abre Sheet
- "Editar" no dropdown abre Sheet com campos preenchidos
- "Remover" no dropdown deleta diretamente (sem confirmação — igual ao comportamento atual)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx
git commit -m "feat(gerenciamento): redesign Recursos tab — table + sheet lateral"
```

---

## Task 6: GerenciamentoPage — Aba Receita

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx` (componente `AbaReceita`)

- [ ] **Step 1: Adicionar estado de Sheet e substituir render**

Adicionar `const [sheetAberto, setSheetAberto] = useState(false);` ao estado de `AbaReceita`.

Substituir o bloco `return (` de `AbaReceita` por:

```tsx
if (carregando)
  return <p className="font-plex-sans text-[13px] text-navy/50">Carregando financeiro…</p>;

return (
  <div className="space-y-8">
    {/* KPIs */}
    <KpiRow
      items={[
        { label: "Receitas", valor: formatarMoeda(totalReceitas) },
        { label: "Custos", valor: formatarMoeda(totalCustos) },
        { label: "Saldo", valor: formatarMoeda(saldo) },
      ]}
      cols={3}
    />

    {/* Lista de lançamentos */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Lançamentos"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        acao={
          <button
            onClick={() => {
              setNovoTipo("receita");
              setNovaRecorrencia("unico");
              setNovaDescricao("");
              setNovaObs("");
              setNovoValor("");
              setNovaData(new Date().toISOString().slice(0, 10));
              setSheetAberto(true);
            }}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
          >
            + Adicionar
          </button>
        }
      />

      {registros.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/40">Nenhum lançamento ainda.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Descrição
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
                Data
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden md:table-cell">
                Recorrência
              </th>
              <th className="text-right py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Valor
              </th>
              <th className="py-3 px-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr
                key={r.id}
                className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-plex-mono text-[10px] uppercase px-1.5 py-0.5 rounded-full font-bold shrink-0",
                        r.tipo === "receita"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600",
                      )}
                    >
                      {r.tipo === "receita" ? "+" : "−"}
                    </span>
                    <div>
                      <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                        {r.descricao}
                      </span>
                      {r.observacao && (
                        <span className="block font-plex-sans text-[11px] text-foreground/40">
                          {r.observacao}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 font-plex-mono text-[11px] text-foreground/50 hidden sm:table-cell">
                  {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}
                </td>
                <td className="py-4 px-4 hidden md:table-cell">
                  <span
                    className={cn(
                      "font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5 rounded-full",
                      r.recorrencia === "recorrente"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-foreground/[0.06] text-foreground/50",
                    )}
                  >
                    {r.recorrencia === "recorrente" ? "Recorrente" : "Único"}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span
                    className={cn(
                      "font-plex-mono text-[12px]",
                      r.tipo === "receita" ? "text-green-600" : "text-red-500",
                    )}
                  >
                    {r.tipo === "receita" ? "+" : "−"}
                    {formatarMoeda(r.valor)}
                  </span>
                </td>
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                        onClick={() => void remover(r.id)}
                      >
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>

    {/* Sheet Adicionar Lançamento */}
    <Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
      <SheetContent
        side="right"
        className="w-[480px] sm:w-[560px] flex flex-col gap-0 p-0 bg-background"
      >
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
              Financeiro
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
              Adicionar Lançamento
            </h2>
          </div>
          <div className="h-px bg-navy/15" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNovoTipo("receita")}
              className={cn(
                "flex-1 py-2 font-plex-mono text-[10px] tracking-[0.14em] uppercase border-2 transition-colors rounded-full",
                novoTipo === "receita"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-navy/15 text-navy/40 hover:border-green-300",
              )}
            >
              + Receita
            </button>
            <button
              type="button"
              onClick={() => setNovoTipo("custo")}
              className={cn(
                "flex-1 py-2 font-plex-mono text-[10px] tracking-[0.14em] uppercase border-2 transition-colors rounded-full",
                novoTipo === "custo"
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-navy/15 text-navy/40 hover:border-red-300",
              )}
            >
              − Custo
            </button>
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              Recorrência
            </label>
            <select
              value={novaRecorrencia}
              onChange={(e) => setNovaRecorrencia(e.target.value as "unico" | "recorrente")}
              className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-navy/60"
            >
              <option value="unico">Único</option>
              <option value="recorrente">Recorrente</option>
            </select>
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              Descrição
            </label>
            <input
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              placeholder="Ex: Patrocínio empresa X"
              className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
            />
          </div>

          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              Observação (opcional)
            </label>
            <input
              value={novaObs}
              onChange={(e) => setNovaObs(e.target.value)}
              placeholder="Detalhes adicionais"
              className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-plex-sans text-[13px] text-foreground/40 pointer-events-none">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,00"
                className="w-full border border-navy/20 pl-9 pr-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
              />
            </div>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="w-40 border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-navy/60"
            />
          </div>

          {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
        </div>

        <div className="flex-shrink-0">
          <div className="h-px bg-navy/15" />
          <div className="px-8 py-6 flex gap-3">
            <button
              onClick={() => void adicionar()}
              disabled={enviando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Adicionar
            </button>
            <button
              onClick={() => setSheetAberto(false)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-3 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
);
```

**Nota:** Atualizar a função `adicionar` existente para, em caso de sucesso, chamar `setSheetAberto(false)`.

- [ ] **Step 2: Verificar**

Navegar para `/gerenciamento` → aba Receita. Verificar:

- 3 cards KPI (Receitas, Custos, Saldo)
- Tabela de lançamentos com badge +/− arredondado
- Sheet lateral de adição funcional
- Totais calculam corretamente

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx
git commit -m "feat(gerenciamento): redesign Receita tab — KpiRow + table + sheet"
```

---

## Task 7: GerenciamentoPage — Aba Desempenho (view Lider)

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx` (componente `AbaDesempenho` na view Lider)

- [ ] **Step 1: Substituir render de AbaDesempenho (lider)**

Localizar `function AbaDesempenho({ ligaId }` (versão que usa `ligaId`, não `liga`) e substituir o bloco `return (` por:

```tsx
return (
  <div className="space-y-8">
    {/* Score */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Score Atual"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <div className="border border-navy/15 p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="font-display font-bold text-4xl text-navy">{score}</span>
            <span className="font-plex-sans text-lg text-navy/40 ml-1">pts</span>
          </div>
          {posicao !== null && (
            <span className="font-plex-mono text-[10px] uppercase tracking-[0.14em] bg-brand-yellow text-navy px-2 py-0.5 rounded-full">
              {posicao}º lugar
            </span>
          )}
        </div>
        <div className="w-full bg-navy/10 h-px overflow-hidden">
          <div
            className="h-px transition-all duration-500"
            style={{
              width: `${porcentagem}%`,
              background: "linear-gradient(90deg, #10284E, #546484)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 font-plex-mono text-[10px] text-navy/40">
          <span>0 pts</span>
          <span>{porcentagem}% do máximo</span>
          <span>{scoreMax} pts</span>
        </div>
      </div>
    </section>

    {/* KPIs */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Resumo"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <KpiRow
        items={resumo.map((r) => ({ label: r.label, valor: r.valor }))}
        cols={resumo.length <= 3 ? 3 : 4}
      />
    </section>

    {/* Indicadores */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Indicadores"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <div className="space-y-4">
        {composicao.map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                {c.label}
              </span>
              <span className="font-plex-mono text-[12px] text-foreground">{c.valor}</span>
            </div>
            <div className="w-full bg-navy/10 h-px overflow-hidden">
              <div
                className={cn("h-px", c.cor)}
                style={{ width: `${Math.round((c.valor / composicaoMax) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);
```

- [ ] **Step 2: Verificar**

Navegar para `/gerenciamento` → aba Desempenho. Verificar:

- Score com barra de progresso e badge de posição rounded-full
- KpiRow com cards de resumo
- Indicadores com barras de progresso

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/gerenciamento/GerenciamentoPage.tsx
git commit -m "feat(gerenciamento): redesign Desempenho tab — KpiRow + SectionHeader"
```

---

## Task 8: GerenciamentoStaffPage — redesign completo

**Files:**

- Modify: `apps/web/src/pages/gerenciamento/GerenciamentoStaffPage.tsx`

As três abas da view Staff (`AbaInformacoes`, `AbaRecursos`, `AbaDesempenho`) e a página principal precisam do mesmo tratamento das tasks anteriores.

- [ ] **Step 1: Adicionar imports no topo de GerenciamentoStaffPage.tsx**

```tsx
import {
  MoreHorizontal,
  X,
  Plus,
  Pencil,
  Trash2,
  Link,
  FileText,
  Image,
  Globe,
  Folder,
  BookOpen,
  Code2,
  Video,
  Music,
  Star,
  ChevronDown,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SectionHeader, KpiRow, RankingList } from "@/pages/home/v1/primitives";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import type { RankingLiga } from "@link-leagues/types";
```

- [ ] **Step 2: Substituir render de AbaInformacoes (staff)**

Localizar `function AbaInformacoes({` em `GerenciamentoStaffPage.tsx` e substituir o bloco `return (` por:

```tsx
const inputCls =
  "w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60";

return (
  <div className="space-y-8">
    {/* Dados Gerais */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Dados Gerais"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        acao={
          alterado ? (
            <div className="flex items-center gap-3">
              {salvo && <span className="font-plex-sans text-[12px] text-green-600">Salvo!</span>}
              {erro && <span className="font-plex-sans text-[12px] text-red-600">{erro}</span>}
              <button
                onClick={() => void salvar()}
                disabled={salvando}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors disabled:opacity-40"
              >
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          ) : null
        }
      />
      <div className="space-y-4">
        {[
          { label: "Nome da liga", field: "nome" as const, placeholder: "" },
          { label: "Área de atuação", field: "area" as const, placeholder: "" },
          { label: "Semestre de fundação", field: "semestre" as const, placeholder: "ex: 2023.1" },
        ].map(({ label, field, placeholder }) => (
          <div key={field}>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              {label}
            </label>
            <input
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={placeholder}
              className={inputCls}
            />
          </div>
        ))}
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
            Descrição
          </label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={3}
            className={cn(inputCls, "resize-none")}
          />
        </div>
      </div>
    </section>

    {/* Foto / Banner */}
    <section className="space-y-3">
      <SectionHeader
        titulo="Foto / Banner da Liga"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      {bannerPreview ? (
        <div className="relative overflow-hidden border border-navy/15 h-36">
          <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
          <button
            onClick={() => {
              setBannerPreview("");
              setBannerFile(null);
              setForm((prev) => ({ ...prev, bannerUrl: "" }));
            }}
            className="absolute top-2 right-2 bg-background/80 hover:bg-background text-red-500 p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="border border-dashed border-navy/20 h-36 flex flex-col items-center justify-center gap-2 text-navy/40">
          <Image className="h-6 w-6" />
          <span className="font-plex-sans text-[12px]">Nenhuma imagem selecionada</span>
        </div>
      )}
      <label className="inline-flex items-center gap-2 cursor-pointer font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors">
        <Plus className="h-3.5 w-3.5" />
        {bannerPreview ? "Trocar imagem" : "Selecionar imagem"}
        <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
      </label>
    </section>

    {/* Contatos */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Contatos da Liga"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <div className="space-y-4">
        {[
          {
            label: "E-mail de contato",
            field: "emailContato" as const,
            type: "email",
            placeholder: "contato@faculdade.edu",
          },
          { label: "Instagram", field: "instagram" as const, type: "text", placeholder: "@liga" },
          {
            label: "LinkedIn",
            field: "linkedin" as const,
            type: "text",
            placeholder: "liga-faculdade",
          },
        ].map(({ label, field, type, placeholder }) => (
          <div key={field}>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              {label}
            </label>
            <input
              type={type}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={placeholder}
              className={inputCls}
            />
          </div>
        ))}
      </div>
    </section>

    {/* Professor Mentor */}
    <section className="space-y-3">
      <SectionHeader
        titulo="Professor Mentor"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <input
        value={form.professorMentor}
        onChange={(e) => setForm({ ...form, professorMentor: e.target.value })}
        placeholder="Nome do professor mentor"
        className={inputCls}
      />
    </section>

    {/* Zona de Perigo */}
    <section className="space-y-3">
      <SectionHeader
        titulo="Zona de Perigo"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-red-500"
      />
      <p className="font-plex-sans text-[13px] text-foreground/50">
        Arquivar a liga a tornará inativa e não aparecerá mais para os membros. Pode ser revertido
        pelo Super Admin.
      </p>
      {confirmandoArquivar ? (
        <div className="flex items-center gap-4">
          <span className="font-plex-sans text-[12px] text-red-600">
            Confirmar arquivamento de &quot;{form.nome}&quot;?
          </span>
          <button
            onClick={() => void arquivar()}
            className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-600 hover:text-red-800 transition-colors"
          >
            Sim, arquivar
          </button>
          <button
            onClick={() => setConfirmandoArquivar(false)}
            className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmandoArquivar(true)}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-full transition-colors"
        >
          Arquivar liga
        </button>
      )}
    </section>
  </div>
);
```

- [ ] **Step 3: Substituir render de AbaRecursos (staff)**

Localizar `function AbaRecursos({ ligaId }: { ligaId: string })` em `GerenciamentoStaffPage.tsx` e adicionar estado:

```tsx
const [sheetAberto, setSheetAberto] = useState(false);
```

Substituir o bloco `return (` pelo mesmo padrão da Task 5 (tabela + SectionHeader + Sheet), adaptando para usar o estado local da versão staff (sem `novoEnviando` e sem upload de arquivo).

**Nota:** A versão staff de `AbaRecursos` é mais simples — não tem upload de arquivo. O Sheet deve ter apenas: picker de ícone+cor, campo Nome, campo Tipo (input livre), campo URL.

```tsx
if (carregando)
  return <p className="font-plex-sans text-[13px] text-navy/50">Carregando recursos…</p>;

return (
  <div className="space-y-6">
    <SectionHeader
      titulo="Recursos"
      tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      acao={
        <button
          onClick={() => {
            setNovoNome("");
            setNovoTipo("Link");
            setNovoUrl("");
            setNovoIcone("link");
            setNovoCor("#546484");
            setEditandoId(null);
            setSheetAberto(true);
          }}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
        >
          + Adicionar
        </button>
      }
    />

    {recursos.length === 0 ? (
      <p className="font-plex-sans text-[13px] text-navy/40">Nenhum recurso cadastrado.</p>
    ) : (
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-foreground/[0.08]">
            <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
              Recurso
            </th>
            <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
              URL
            </th>
            <th className="py-3 px-4 w-10" />
          </tr>
        </thead>
        <tbody>
          {recursos.map((r) => (
            <tr
              key={r.id}
              className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
            >
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: r.cor }}
                  >
                    <RecursoIcone id={r.icone} />
                  </div>
                  <div>
                    <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                      {r.nome}
                    </span>
                    <span className="block font-plex-mono text-[10px] text-foreground/40">
                      {r.tipo}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 hidden sm:table-cell">
                <span className="font-plex-mono text-[11px] text-foreground/40 truncate max-w-[200px] block">
                  {r.url}
                </span>
              </td>
              <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuItem
                      className="text-[12px] cursor-pointer"
                      onClick={() => iniciarEdicao(r)}
                    >
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                      onClick={() => void remover(r.id)}
                    >
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    <Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
      <SheetContent
        side="right"
        className="w-[480px] sm:w-[560px] flex flex-col gap-0 p-0 bg-background"
      >
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/90" />
          <div className="px-8 pt-8 pb-6">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
              Recursos
            </p>
            <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
              {editandoId ? "Editar Recurso" : "Adicionar Recurso"}
            </h2>
          </div>
          <div className="h-px bg-navy/15" />
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <IconeCor
              icone={editandoId ? (editForm.icone ?? "link") : novoIcone}
              cor={editandoId ? (editForm.cor ?? "#546484") : novoCor}
              onChange={(ic, c) => {
                if (editandoId) setEditForm({ ...editForm, icone: ic, cor: c });
                else {
                  setNovoIcone(ic);
                  setNovoCor(c);
                }
              }}
            />
            <div className="flex-1">
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                Nome
              </label>
              <input
                value={editandoId ? (editForm.nome ?? "") : novoNome}
                onChange={(e) =>
                  editandoId
                    ? setEditForm({ ...editForm, nome: e.target.value })
                    : setNovoNome(e.target.value)
                }
                placeholder="Nome do recurso"
                className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
              />
            </div>
          </div>
          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              URL
            </label>
            <input
              value={editandoId ? (editForm.url ?? "") : novoUrl}
              onChange={(e) =>
                editandoId
                  ? setEditForm({ ...editForm, url: e.target.value })
                  : setNovoUrl(e.target.value)
              }
              placeholder="https://..."
              className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
            />
          </div>
          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              Tipo
            </label>
            <input
              value={editandoId ? (editForm.tipo ?? "") : novoTipo}
              onChange={(e) =>
                editandoId
                  ? setEditForm({ ...editForm, tipo: e.target.value })
                  : setNovoTipo(e.target.value)
              }
              placeholder="Ex: Documento, Notion..."
              className="w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60"
            />
          </div>
          {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
        </div>
        <div className="flex-shrink-0">
          <div className="h-px bg-navy/15" />
          <div className="px-8 py-6 flex gap-3">
            <button
              onClick={() => {
                if (editandoId) void salvarEdicao(editandoId).then(() => setSheetAberto(false));
                else
                  void adicionar().then(() => {
                    if (!erro) setSheetAberto(false);
                  });
              }}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors"
            >
              {editandoId ? "Salvar" : "Adicionar"}
            </button>
            <button
              onClick={() => setSheetAberto(false)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-3 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
);
```

Atualizar `iniciarEdicao` para chamar `setSheetAberto(true)`.

- [ ] **Step 4: Substituir render de AbaDesempenho (staff)**

Localizar `function AbaDesempenho({ liga, todasLigas }` e substituir o bloco `return (` por:

```tsx
return (
  <div className="space-y-8">
    {/* Score */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Score Atual"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <div className="border border-navy/15 p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="font-display font-bold text-4xl text-navy">{score}</span>
            <span className="font-plex-sans text-lg text-navy/40 ml-1">pts</span>
          </div>
          {posicao > 0 && (
            <span className="font-plex-mono text-[10px] uppercase tracking-[0.14em] bg-brand-yellow text-navy px-2 py-0.5 rounded-full">
              {posicao}º lugar
            </span>
          )}
        </div>
        <div className="w-full bg-navy/10 h-px overflow-hidden">
          <div
            className="h-px transition-all duration-500"
            style={{
              width: `${porcentagem}%`,
              background: "linear-gradient(90deg, #10284E, #546484)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 font-plex-mono text-[10px] text-navy/40">
          <span>0 pts</span>
          <span>{porcentagem}% do máximo</span>
          <span>{scoreMax} pts</span>
        </div>
      </div>
    </section>

    {/* KPIs resumo */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Resumo"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <KpiRow
        items={[
          { label: "Projetos concluídos", valor: String(minha?.projetos_concluidos ?? 0) },
          { label: "Em andamento", valor: String(minha?.projetos_em_andamento ?? 0) },
          { label: "Presenças", valor: String(minha?.presencas ?? 0) },
          { label: "Publicações", valor: String(minha?.posts ?? 0) },
        ]}
        cols={4}
      />
    </section>

    {/* Indicadores */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Indicadores"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <div className="space-y-4">
        {composicao.map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                {c.label}
              </span>
              <span className="font-plex-mono text-[12px] text-foreground">{c.valor}</span>
            </div>
            <div className="w-full bg-navy/10 h-px overflow-hidden">
              <div
                className={cn("h-px", c.cor)}
                style={{ width: `${Math.round((c.valor / composicaoMax) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Ranking comparativo */}
    <section className="space-y-4">
      <SectionHeader
        titulo="Comparativo — Ranking Geral"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
      />
      <RankingList
        items={rankingOrdenado.map((l) => ({
          id: l.id,
          nome: l.nome,
          score: l.pontos,
          destaque: l.id === liga.id,
        }))}
      />
    </section>
  </div>
);
```

- [ ] **Step 5: Verificar**

Navegar para `/gerenciamento` como usuário Staff. Verificar:

- Seletor de liga funciona
- Aba Informações sem caixas — seções com SectionHeader
- Aba Recursos com tabela + Sheet
- Aba Desempenho com Score + KpiRow + RankingList (usando o componente de primitives)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/gerenciamento/GerenciamentoStaffPage.tsx
git commit -m "feat(gerenciamento): redesign Staff view — SectionHeader + KpiRow + RankingList"
```

---

## Task 9: Typecheck final

- [ ] **Step 1: Executar typecheck**

```bash
npm run typecheck
```

Corrigir qualquer erro de tipo encontrado (geralmente props não usadas, imports desnecessários, ou `any` implícito).

- [ ] **Step 2: Commit de correções (se necessário)**

```bash
git add -p
git commit -m "fix(gerenciamento): typecheck corrections after redesign"
```
