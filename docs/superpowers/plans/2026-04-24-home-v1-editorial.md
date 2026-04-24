# Home V1 Editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma rota `/home/v1` que renderiza a Home inteira no estilo editorial da LSB, usando `embla-carousel-autoplay` e IBM Plex Sans/Mono, sem alterar a `/home` atual.

**Architecture:** Nova árvore de componentes isolada em `apps/web/src/pages/home/v1/`, hook `useHomeData` compartilhável (duplicação controlada) contendo o mesmo fetch da Home original. Views por papel (Staff/Diretor/etc) são reusadas sem modificação. Carrossel construído sobre `embla-carousel-react` + `embla-carousel-autoplay`, tipografia via `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono` registradas no Tailwind como `font-plex-sans` / `font-plex-mono`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind v3, React Router v6, embla-carousel-react, embla-carousel-autoplay, @fontsource/ibm-plex-sans, @fontsource/ibm-plex-mono, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-04-24-home-v1-editorial-design.md`

---

## Arquivos

**Criados:**

- `apps/web/src/pages/home/v1/HomeV1Page.tsx` — página orquestradora
- `apps/web/src/pages/home/v1/EditorialHero.tsx` — carrossel embla + hero tipográfico
- `apps/web/src/pages/home/v1/MinhaLigaStrip.tsx` — faixa "Minha liga"
- `apps/web/src/pages/home/v1/useHomeData.ts` — hook de fetch de ligas/minha liga/usuário/pendentes
- `apps/web/src/pages/home/v1/splitLigaTitle.ts` — utilitário puro que aplica heurística de itálico no nome
- `apps/web/src/pages/home/v1/__tests__/splitLigaTitle.test.ts`
- `apps/web/src/pages/home/v1/__tests__/EditorialHero.test.tsx`
- `apps/web/src/pages/home/v1/__tests__/MinhaLigaStrip.test.tsx`
- `apps/web/src/pages/home/v1/__tests__/HomeV1Page.test.tsx`

**Modificados:**

- `apps/web/package.json` — adicionar deps
- `apps/web/tailwind.config.ts` — registrar fontes Plex
- `apps/web/src/main.tsx` — importar fontes
- `apps/web/src/router/index.tsx` — registrar rota `/home/v1`

---

## Task 1: Instalar dependências

**Files:**

- Modify: `apps/web/package.json`

- [ ] **Step 1: Instalar embla + fontes**

Run (do diretório `apps/web`):

```bash
npm install embla-carousel-react embla-carousel-autoplay @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
```

- [ ] **Step 2: Verificar package.json**

Confirmar em `apps/web/package.json` que as 4 entradas aparecem em `dependencies`.

- [ ] **Step 3: Rodar typecheck**

Run: `npm run typecheck --workspace=@link-leagues/web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "chore(web): adiciona embla-carousel e IBM Plex para Home V1"
```

---

## Task 2: Registrar fontes no Tailwind

**Files:**

- Modify: `apps/web/tailwind.config.ts:75-78`

- [ ] **Step 1: Adicionar famílias Plex**

Em `apps/web/tailwind.config.ts`, substituir o bloco `fontFamily` por:

```ts
fontFamily: {
  sans: ["Montserrat", "ui-sans-serif", "system-ui", "sans-serif"],
  display: ["Aeonik", "Montserrat", "ui-sans-serif", "sans-serif"],
  "plex-sans": ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
  "plex-mono": ['"IBM Plex Mono"', "ui-monospace", "monospace"],
},
```

- [ ] **Step 2: Importar fontes em main.tsx**

Em `apps/web/src/main.tsx`, adicionar imports no topo (depois do import do `index.css`):

```ts
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
```

- [ ] **Step 3: Rodar dev server e verificar**

Run: `npm run dev:web`
Abrir DevTools em qualquer página e rodar no console: `document.fonts.check('16px "IBM Plex Sans"')` → deve retornar `true`.
Parar o dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/main.tsx
git commit -m "feat(web): registra IBM Plex Sans/Mono no Tailwind"
```

---

## Task 3: Utilitário splitLigaTitle (TDD)

Heurística de itálico: divide o nome por espaço. Segunda palavra recebe `em: true`. Se ≥3 palavras, terceira em diante ficam `lowercase: true`. Se tiver 1 palavra, retorna segmento único sem estilo.

**Files:**

- Create: `apps/web/src/pages/home/v1/splitLigaTitle.ts`
- Test: `apps/web/src/pages/home/v1/__tests__/splitLigaTitle.test.ts`

- [ ] **Step 1: Escrever teste**

Criar `apps/web/src/pages/home/v1/__tests__/splitLigaTitle.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { splitLigaTitle } from "../splitLigaTitle";

describe("splitLigaTitle", () => {
  it("retorna segmento único quando o nome tem 1 palavra", () => {
    expect(splitLigaTitle("Finanças")).toEqual([{ text: "Finanças", em: false, lowercase: false }]);
  });

  it("aplica itálico na segunda palavra quando o nome tem 2 palavras", () => {
    expect(splitLigaTitle("Liga Finanças")).toEqual([
      { text: "Liga", em: false, lowercase: false },
      { text: "Finanças", em: true, lowercase: false },
    ]);
  });

  it("aplica itálico na segunda e lowercase da terceira em diante", () => {
    expect(splitLigaTitle("Liga de Finanças Corporativas")).toEqual([
      { text: "Liga", em: false, lowercase: false },
      { text: "de", em: true, lowercase: false },
      { text: "Finanças", em: false, lowercase: true },
      { text: "Corporativas", em: false, lowercase: true },
    ]);
  });

  it("normaliza espaços múltiplos", () => {
    expect(splitLigaTitle("  Liga   de   Finanças  ")).toHaveLength(3);
  });

  it("retorna array vazio para string vazia", () => {
    expect(splitLigaTitle("")).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

Run: `npm run test --workspace=@link-leagues/web -- splitLigaTitle`
Expected: FAIL — `splitLigaTitle` não existe.

- [ ] **Step 3: Implementar**

Criar `apps/web/src/pages/home/v1/splitLigaTitle.ts`:

```ts
export interface TitleSegment {
  text: string;
  em: boolean;
  lowercase: boolean;
}

export function splitLigaTitle(nome: string): TitleSegment[] {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];
  return palavras.map((text, i) => ({
    text,
    em: i === 1,
    lowercase: palavras.length >= 3 && i >= 2,
  }));
}
```

- [ ] **Step 4: Rodar teste (deve passar)**

Run: `npm run test --workspace=@link-leagues/web -- splitLigaTitle`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/home/v1/splitLigaTitle.ts apps/web/src/pages/home/v1/__tests__/splitLigaTitle.test.ts
git commit -m "feat(home-v1): utilitário splitLigaTitle com heurística de itálico"
```

---

## Task 4: Hook useHomeData

Hook que replica a lógica atual de `HomePage.tsx` (linhas 41–88) sem mexer no original.

**Files:**

- Create: `apps/web/src/pages/home/v1/useHomeData.ts`

- [ ] **Step 1: Criar hook**

Criar `apps/web/src/pages/home/v1/useHomeData.ts`:

```ts
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";

import type { Liga } from "@link-leagues/types";

interface PendenteItem {
  id: string;
  titulo: string;
  liga?: { nome: string };
}

interface Pendentes {
  projetos: PendenteItem[];
  eventos: PendenteItem[];
}

export interface HomeData {
  ligas: Liga[];
  minhaLiga: Liga | null;
  nomeUsuario: string;
  loadingUser: boolean;
  pendentes: Pendentes;
  role: string | null;
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function useHomeData(): HomeData {
  const { role } = useUser();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [pendentes, setPendentes] = useState<Pendentes>({ projetos: [], eventos: [] });

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        if (!token) {
          setLoadingUser(false);
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user.email ?? "";

        if (email) {
          const { data: usuario } = await supabase
            .from("usuarios")
            .select("nome")
            .eq("email", email)
            .single();
          if (usuario?.nome) setNomeUsuario(usuario.nome as string);
          else setNomeUsuario(email.split("@")[0] ?? "Usuário");
        }

        const [ligasRes, minhaRes] = await Promise.all([
          fetch(`/api/ligas`, { headers }),
          fetch(`/api/ligas/minha`, { headers }),
        ]);
        if (ligasRes.ok) setLigas(await ligasRes.json());
        if (minhaRes.ok) setMinhaLiga(await minhaRes.json());
      } catch {
        // Falha silenciosa — mesmo padrão do HomePage original
      } finally {
        setLoadingUser(false);
      }
    }
    void carregar();
  }, []);

  useEffect(() => {
    if (role !== "staff") return;
    async function carregarPendentes() {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/pendentes`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPendentes(await res.json());
    }
    void carregarPendentes();
  }, [role]);

  return { ligas, minhaLiga, nomeUsuario, loadingUser, pendentes, role };
}
```

- [ ] **Step 2: Rodar typecheck**

Run: `npm run typecheck --workspace=@link-leagues/web`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/home/v1/useHomeData.ts
git commit -m "feat(home-v1): hook useHomeData com fetch de ligas e usuário"
```

---

## Task 5: Componente MinhaLigaStrip (TDD)

**Files:**

- Create: `apps/web/src/pages/home/v1/MinhaLigaStrip.tsx`
- Test: `apps/web/src/pages/home/v1/__tests__/MinhaLigaStrip.test.tsx`

- [ ] **Step 1: Escrever teste**

Criar `apps/web/src/pages/home/v1/__tests__/MinhaLigaStrip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MinhaLigaStrip } from "../MinhaLigaStrip";

import type { Liga } from "@link-leagues/types";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const liga: Liga = {
  id: "liga-1",
  nome: "Liga de Estratégia",
  ativo: true,
} as Liga;

describe("MinhaLigaStrip", () => {
  it("renderiza eyebrow 'Minha liga' e o nome", () => {
    render(
      <MemoryRouter>
        <MinhaLigaStrip liga={liga} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/minha liga/i)).toBeInTheDocument();
    expect(screen.getByText("Liga de Estratégia")).toBeInTheDocument();
  });

  it("navega para o detalhe da liga ao clicar", async () => {
    navigateMock.mockClear();
    render(
      <MemoryRouter>
        <MinhaLigaStrip liga={liga} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /acessar liga/i }));
    expect(navigateMock).toHaveBeenCalledWith("/ligas/liga-1");
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

Run: `npm run test --workspace=@link-leagues/web -- MinhaLigaStrip`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Implementar**

Criar `apps/web/src/pages/home/v1/MinhaLigaStrip.tsx`:

```tsx
import { useNavigate } from "react-router-dom";

import type { Liga } from "@link-leagues/types";

interface MinhaLigaStripProps {
  liga: Liga;
}

export function MinhaLigaStrip({ liga }: MinhaLigaStripProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/ligas/${liga.id}`)}
      aria-label={`Acessar liga ${liga.nome}`}
      className="w-full flex items-center justify-between border-t border-navy/80 px-0 py-5 text-left focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
    >
      <div>
        <div className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy/70">
          Minha liga
        </div>
        <div className="font-plex-sans text-[14px] font-semibold text-navy mt-1">{liga.nome}</div>
      </div>
      <div className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-navy border-b border-navy pb-0.5">
        Acessar →
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Rodar teste (deve passar)**

Run: `npm run test --workspace=@link-leagues/web -- MinhaLigaStrip`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/home/v1/MinhaLigaStrip.tsx apps/web/src/pages/home/v1/__tests__/MinhaLigaStrip.test.tsx
git commit -m "feat(home-v1): componente MinhaLigaStrip"
```

---

## Task 6: Componente EditorialHero (TDD)

**Files:**

- Create: `apps/web/src/pages/home/v1/EditorialHero.tsx`
- Test: `apps/web/src/pages/home/v1/__tests__/EditorialHero.test.tsx`

- [ ] **Step 1: Escrever teste**

Criar `apps/web/src/pages/home/v1/__tests__/EditorialHero.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { EditorialHero } from "../EditorialHero";

import type { Liga } from "@link-leagues/types";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const ligas: Liga[] = [
  { id: "l1", nome: "Liga de Finanças", ativo: true, projetos_ativos: 12 } as Liga,
  { id: "l2", nome: "Liga de Estratégia", ativo: true, projetos_ativos: 9 } as Liga,
  { id: "l3", nome: "Liga Marketing", ativo: true, projetos_ativos: 7 } as Liga,
];

describe("EditorialHero", () => {
  it("renderiza o nome da primeira liga", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Finanças/)).toBeInTheDocument();
  });

  it("renderiza índice '01 / 03' por padrão", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/01/)).toBeInTheDocument();
    expect(screen.getByText(/03/)).toBeInTheDocument();
  });

  it("navega ao clicar no card da liga", async () => {
    navigateMock.mockClear();
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    const cards = screen.getAllByRole("button", { name: /abrir liga/i });
    await userEvent.click(cards[0]!);
    expect(navigateMock).toHaveBeenCalledWith("/ligas/l1");
  });

  it("renderiza setas acessíveis de navegação", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={ligas} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /liga anterior/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /próxima liga/i })).toBeInTheDocument();
  });

  it("não renderiza setas quando só há 1 liga", () => {
    render(
      <MemoryRouter>
        <EditorialHero ligas={[ligas[0]!]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /liga anterior/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

Run: `npm run test --workspace=@link-leagues/web -- EditorialHero`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Criar `apps/web/src/pages/home/v1/EditorialHero.tsx`:

```tsx
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { splitLigaTitle } from "./splitLigaTitle";

import type { Liga } from "@link-leagues/types";

interface EditorialHeroProps {
  ligas: Liga[];
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EditorialHero({ ligas }: EditorialHeroProps) {
  const navigate = useNavigate();
  const reduced = prefersReducedMotion();
  const autoplay = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    reduced || ligas.length <= 1 ? [] : [autoplay.current],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", update);
    update();
    return () => {
      emblaApi.off("select", update);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (ligas.length === 0) return null;

  const total = String(ligas.length).padStart(2, "0");
  const current = String(index + 1).padStart(2, "0");

  return (
    <section aria-label="Ligas em destaque" className="font-plex-sans">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {ligas.map((liga) => {
            const segs = splitLigaTitle(liga.nome);
            return (
              <div key={liga.id} className="min-w-0 flex-[0_0_100%]">
                <button
                  type="button"
                  onClick={() => navigate(`/ligas/${liga.id}`)}
                  aria-label={`Abrir liga ${liga.nome}`}
                  className="block w-full text-left bg-[#f5f5f3] p-7 rounded-sm focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-plex-mono text-[11px] tracking-[0.14em] text-navy">
                      {current} <span className="text-navy/40">/ {total}</span>
                    </span>
                    {ligas.length > 1 && (
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          aria-label="Liga anterior"
                          onClick={(e) => {
                            e.stopPropagation();
                            prev();
                          }}
                          className="w-7 h-7 border border-navy flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Próxima liga"
                          onClick={(e) => {
                            e.stopPropagation();
                            next();
                          }}
                          className="w-7 h-7 border border-navy flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </div>

                  <h2 className="text-navy font-plex-sans font-bold text-[32px] md:text-[42px] leading-[0.95] tracking-[-0.035em]">
                    {segs.map((s, i) => (
                      <span
                        key={`${liga.id}-${i}`}
                        className={[
                          i > 0 ? "ml-[0.2em]" : "",
                          s.em ? "italic font-medium" : "",
                          s.lowercase ? "lowercase font-medium" : "",
                        ]
                          .join(" ")
                          .trim()}
                      >
                        {s.text}
                      </span>
                    ))}
                  </h2>

                  <div className="mt-4 font-plex-mono text-[10px] uppercase tracking-[0.1em] text-navy/70 flex gap-3 flex-wrap">
                    <span>
                      Dir.{" "}
                      {liga.diretores && liga.diretores.length > 0
                        ? liga.diretores.map((d) => d.nome).join(", ")
                        : "—"}
                    </span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-navy grid grid-cols-3 gap-0">
                    <Stat label="Score" value="78" />
                    <Stat label="Projetos" value={String(liga.projetos_ativos ?? 0)} />
                    <Stat label="Membros" value="—" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pr-4 border-r border-navy/15 last:border-r-0">
      <div className="font-plex-sans font-bold text-[22px] md:text-[28px] text-navy tracking-[-0.02em]">
        {value}
      </div>
      <div className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-navy/60 mt-0.5">
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste (deve passar)**

Run: `npm run test --workspace=@link-leagues/web -- EditorialHero`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/home/v1/EditorialHero.tsx apps/web/src/pages/home/v1/__tests__/EditorialHero.test.tsx
git commit -m "feat(home-v1): EditorialHero com embla-carousel-autoplay"
```

---

## Task 7: Página HomeV1Page (TDD)

**Files:**

- Create: `apps/web/src/pages/home/v1/HomeV1Page.tsx`
- Test: `apps/web/src/pages/home/v1/__tests__/HomeV1Page.test.tsx`

- [ ] **Step 1: Escrever teste**

Criar `apps/web/src/pages/home/v1/__tests__/HomeV1Page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { HomeV1Page } from "../HomeV1Page";

vi.mock("../useHomeData", () => ({
  useHomeData: () => ({
    ligas: [],
    minhaLiga: null,
    nomeUsuario: "Diogo",
    loadingUser: false,
    pendentes: { projetos: [], eventos: [] },
    role: "membro",
  }),
}));

describe("HomeV1Page", () => {
  it("renderiza saudação com o nome do usuário", () => {
    render(
      <MemoryRouter>
        <HomeV1Page />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Olá, Diogo/)).toBeInTheDocument();
  });

  it("renderiza badge do papel em caixa mono", () => {
    render(
      <MemoryRouter>
        <HomeV1Page />
      </MemoryRouter>,
    );
    expect(screen.getByText(/membro/i)).toBeInTheDocument();
  });

  it("não renderiza hero quando não há ligas", () => {
    render(
      <MemoryRouter>
        <HomeV1Page />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("region", { name: /ligas em destaque/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste (deve falhar)**

Run: `npm run test --workspace=@link-leagues/web -- HomeV1Page`
Expected: FAIL.

- [ ] **Step 3: Implementar**

Criar `apps/web/src/pages/home/v1/HomeV1Page.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

import { HomeDiretorView } from "../HomeDiretorView";
import { HomeMembroView } from "../HomeMembroView";
import { HomeProfessorView } from "../HomeProfessorView";
import { HomeStaffView } from "../HomeStaffView";
import { EditorialHero } from "./EditorialHero";
import { MinhaLigaStrip } from "./MinhaLigaStrip";
import { useHomeData } from "./useHomeData";

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  professor: "Professor",
  membro: "Membro",
  estudante: "Estudante",
};

export function HomeV1Page() {
  const { ligas, minhaLiga, nomeUsuario, loadingUser, pendentes, role } = useHomeData();

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dataFormatada = hoje.replace(/\./g, "").toUpperCase();

  return (
    <div className="font-plex-sans bg-white min-h-full p-8 space-y-0">
      <header className="flex items-end justify-between">
        <div>
          {loadingUser ? (
            <>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-3 w-32" />
            </>
          ) : (
            <>
              <h1 className="font-plex-sans text-[22px] font-semibold text-navy tracking-[-0.02em]">
                Olá, {nomeUsuario}
              </h1>
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.08em] text-navy/60 mt-1">
                {dataFormatada}
              </p>
            </>
          )}
        </div>
        {role && !loadingUser && (
          <span className="font-plex-mono text-[9px] uppercase tracking-[0.2em] text-navy border border-navy px-2.5 py-1.5">
            {ROLE_LABELS[role] ?? role}
          </span>
        )}
      </header>

      <div className="h-px bg-navy/90 mt-5" />

      {ligas.length > 0 && (
        <div className="mt-6">
          <EditorialHero ligas={ligas} />
        </div>
      )}

      {minhaLiga && (
        <div className="mt-6">
          <MinhaLigaStrip liga={minhaLiga} />
        </div>
      )}

      <div className="mt-8">
        {role === "staff" && <HomeStaffView pendentes={pendentes} />}
        {role === "diretor" && <HomeDiretorView />}
        {role === "professor" && <HomeProfessorView />}
        {role === "membro" && <HomeMembroView />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar teste (deve passar)**

Run: `npm run test --workspace=@link-leagues/web -- HomeV1Page`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/home/v1/HomeV1Page.tsx apps/web/src/pages/home/v1/__tests__/HomeV1Page.test.tsx
git commit -m "feat(home-v1): página HomeV1Page orquestrando hero + strip + role views"
```

---

## Task 8: Registrar rota `/home/v1`

**Files:**

- Modify: `apps/web/src/router/index.tsx:14,50`

- [ ] **Step 1: Adicionar import**

Em `apps/web/src/router/index.tsx`, logo abaixo do import de `HomePage`:

```ts
import { HomeV1Page } from "@/pages/home/v1/HomeV1Page";
```

- [ ] **Step 2: Adicionar rota**

No array de `children` de `AppLayout` (após a entrada `{ path: "home", element: <HomePage /> },`) adicionar:

```ts
{ path: "home/v1", element: <HomeV1Page /> },
```

- [ ] **Step 3: Rodar typecheck**

Run: `npm run typecheck --workspace=@link-leagues/web`
Expected: PASS.

- [ ] **Step 4: Rodar testes completos**

Run: `npm run test --workspace=@link-leagues/web`
Expected: todos os testes passam.

- [ ] **Step 5: Rodar lint**

Run: `npm run lint --workspace=@link-leagues/web`
Expected: PASS.

- [ ] **Step 6: Verificar manualmente**

Run: `npm run dev:web`
Abrir http://localhost:3000/home/v1 autenticado. Confirmar:

- Header "Olá, {nome}" em Plex Sans, data em Plex Mono uppercase
- Divisor navy horizontal
- Hero editorial com nome da liga em tipografia grande, palavra em itálico
- Autoplay a cada 4s, setas funcionam, click navega para `/ligas/:id`
- Strip "Minha liga" aparece se usuário tem liga
- View do papel (Staff/Diretor/etc) aparece embaixo
- `/home` (sem /v1) continua funcionando normal

Parar o dev server.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/router/index.tsx
git commit -m "feat(web): registra rota /home/v1"
```

---

## Critérios de aceitação finais

- `/home/v1` renderiza página completa sem erros de console
- `/home` continua intocada e funciona igual
- `npm run typecheck` passa em todo o monorepo
- `npm run lint` passa
- `npm run test --workspace=@link-leagues/web` passa
- Visual confere com V1 do mockup (`.superpowers/brainstorm/*/content/lsb-directions.html`)
