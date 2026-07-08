# Tour Guiado de Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tour spotlight sobre a sidebar que apresenta cada página da plataforma, disparado uma vez por usuário no login e revisível pelo menu do usuário.

**Architecture:** driver.js fornece o mecanismo (overlay, posicionamento, teclado). Os passos vivem em `apps/web/src/lib/onboarding-tour.ts` e são filtrados por presença no DOM (`data-tour` nos itens da sidebar) — assim a diferença de papéis/permissões é tratada de graça. A conclusão é persistida em `usuarios.onboarding_concluido_em` via o `PATCH /usuarios/me` existente (timestamp gravado no servidor).

**Tech Stack:** React 18 + Vite, driver.js, Express + postgres (`sql` tagged template), vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-07-07-onboarding-tour-design.md`

---

## Contexto para quem nunca viu o repositório

- Monorepo npm workspaces. Frontend em `apps/web` (porta 3000), API em `apps/api` (porta 3001). Rode comandos npm na **raiz** do repo.
- A API usa `sql` (tagged template de `apps/api/src/config/db.js`) nos handlers de `usuarios.ts` — **não** o client Supabase.
- Migrações SQL numeradas vivem em `migrations/` na raiz (última: `031_participacao_conjunto.sql`). Elas são aplicadas manualmente no banco — criar o arquivo é suficiente para o PR.
- Papéis reais (`UserRole` em `packages/types/src/user.ts`): `staff | diretor | membro | estudante | professor`.
- A sidebar (`apps/web/src/components/app-sidebar.tsx`) monta os itens conforme o papel; itens de gestão (Super Admin, Gerenciamento, Dados) só aparecem para staff/diretor ou com permissão assíncrona. Por isso o tour filtra passos **pelo DOM**, não por papel.
- Testes do frontend: `vitest` + jsdom, arquivos `src/**/*.test.ts(x)` em `apps/web`. Rode com `npm run test --workspace @link-leagues/web` (o nome exato do workspace está no `apps/web/package.json`; se falhar, use `cd apps/web && npm test`).
- Microcopy em PT-BR, imperativo educado. Commits com prefixo `feat:`/`test:`/`docs:` (histórico recente usa esse padrão). Há lint-staged com prettier no commit.

---

### Task 1: Migração + tipo compartilhado

**Files:**

- Create: `migrations/032_usuarios_onboarding.sql`
- Modify: `packages/types/src/user.ts`

- [ ] **Step 1: Criar a migração**

```sql
-- Migration 032: Tour de onboarding
-- Guarda quando o usuário concluiu (ou pulou) o tour guiado da plataforma.
-- NULL = ainda não viu; o tour dispara automaticamente no próximo login.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS onboarding_concluido_em TIMESTAMPTZ;
```

- [ ] **Step 2: Adicionar o campo à interface `Usuario`**

Em `packages/types/src/user.ts`, adicione a linha `onboarding_concluido_em` à interface existente:

```ts
export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  avatar_url?: string;
  biografia?: string;
  onboarding_concluido_em?: string | null;
  criado_em: string;
  atualizado_em: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add migrations/032_usuarios_onboarding.sql packages/types/src/user.ts
git commit -m "feat: coluna e tipo de conclusão do onboarding"
```

---

### Task 2: API — expor e gravar `onboarding_concluido_em`

**Files:**

- Modify: `apps/api/src/routes/usuarios.ts:59-115` (handlers `GET /me` e `PATCH /me`)

O cliente envia apenas o boolean `onboarding_concluido: true`; o timestamp é gravado com `NOW()` no servidor (não confiamos em relógio de cliente). `COALESCE(onboarding_concluido_em, NOW())` preserva a primeira conclusão em replays do tour.

- [ ] **Step 1: Incluir o campo no `GET /me`**

No handler `GET /usuarios/me`, altere o SELECT para:

```ts
const [usuario] = await sql`
  SELECT id, nome, email, role, avatar_url, biografia, instagram, linkedin, semestre,
         onboarding_concluido_em
  FROM usuarios
  WHERE email = ${(req as AuthenticatedRequest).user!.email}
  LIMIT 1
`;
```

- [ ] **Step 2: Aceitar o flag no `PATCH /me`**

No handler `PATCH /usuarios/me`, altere o cast do body e o UPDATE:

```ts
const { nome, biografia, instagram, linkedin, semestre, onboarding_concluido } = req.body as {
  nome?: string;
  biografia?: string;
  instagram?: string;
  linkedin?: string;
  semestre?: string;
  onboarding_concluido?: boolean;
};
```

```ts
const [usuario] = await sql`
  UPDATE usuarios
  SET
    nome      = COALESCE(${nome ?? null}, nome),
    biografia = COALESCE(${biografia ?? null}, biografia),
    instagram = COALESCE(${instagram ?? null}, instagram),
    linkedin  = COALESCE(${linkedin ?? null}, linkedin),
    semestre  = COALESCE(${semestre ?? null}, semestre),
    onboarding_concluido_em = CASE
      WHEN ${onboarding_concluido === true} THEN COALESCE(onboarding_concluido_em, NOW())
      ELSE onboarding_concluido_em
    END
  WHERE email = ${(req as AuthenticatedRequest).user!.email}
  RETURNING id, nome, email, role, avatar_url, biografia, instagram, linkedin, semestre,
            onboarding_concluido_em
`;
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/usuarios.ts
git commit -m "feat: expor e gravar onboarding_concluido_em em /usuarios/me"
```

---

### Task 3: Definição dos passos + filtragem por DOM (TDD)

**Files:**

- Create: `apps/web/src/lib/onboarding-tour.ts` (parcial — sem driver.js ainda)
- Test: `apps/web/src/lib/onboarding-tour.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/src/lib/onboarding-tour.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { PASSOS_TOUR, filtrarPassosPresentes, type PassoTour } from "./onboarding-tour";

describe("filtrarPassosPresentes", () => {
  const passos: PassoTour[] = [
    { titulo: "Boas-vindas", descricao: "Passo sem seletor, sempre presente." },
    { seletor: '[data-tour="existe"]', titulo: "Existe", descricao: "Elemento no DOM." },
    { seletor: '[data-tour="nao-existe"]', titulo: "Não existe", descricao: "Fora do DOM." },
  ];

  it("mantém passos sem seletor", () => {
    const raiz = document.createElement("div");
    const resultado = filtrarPassosPresentes(passos, raiz);
    expect(resultado.map((p) => p.titulo)).toContain("Boas-vindas");
  });

  it("mantém passos cujo seletor encontra elemento", () => {
    const raiz = document.createElement("div");
    raiz.innerHTML = '<button data-tour="existe">Existe</button>';
    const resultado = filtrarPassosPresentes(passos, raiz);
    expect(resultado.map((p) => p.titulo)).toEqual(["Boas-vindas", "Existe"]);
  });

  it("remove passos cujo seletor não encontra elemento", () => {
    const raiz = document.createElement("div");
    const resultado = filtrarPassosPresentes(passos, raiz);
    expect(resultado.map((p) => p.titulo)).not.toContain("Não existe");
  });
});

describe("PASSOS_TOUR", () => {
  it("começa com o passo de boas-vindas, sem seletor", () => {
    expect(PASSOS_TOUR[0].seletor).toBeUndefined();
    expect(PASSOS_TOUR[0].titulo).toMatch(/boas-vindas/i);
  });

  it("todos os demais passos usam seletores data-tour", () => {
    for (const passo of PASSOS_TOUR.slice(1)) {
      expect(passo.seletor).toMatch(/^\[data-tour="[a-z-]+"\]$/);
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test --workspace @link-leagues/web -- src/lib/onboarding-tour.test.ts`
Expected: FAIL — módulo `./onboarding-tour` não existe.

- [ ] **Step 3: Implementar passos e filtragem**

Crie `apps/web/src/lib/onboarding-tour.ts`:

```ts
export interface PassoTour {
  /** Seletor CSS do elemento a destacar. Ausente = balão centralizado. */
  seletor?: string;
  titulo: string;
  descricao: string;
}

/**
 * Fonte única do conteúdo do tour. A sequência final é filtrada por
 * presença no DOM — itens que o papel do usuário não vê saem sozinhos.
 */
export const PASSOS_TOUR: PassoTour[] = [
  {
    titulo: "Boas-vindas à Link Leagues Platform",
    descricao:
      "Conheça em poucos passos o que cada área da plataforma faz. Use as setas do teclado para navegar ou saia quando quiser.",
  },
  {
    seletor: '[data-tour="home"]',
    titulo: "Home",
    descricao: "Veja a visão geral do seu dia: pendências, próximos eventos e atalhos rápidos.",
  },
  {
    seletor: '[data-tour="ligas"]',
    titulo: "Ligas",
    descricao: "Conheça as ligas acadêmicas da Link e acompanhe a sua.",
  },
  {
    seletor: '[data-tour="projetos"]',
    titulo: "Projetos",
    descricao: "Acompanhe os projetos da sua liga: status, entregas e responsáveis.",
  },
  {
    seletor: '[data-tour="tarefas"]',
    titulo: "Tarefas",
    descricao: "Veja as tarefas atribuídas a você e marque o que já concluiu.",
  },
  {
    seletor: '[data-tour="eventos"]',
    titulo: "Eventos",
    descricao: "Consulte o calendário, marque encontros e solicite eventos para a sua liga.",
  },
  {
    seletor: '[data-tour="mural"]',
    titulo: "Mural",
    descricao: "Acompanhe avisos e comunicados da coordenação e das ligas.",
  },
  {
    seletor: '[data-tour="ranking"]',
    titulo: "Ranking",
    descricao: "Acompanhe a pontuação das ligas ao longo do semestre.",
  },
  {
    seletor: '[data-tour="super-admin"]',
    titulo: "Super Admin",
    descricao: "Administre usuários e configurações globais da plataforma.",
  },
  {
    seletor: '[data-tour="gerenciamento"]',
    titulo: "Gerenciamento",
    descricao: "Gerencie ligas, membros e processos sob sua responsabilidade.",
  },
  {
    seletor: '[data-tour="dados"]',
    titulo: "Dados",
    descricao: "Analise o uso da plataforma e os indicadores das ligas.",
  },
];

export function filtrarPassosPresentes(
  passos: PassoTour[],
  raiz: Document | HTMLElement = document,
): PassoTour[] {
  return passos.filter((p) => !p.seletor || raiz.querySelector(p.seletor) !== null);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test --workspace @link-leagues/web -- src/lib/onboarding-tour.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/onboarding-tour.ts apps/web/src/lib/onboarding-tour.test.ts
git commit -m "feat: passos do tour de onboarding com filtragem por DOM"
```

---

### Task 4: driver.js + `iniciarTourPlataforma` + estilos

**Files:**

- Modify: `apps/web/src/lib/onboarding-tour.ts` (acrescentar no fim)
- Modify: `apps/web/src/index.css` (acrescentar no fim)
- Modify: `apps/web/package.json` (via npm install)

- [ ] **Step 1: Instalar driver.js**

```bash
npm install driver.js --workspace @link-leagues/web
```

Expected: `driver.js` (v1.x) em `apps/web/package.json` dependencies.

- [ ] **Step 2: Acrescentar o motor do tour em `onboarding-tour.ts`**

Adicione no **topo** do arquivo os imports:

```ts
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
```

E no **fim** do arquivo:

```ts
/**
 * Inicia o tour sobre a interface atual. `aoFinalizar` é chamado uma única
 * vez quando o usuário conclui, pula ou fecha o tour (Esc / Pular tour).
 */
export function iniciarTourPlataforma(aoFinalizar: () => void): void {
  const passos = filtrarPassosPresentes(PASSOS_TOUR);
  if (passos.length === 0) {
    aoFinalizar();
    return;
  }

  const reduzMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const steps: DriveStep[] = passos.map((p) => ({
    element: p.seletor,
    popover: { title: p.titulo, description: p.descricao },
  }));

  const instancia: Driver = driver({
    steps,
    animate: !reduzMotion,
    overlayOpacity: 0.45,
    stagePadding: 4,
    stageRadius: 6,
    allowClose: true,
    popoverClass: "tour-plataforma",
    progressText: "Passo {{current}} de {{total}}",
    showProgress: true,
    nextBtnText: "Próximo",
    prevBtnText: "Anterior",
    doneBtnText: "Concluir",
    onPopoverRender: (popover, { state }) => {
      // Barra de progresso fina em amarelo (design aprovado no mockup v2)
      const total = steps.length;
      const atual = (state.activeIndex ?? 0) + 1;
      const trilha = document.createElement("div");
      trilha.className = "tour-progresso";
      const preenchimento = document.createElement("div");
      preenchimento.className = "tour-progresso-preenchimento";
      preenchimento.style.width = `${Math.round((atual / total) * 100)}%`;
      trilha.appendChild(preenchimento);
      popover.description.insertAdjacentElement("afterend", trilha);

      // Botão "Pular tour" à esquerda do rodapé
      const pular = document.createElement("button");
      pular.type = "button";
      pular.className = "tour-pular";
      pular.innerText = "Pular tour";
      pular.onclick = () => instancia.destroy();
      popover.footer.prepend(pular);
    },
    onDestroyed: () => {
      aoFinalizar();
    },
  });

  instancia.drive();
}
```

- [ ] **Step 3: Estilizar com os tokens do tema**

Acrescente no fim de `apps/web/src/index.css` (as variáveis `--popover`, `--border`, `--primary` etc. já existem nos temas claro/escuro do shadcn):

```css
/* ===== Tour de onboarding (driver.js) ===== */
.driver-popover.tour-plataforma {
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 16px;
  max-width: 300px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
  font-family: inherit;
}

.dark .driver-popover.tour-plataforma {
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.35);
}

.driver-popover.tour-plataforma .driver-popover-title {
  color: hsl(var(--foreground));
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.driver-popover.tour-plataforma .driver-popover-description {
  color: hsl(var(--foreground));
  font-size: 14px;
  line-height: 1.5;
  margin-top: 4px;
}

.driver-popover.tour-plataforma .driver-popover-progress-text {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 500;
}

.driver-popover.tour-plataforma .tour-progresso {
  height: 3px;
  border-radius: 9999px;
  background: hsl(var(--border));
  margin-top: 12px;
  overflow: hidden;
}

.driver-popover.tour-plataforma .tour-progresso-preenchimento {
  height: 100%;
  border-radius: 9999px;
  background: #fec641;
  transition: width 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .driver-popover.tour-plataforma .tour-progresso-preenchimento {
    transition: none;
  }
}

.driver-popover.tour-plataforma .driver-popover-footer {
  margin-top: 12px;
  align-items: center;
  gap: 8px;
}

.driver-popover.tour-plataforma .tour-pular {
  margin-right: auto;
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
}

.driver-popover.tour-plataforma .tour-pular:hover {
  color: hsl(var(--foreground));
}

.driver-popover.tour-plataforma .driver-popover-footer button:not(.tour-pular) {
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  text-shadow: none;
  transition: background-color 150ms ease-out;
}

.driver-popover.tour-plataforma .driver-popover-prev-btn {
  background: transparent;
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}

.driver-popover.tour-plataforma .driver-popover-next-btn {
  background: hsl(var(--primary));
  border: none;
  color: hsl(var(--primary-foreground));
}

.driver-popover.tour-plataforma .driver-popover-next-btn:hover {
  background: hsl(var(--primary) / 0.9);
}

/* Anel amarelo no elemento destacado */
.driver-active-element {
  box-shadow: 0 0 0 2px #fec641 !important;
  border-radius: 6px;
}

/* Setinha do popover acompanha o fundo do tema */
.driver-popover.tour-plataforma .driver-popover-arrow-side-left.driver-popover-arrow {
  border-left-color: hsl(var(--popover));
}
.driver-popover.tour-plataforma .driver-popover-arrow-side-right.driver-popover-arrow {
  border-right-color: hsl(var(--popover));
}
.driver-popover.tour-plataforma .driver-popover-arrow-side-top.driver-popover-arrow {
  border-top-color: hsl(var(--popover));
}
.driver-popover.tour-plataforma .driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-bottom-color: hsl(var(--popover));
}
```

Nota: `#FEC641` hardcoded é aceitável aqui — o amarelo está colado a informação de estado (passo atual do tour), padrão já documentado no DESIGN.md para o par texto-sobre-amarelo.

- [ ] **Step 4: Typecheck e testes**

Run: `npm run typecheck && npm run test --workspace @link-leagues/web -- src/lib/onboarding-tour.test.ts`
Expected: sem erros; testes da Task 3 continuam passando.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/src/lib/onboarding-tour.ts apps/web/src/index.css
git commit -m "feat: motor do tour com driver.js e estilos dos temas"
```

---

### Task 5: Âncoras `data-tour` na sidebar

**Files:**

- Modify: `apps/web/src/components/nav-main.tsx`
- Modify: `apps/web/src/components/app-sidebar.tsx:32-54` e `:106-121`

- [ ] **Step 1: Aceitar `tourId` no `NavMainItem` e renderizar `data-tour`**

Em `nav-main.tsx`, adicione o campo ao tipo:

```ts
export type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  tourId?: string;
  disabled?: boolean;
  children?: { title: string; url: string; roles?: string[] }[];
};
```

E acrescente `data-tour={item.tourId}` nos **três** `SidebarMenuButton` do arquivo (item desabilitado, item com filhos dentro de `NavItemWithChildren`, item simples). Exemplo no item simples:

```tsx
<SidebarMenuButton tooltip={item.title} isActive={isActive} data-tour={item.tourId}>
```

(Quando `tourId` é `undefined`, o React omite o atributo — itens sem tour não mudam.)

- [ ] **Step 2: Definir os `tourId` em `app-sidebar.tsx`**

No array `mainNav`:

```ts
const mainNav: NavMainItem[] = [
  { title: "Home", url: "/home", icon: Home, tourId: "home" },
  { title: "Ligas", url: "/ligas", icon: Users, tourId: "ligas" },
  { title: "Projetos", url: "/projetos", icon: FolderKanban, tourId: "projetos" },
  { title: "Tarefas", url: "/tarefas", icon: ListTodo, tourId: "tarefas" },
  {
    title: "Eventos",
    url: "/calendario",
    icon: Calendar,
    tourId: "eventos",
    children: [
      { title: "Calendário", url: "/calendario" },
      {
        title: "Solicitar eventos",
        url: "/calendario/solicitar-eventos",
        roles: ["staff", "diretor", "lider"],
      },
      { title: "Marcar encontros", url: "/calendario/marcar-encontros" },
      { title: "Guia", url: "/calendario/guia" },
    ],
  },
  { title: "Mural", url: "/mural", icon: MessageSquare, tourId: "mural" },
  { title: "Ranking", url: "/ranking", icon: Trophy, tourId: "ranking" },
];
```

E nos pushes de `manageNav` (o item Formulários fica **sem** `tourId` — está desabilitado e fora do tour):

```ts
manageNav.push({
  title: "Super Admin",
  url: "/super-admin",
  icon: ShieldCheck,
  tourId: "super-admin",
});
// ...
manageNav.push({
  title: "Gerenciamento",
  url: "/gerenciamento",
  icon: Settings,
  tourId: "gerenciamento",
});
// ...
manageNav.push({ title: "Dados", url: "/dados", icon: BarChart3, tourId: "dados" });
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/nav-main.tsx apps/web/src/components/app-sidebar.tsx
git commit -m "feat: âncoras data-tour nos itens da sidebar"
```

---

### Task 6: Persistência no cliente + disparo automático no AppLayout

**Files:**

- Modify: `apps/web/src/lib/conta.ts` (campo novo em `UsuarioMe` + helper)
- Create: `apps/web/src/components/onboarding-tour-launcher.tsx`
- Modify: `apps/web/src/layouts/AppLayout.tsx`

- [ ] **Step 1: Estender `conta.ts`**

Adicione `onboarding_concluido_em` à interface `UsuarioMe` existente:

```ts
export interface UsuarioMe {
  id: string;
  nome: string;
  email: string;
  role: string;
  avatar_url: string | null;
  biografia: string | null;
  instagram: string | null;
  linkedin: string | null;
  semestre: string | null;
  onboarding_concluido_em: string | null;
}
```

E acrescente no fim do arquivo (mesmo padrão de `salvarPerfilMe`):

```ts
export async function concluirOnboarding(): Promise<void> {
  const token = await getToken();
  if (!token) return;
  await fetch(`/api/usuarios/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ onboarding_concluido: true }),
  }).catch(() => {
    // Falha silenciosa: o tour reaparece no próximo login, comportamento aceito na spec.
  });
}
```

- [ ] **Step 2: Criar o launcher**

Crie `apps/web/src/components/onboarding-tour-launcher.tsx`. É um componente sem UI, renderizado **dentro** do `SidebarProvider` (precisa do `useSidebar` para o modo mobile):

```tsx
import { useEffect, useRef } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { carregarUsuarioMe, concluirOnboarding } from "@/lib/conta";
import { iniciarTourPlataforma } from "@/lib/onboarding-tour";

/** Dispara o tour de onboarding uma única vez, no primeiro login do usuário. */
export function OnboardingTourLauncher() {
  const { isMobile, setOpenMobile } = useSidebar();
  const jaVerificou = useRef(false);

  useEffect(() => {
    if (jaVerificou.current) return;
    jaVerificou.current = true;

    carregarUsuarioMe()
      .then((me) => {
        if (!me || me.onboarding_concluido_em) return;
        if (isMobile) setOpenMobile(true);
        // Aguarda a sidebar (e o menu mobile) montar antes de medir os elementos
        window.setTimeout(() => {
          iniciarTourPlataforma(() => {
            void concluirOnboarding();
            if (isMobile) setOpenMobile(false);
          });
        }, 400);
      })
      .catch(() => {
        // Na dúvida (erro ao ler o estado), não mostra o tour — spec.
      });
  }, [isMobile, setOpenMobile]);

  return null;
}
```

- [ ] **Step 3: Montar no AppLayout**

Em `AppLayout.tsx`, importe e renderize dentro do `SidebarProvider`:

```tsx
import { OnboardingTourLauncher } from "@/components/onboarding-tour-launcher";
```

```tsx
return (
  <SidebarProvider>
    <OnboardingTourLauncher />
    <AppSidebar />
    {/* ...restante inalterado... */}
  </SidebarProvider>
);
```

- [ ] **Step 4: Typecheck + smoke manual**

Run: `npm run typecheck`
Expected: sem erros.

Depois `npm run dev` e login com um usuário cujo `onboarding_concluido_em` é nulo:

- Tour abre sozinho com o balão de boas-vindas centralizado.
- Passos destacam os itens da sidebar com anel amarelo.
- Concluir (ou pular) e recarregar a página: o tour **não** reaparece.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/conta.ts apps/web/src/components/onboarding-tour-launcher.tsx apps/web/src/layouts/AppLayout.tsx
git commit -m "feat: disparo automático do tour no primeiro login"
```

---

### Task 7: "Rever tour da plataforma" no menu do usuário

**Files:**

- Modify: `apps/web/src/components/nav-user.tsx`

- [ ] **Step 1: Adicionar o item de replay**

Em `nav-user.tsx`:

1. Acrescente `Compass` ao import de `lucide-react` (linha 1).
2. Importe as funções do tour:

```ts
import { concluirOnboarding } from "@/lib/conta";
import { iniciarTourPlataforma } from "@/lib/onboarding-tour";
```

3. O componente já tem `const { isMobile } = useSidebar()`; troque por `const { isMobile, setOpenMobile } = useSidebar()`.
4. Adicione o handler dentro do componente:

```ts
function handleReverTour() {
  if (isMobile) setOpenMobile(true);
  // Aguarda o dropdown fechar (e o menu mobile abrir) antes de medir os elementos
  window.setTimeout(() => {
    iniciarTourPlataforma(() => {
      void concluirOnboarding();
      if (isMobile) setOpenMobile(false);
    });
  }, 300);
}
```

5. Adicione o item logo **após** o item "Ajuda" (antes do separador que precede "Sair"):

```tsx
<DropdownMenuItem
  className="gap-2.5 rounded-lg px-2 py-1.5 text-[13px] cursor-pointer"
  onClick={handleReverTour}
>
  <Compass className="size-3.5 text-muted-foreground" />
  Rever tour da plataforma
</DropdownMenuItem>
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/nav-user.tsx
git commit -m "feat: rever tour da plataforma pelo menu do usuário"
```

---

### Task 8: Verificação final

**Files:** nenhum novo — validação.

- [ ] **Step 1: Suíte completa**

Run: `npm run typecheck && npm run lint && npm run test --workspace @link-leagues/web`
Expected: tudo verde.

- [ ] **Step 2: Aplicar a migração no banco de desenvolvimento**

Execute `migrations/032_usuarios_onboarding.sql` no banco (mesmo processo manual usado nas migrações anteriores — SQL editor do Supabase).

- [ ] **Step 3: Checklist manual (com `npm run dev`)**

- [ ] Usuário com `onboarding_concluido_em` nulo: tour abre sozinho após login.
- [ ] Papel membro/estudante: passos de Super Admin/Gerenciamento/Dados **não** aparecem.
- [ ] Papel staff: passos de gestão aparecem.
- [ ] Teclado: `→` avança, `←` volta, `Esc` fecha (e grava conclusão).
- [ ] "Pular tour" fecha e grava; recarregar não reabre.
- [ ] Modo escuro: popover usa as superfícies escuras; contraste legível.
- [ ] Mobile (375px, devtools): menu abre sozinho, balões cabem na tela, ao final o menu fecha.
- [ ] `prefers-reduced-motion` (emular nos devtools): transições instantâneas, sem animação de deslocamento.
- [ ] "Rever tour da plataforma" no menu do usuário reabre o tour.

- [ ] **Step 4: Commit final (se houver ajustes)**

```bash
git add -A && git commit -m "fix: ajustes finais do tour de onboarding"
```
