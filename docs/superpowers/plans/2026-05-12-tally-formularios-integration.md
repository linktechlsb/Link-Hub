# Tally Forms Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar Google Forms por Tally como provedor de formulários e generalizar o módulo de formulários para uso além de processo seletivo, com scoring opcional via flag `scoring_enabled`.

**Architecture:** Link Hub continua sendo a fonte de configuração (campos, scoring, status); Tally é a fonte de renderização (form público). Integração 100% via API REST do Tally (`https://api.tally.so`, pinned em `tally-version: 2025-02-01`). Respostas chegam via webhook HMAC-signed em `/api/formularios/webhook/tally` (montado antes do `express.json` global pra preservar raw body) com endpoint de catch-up `GET /forms/submissions`.

**Tech Stack:** Node.js 22 + Express + TypeScript strict, postgres (sql template), Vitest, React 18 + Vite + Tailwind + shadcn/ui, supabase-js (auth apenas no front).

**Spec:** [docs/superpowers/specs/2026-05-12-tally-formularios-integration.md](../specs/2026-05-12-tally-formularios-integration.md)

---

## File Map

### Criados

| Arquivo                                                      | Responsabilidade                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/021_tally_formularios.sql`                       | Renames de tabelas/colunas, novas colunas (`tipo`, `scoring_enabled`, etc.), `UNIQUE(formulario_id, tally_question_id)`         |
| `packages/types/src/tally.ts`                                | Tipos da API Tally: blocks (Pascal+Block), fields (SCREAMING), submissions, webhook event, `TallyAnswer`, `RespostaNormalizada` |
| `packages/utils/src/scoring.ts`                              | `calcularPontuacao(campos, respostas, pontuacaoMinima)` — regras de eliminatórias + soma ponderada + threshold                  |
| `packages/utils/src/scoring.test.ts`                         | Vitest suite para scoring                                                                                                       |
| `packages/utils/package.json` (modify)                       | Adicionar script `test`                                                                                                         |
| `packages/utils/vitest.config.ts`                            | Config Vitest                                                                                                                   |
| `apps/api/src/services/tally.ts`                             | Wrapper HTTP da API Tally + `mapCamposToBlocks` + adapters de normalização                                                      |
| `apps/api/src/services/tally.test.ts`                        | Vitest suite para mapper + adapters                                                                                             |
| `apps/api/src/routes/tally-webhook.ts`                       | Rota pública `/api/formularios/webhook/tally` com validação HMAC                                                                |
| `apps/api/src/routes/tally-webhook.test.ts`                  | Vitest suite para validação HMAC + idempotência                                                                                 |
| `apps/api/src/services/formularios-processor.ts`             | `processarSubmission()` compartilhada entre webhook e sincronizar                                                               |
| `apps/web/src/pages/formularios/components/TallyPreview.tsx` | Componente iframe para aba "Preview"                                                                                            |

### Modificados

| Arquivo                                                    | Mudança                                                                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/config/env.ts`                               | Adicionar `TALLY_API_KEY`, `TALLY_WEBHOOK_SIGNING_SECRET`, `TALLY_WORKSPACE_ID`, `PUBLIC_API_BASE_URL`                                   |
| `apps/api/src/index.ts`                                    | Montar webhook router antes do `express.json` global                                                                                     |
| `apps/api/src/routes/index.ts`                             | Sem mudança (webhook é montado em index.ts antes do mount geral)                                                                         |
| `apps/api/src/routes/formularios.ts`                       | Refactor completo: rename de tabelas, criação via Tally, `/publicar` cria webhook, `/encerrar` desabilita, `/sincronizar` reimplementado |
| `packages/types/src/formularios.ts`                        | Generalização: `FormularioTipo`, `scoring_enabled`, `pontuacao_minima_aprovacao`, renames Tally                                          |
| `apps/web/src/pages/formularios/FormulariosPage.tsx`       | Filtro por `tipo`, KPIs adaptativos a scoring                                                                                            |
| `apps/web/src/pages/formularios/NovoFormularioPage.tsx`    | Wizard 4→3 etapas, remove personalização, toggle `scoring_enabled`                                                                       |
| `apps/web/src/pages/formularios/FormularioDetalhePage.tsx` | Duas abas (Respostas/Preview), parser Tally, comportamento condicional a scoring                                                         |

### Removidos

| Arquivo/Bloco                                                                                                                     | Razão                                               |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `apps/web/src/pages/formularios/NovoFormularioPage.tsx`: `TypeformMockup`, `ColorField`, `ImageUrlField`, etapa de Personalização | Tally controla branding                             |
| `apps/api/src/routes/formularios.ts`: `POST /formularios/assets/upload`                                                           | Não usa mais (era pra logo/fundo do TypeformMockup) |

---

## Task 1: Migration — Renames e Novas Colunas

**Files:**

- Create: `migrations/021_tally_formularios.sql`

### Contexto

A migration 018 adicionou coluna `tema` em `processos_seletivos`. A 019 (`google_forms.sql`) existe mas o uso já foi removido no código (commit `7f2bb35`). Vamos:

1. Renomear tabelas: `processos_seletivos` → `formularios`, `processo_perguntas` → `formulario_campos`, `processo_candidatos` → `formulario_respostas`
2. Renomear colunas FK: `processo_id` → `formulario_id`
3. Renomear colunas Google → Tally
4. Adicionar `tipo`, `scoring_enabled`, `pontuacao_minima_aprovacao`, `tally_webhook_id`
5. Tornar `liga_id` opcional
6. Adicionar `UNIQUE(formulario_id, tally_question_id)` em `formulario_campos`
7. Dropar coluna `tema`

- [ ] **Step 1.1: Criar a migration**

Crie `migrations/021_tally_formularios.sql` com:

```sql
-- 021_tally_formularios.sql
-- Renomeia e generaliza o módulo de processos seletivos para "formulários"
-- e troca Google Forms por Tally como provedor.

BEGIN;

-- 1. Renomeia tabelas
ALTER TABLE processos_seletivos    RENAME TO formularios;
ALTER TABLE processo_perguntas     RENAME TO formulario_campos;
ALTER TABLE processo_candidatos    RENAME TO formulario_respostas;

-- 2. Renomeia FKs nas tabelas filhas
ALTER TABLE formulario_campos    RENAME COLUMN processo_id TO formulario_id;
ALTER TABLE formulario_respostas RENAME COLUMN processo_id TO formulario_id;

-- 3. Renomeia colunas Google → Tally
ALTER TABLE formularios          RENAME COLUMN google_form_id     TO tally_form_id;
ALTER TABLE formularios          RENAME COLUMN google_form_url    TO tally_form_url;
ALTER TABLE formulario_campos    RENAME COLUMN google_item_id     TO tally_question_id;
ALTER TABLE formulario_respostas RENAME COLUMN google_response_id TO tally_submission_id;

-- 4. Drop coluna tema (não usamos mais — Tally controla branding)
ALTER TABLE formularios DROP COLUMN IF EXISTS tema;

-- 5. Novas colunas em formularios
ALTER TABLE formularios
  ADD COLUMN tipo TEXT NOT NULL DEFAULT 'generico'
    CHECK (tipo IN ('generico','processo_seletivo','pesquisa','inscricao','feedback')),
  ADD COLUMN scoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN pontuacao_minima_aprovacao INT,
  ADD COLUMN tally_webhook_id TEXT;

-- 6. liga_id opcional
ALTER TABLE formularios ALTER COLUMN liga_id DROP NOT NULL;

-- 7. Backfill: registros que existiam eram todos processo_seletivo com scoring implícito
UPDATE formularios SET tipo = 'processo_seletivo', scoring_enabled = TRUE WHERE tipo = 'generico';

-- 8. Constraints
-- Cada campo só tem um tally_question_id por formulário
ALTER TABLE formulario_campos
  ADD CONSTRAINT formulario_campos_form_tally_uniq
  UNIQUE (formulario_id, tally_question_id);

-- tally_submission_id já era UNIQUE? Se não, garantir
ALTER TABLE formulario_respostas
  ADD CONSTRAINT formulario_respostas_tally_submission_uniq
  UNIQUE (tally_submission_id);

-- 9. Validação: se scoring_enabled, exige pontuacao_minima
ALTER TABLE formularios
  ADD CONSTRAINT formularios_scoring_requires_minima
  CHECK (
    (scoring_enabled = FALSE) OR
    (scoring_enabled = TRUE AND pontuacao_minima_aprovacao IS NOT NULL)
  );

COMMIT;
```

- [ ] **Step 1.2: Verificar migrations existentes para descobrir constraints já presentes**

Antes de rodar a migration, confirme se `tally_submission_id` (ex-`google_response_id`) já tem UNIQUE. Rode:

```bash
grep -n "google_response_id\|UNIQUE" migrations/0*.sql | head -30
```

Se já houver UNIQUE em `google_response_id`, remova o bloco `ALTER TABLE formulario_respostas ADD CONSTRAINT ... UNIQUE` (vai conflitar). Se não houver, mantém.

- [ ] **Step 1.3: Aplicar migration localmente**

```bash
cd /Users/diogochiapetagarcia/Cursor/Link-Hub
psql "$DATABASE_URL" -f migrations/021_tally_formularios.sql
```

Expected: `COMMIT` no final, sem erros.

- [ ] **Step 1.4: Verificar schema resultante**

```bash
psql "$DATABASE_URL" -c "\d formularios" -c "\d formulario_campos" -c "\d formulario_respostas"
```

Expected: ver `tipo`, `scoring_enabled`, `pontuacao_minima_aprovacao`, `tally_webhook_id` em `formularios`. Ver `tally_question_id` em `formulario_campos`. Ver `tally_submission_id` em `formulario_respostas`. `liga_id` nullable.

- [ ] **Step 1.5: Commit**

```bash
git add migrations/021_tally_formularios.sql
git commit -m "feat(db): migration 021 — renomeia processo_seletivo → formularios e adiciona campos Tally/scoring"
```

---

## Task 2: Types — `packages/types/src/formularios.ts` e `tally.ts`

**Files:**

- Modify: `packages/types/src/formularios.ts`
- Create: `packages/types/src/tally.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 2.1: Criar `packages/types/src/tally.ts`**

```ts
// === Tipos para criar / ler form (POST /forms, GET /forms/{id}) ===
export type TallyBlockType =
  | "FormTitleBlock"
  | "TitleBlock"
  | "TextBlock"
  | "InputTextBlock"
  | "TextareaBlock"
  | "InputEmailBlock"
  | "InputNumberBlock"
  | "MultipleChoiceBlock"
  | "MultipleChoiceOptionBlock"
  | "CheckboxesBlock"
  | "CheckboxBlock"
  | "DropdownBlock"
  | "DropdownOptionBlock"
  | "LinearScaleBlock";

export interface TallyBlock {
  uuid: string;
  type: TallyBlockType;
  groupUuid?: string;
  groupType?: TallyBlockType;
  payload: Record<string, unknown>;
}

export interface TallyFormSettings {
  isClosed?: boolean;
  closedMessage?: string;
}

export type TallyFormStatus = "BLANK" | "DRAFT" | "PUBLISHED" | "DELETED";

export interface TallyForm {
  id: string;
  name: string;
  workspaceId?: string;
  status: TallyFormStatus;
  blocks: TallyBlock[];
  settings?: TallyFormSettings;
}

export interface CreateTallyFormBody {
  name: string;
  status: TallyFormStatus;
  workspaceId?: string;
  blocks: TallyBlock[];
}

// === Tipos do webhook ===
export type TallyFieldType =
  | "INPUT_TEXT"
  | "TEXTAREA"
  | "INPUT_EMAIL"
  | "INPUT_NUMBER"
  | "MULTIPLE_CHOICE"
  | "CHECKBOXES"
  | "DROPDOWN"
  | "LINEAR_SCALE";

export interface TallyField {
  key: string;
  label: string;
  type: TallyFieldType;
  value: unknown;
}

export interface TallyWebhookEvent {
  eventId: string;
  eventType: "FORM_RESPONSE";
  createdAt: string;
  data: {
    responseId: string;
    respondentId: string;
    formId: string;
    fields: TallyField[];
  };
}

// Forma persistida em formulario_respostas.respostas
export interface TallyAnswer {
  type: TallyFieldType;
  value: unknown;
  label: string;
}

// === Submissions list (GET /forms/submissions?formId=...) ===
export interface TallyResponse {
  id: string;
  questionId: string;
  answer: unknown;
  formattedAnswer: string;
}

export interface TallySubmission {
  id: string;
  formId: string;
  isCompleted: boolean;
  submittedAt: string;
  responses: TallyResponse[];
}

// NOTA: chave real do array de submissions no payload da Tally é `items`.
// Confirmar com request real ao implementar `/sincronizar` (Task 9).
export interface TallySubmissionsPage {
  items: TallySubmission[];
  questions: Array<{ id: string; title: string; type: TallyFieldType }>;
  hasMore: boolean;
  nextCursor?: string;
}

// === Webhook config ===
export interface TallyWebhook {
  id: string;
  formId: string;
  url: string;
  isEnabled: boolean;
  eventTypes: Array<"FORM_RESPONSE">;
}

// === Forma interna unificada usada por processarSubmission ===
export interface RespostaNormalizada {
  questionId: string;
  label: string;
  type: TallyFieldType;
  value: unknown;
}
```

- [ ] **Step 2.2: Substituir `packages/types/src/formularios.ts`**

Substitua todo o conteúdo de `packages/types/src/formularios.ts` por:

```ts
import type { TallyAnswer } from "./tally.js";

export type FormularioStatus = "rascunho" | "aberto" | "encerrado";
export type FormularioTipo =
  | "generico"
  | "processo_seletivo"
  | "pesquisa"
  | "inscricao"
  | "feedback";
export type CampoTipo = "texto" | "multipla_escolha" | "nota_1_10" | "sim_nao";
export type RespostaStatus = "pendente" | "aprovado" | "reprovado";

export interface Formulario {
  id: string;
  liga_id: string | null;
  tipo: FormularioTipo;
  nome: string;
  descricao?: string;
  status: FormularioStatus;
  scoring_enabled: boolean;
  pontuacao_minima_aprovacao: number | null;
  tally_form_id: string | null;
  tally_form_url: string | null;
  tally_webhook_id: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormularioCampo {
  id: string;
  formulario_id: string;
  tally_question_id: string | null;
  titulo: string;
  tipo: CampoTipo;
  ordem: number;
  peso: number;
  eliminatoria: boolean;
  nota_minima?: number;
  opcoes?: string[];
  opcoes_eliminatorias?: string[];
}

export interface FormularioResposta {
  id: string;
  formulario_id: string;
  tally_submission_id: string;
  nome: string;
  email: string;
  respostas: Record<string, TallyAnswer>;
  pontuacao_total: number | null;
  status: RespostaStatus;
  motivo_reprovacao?: string;
  submitted_at: string;
  sincronizado_at: string;
}

export interface FormularioComCampos extends Formulario {
  campos: FormularioCampo[];
}

export interface ResultadosFormulario {
  total: number;
  aprovados: number;
  reprovados: number;
  pendentes: number;
  respostas: FormularioResposta[];
}

export interface CreateCampoInput {
  titulo: string;
  tipo: CampoTipo;
  ordem: number;
  peso: number;
  eliminatoria: boolean;
  nota_minima?: number;
  opcoes?: string[];
  opcoes_eliminatorias?: string[];
}

export interface CreateFormularioInput {
  liga_id?: string;
  tipo: FormularioTipo;
  nome: string;
  descricao?: string;
  scoring_enabled: boolean;
  pontuacao_minima_aprovacao?: number;
  campos: CreateCampoInput[];
}
```

- [ ] **Step 2.3: Adicionar export de `tally.js` em `packages/types/src/index.ts`**

Edite `packages/types/src/index.ts` adicionando a linha:

```ts
export * from "./tally.js";
```

logo após `export * from "./formularios.js";`.

- [ ] **Step 2.4: Typecheck**

```bash
npm run typecheck 2>&1 | tail -40
```

Expected: muitos erros em consumidores (`apps/api/src/routes/formularios.ts`, páginas do frontend) — esperado, vamos corrigir nas tasks seguintes. **Não pode haver erro em `packages/types/`.**

- [ ] **Step 2.5: Commit**

```bash
git add packages/types/src/formularios.ts packages/types/src/tally.ts packages/types/src/index.ts
git commit -m "feat(types): generaliza Formulario e adiciona tipos Tally"
```

---

## Task 3: Env Config — Variáveis Tally

**Files:**

- Modify: `apps/api/src/config/env.ts`

- [ ] **Step 3.1: Adicionar campos no schema Zod**

Edite `apps/api/src/config/env.ts`. Localize o bloco `EnvSchema = z.object({...})` e adicione antes do `CORS_ORIGIN`:

```ts
  TALLY_API_KEY: z.string().min(1),
  TALLY_WEBHOOK_SIGNING_SECRET: z.string().min(16),
  TALLY_WORKSPACE_ID: z.string().min(1).optional(),
  PUBLIC_API_BASE_URL: z.string().url(),
```

- [ ] **Step 3.2: Atualizar `apps/api/.env.example` (se existir) com placeholders**

```bash
ls apps/api/.env.example 2>/dev/null && cat apps/api/.env.example
```

Se existir, adicione ao final:

```bash
TALLY_API_KEY=tly-...
TALLY_WEBHOOK_SIGNING_SECRET=<gere com: openssl rand -hex 32>
TALLY_WORKSPACE_ID=
PUBLIC_API_BASE_URL=http://localhost:3001
```

Se não existir, pule este step.

- [ ] **Step 3.3: Configurar localmente para typecheck/teste rodar**

Garante que o `.env` local (`/Users/diogochiapetagarcia/Cursor/Link-Hub/.env`) tem valores de teste:

```bash
grep -E "TALLY_API_KEY|TALLY_WEBHOOK_SIGNING_SECRET|PUBLIC_API_BASE_URL" .env || cat >> .env <<'EOF'
TALLY_API_KEY=test-key-replace-in-prod
TALLY_WEBHOOK_SIGNING_SECRET=test-secret-replace-in-prod-min-16-chars
PUBLIC_API_BASE_URL=http://localhost:3001
EOF
```

- [ ] **Step 3.4: Typecheck**

```bash
npm run typecheck --workspace=apps/api 2>&1 | tail -20
```

Expected: novos erros relacionados a `env.TALLY_*` apenas se algum código já referenciar; senão zero novos erros vindos do env.ts.

- [ ] **Step 3.5: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/.env.example 2>/dev/null || git add apps/api/src/config/env.ts
git commit -m "feat(api): valida variáveis de ambiente do Tally"
```

---

## Task 4: Setup Vitest em `packages/utils`

**Files:**

- Modify: `packages/utils/package.json`
- Create: `packages/utils/vitest.config.ts`

- [ ] **Step 4.1: Adicionar vitest como devDep e script de teste**

Edite `packages/utils/package.json`:

```json
{
  "name": "@link-leagues/utils",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "3.2.2"
  }
}
```

- [ ] **Step 4.2: Criar `packages/utils/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4.3: Instalar deps**

```bash
npm install
```

Expected: `vitest` listed em `packages/utils/node_modules`.

- [ ] **Step 4.4: Commit**

```bash
git add packages/utils/package.json packages/utils/vitest.config.ts package-lock.json
git commit -m "chore(utils): configura vitest para packages/utils"
```

---

## Task 5: Scoring Utility — `packages/utils/src/scoring.ts`

**Files:**

- Create: `packages/utils/src/scoring.ts`
- Create: `packages/utils/src/scoring.test.ts`

### Contexto

Implementa a lógica de scoring que estava só esquematizada no DB. Recebe campos do formulário + respostas (normalizadas com `tally_question_id` como chave) + pontuação mínima. Retorna pontuação 0–100 + status.

- [ ] **Step 5.1: Escrever testes primeiro (TDD)**

Crie `packages/utils/src/scoring.test.ts`:

```ts
import { describe, it, expect } from "vitest";

import { calcularPontuacao } from "./scoring.js";

import type { FormularioCampo, TallyAnswer } from "@link-leagues/types";

function campo(over: Partial<FormularioCampo>): FormularioCampo {
  return {
    id: "id",
    formulario_id: "form",
    tally_question_id: over.tally_question_id ?? "q",
    titulo: "?",
    tipo: "texto",
    ordem: 0,
    peso: 0,
    eliminatoria: false,
    ...over,
  };
}

function ans(value: unknown, type: TallyAnswer["type"] = "INPUT_TEXT"): TallyAnswer {
  return { type, value, label: "" };
}

describe("calcularPontuacao", () => {
  it("retorna pontuacao_total=0 e status=pendente quando não há campos pontuáveis", () => {
    const campos = [campo({ tipo: "texto" })];
    const result = calcularPontuacao(campos, { q: ans("qualquer") }, 60);
    expect(result.pontuacao_total).toBe(0);
    expect(result.status).toBe("pendente");
  });

  it("aprova quando soma ponderada >= pontuacao minima", () => {
    const campos = [campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 100 })];
    const respostas = { a: ans(8, "LINEAR_SCALE") }; // (8/10)*100 = 80
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.pontuacao_total).toBe(80);
    expect(result.status).toBe("aprovado");
  });

  it("retorna pendente quando soma < pontuacao minima", () => {
    const campos = [campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 100 })];
    const respostas = { a: ans(4, "LINEAR_SCALE") }; // 40
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.pontuacao_total).toBe(40);
    expect(result.status).toBe("pendente");
  });

  it("eliminatória sim_nao reprova se resposta é 'Não'", () => {
    const campos = [
      campo({ tally_question_id: "a", tipo: "sim_nao", eliminatoria: true, peso: 0 }),
    ];
    const respostas = { a: ans("Não", "MULTIPLE_CHOICE") };
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.status).toBe("reprovado");
    expect(result.motivo_reprovacao).toContain("?");
  });

  it("eliminatória nota_1_10 reprova se valor < nota_minima", () => {
    const campos = [
      campo({
        tally_question_id: "a",
        tipo: "nota_1_10",
        eliminatoria: true,
        nota_minima: 7,
        peso: 50,
      }),
    ];
    const respostas = { a: ans(5, "LINEAR_SCALE") };
    const result = calcularPontuacao(campos, respostas, 0);
    expect(result.status).toBe("reprovado");
  });

  it("eliminatória multipla_escolha reprova se resposta está em opcoes_eliminatorias", () => {
    const campos = [
      campo({
        tally_question_id: "a",
        tipo: "multipla_escolha",
        eliminatoria: false,
        opcoes_eliminatorias: ["Não tenho disponibilidade"],
        peso: 0,
      }),
    ];
    const respostas = { a: ans("Não tenho disponibilidade", "MULTIPLE_CHOICE") };
    const result = calcularPontuacao(campos, respostas, 0);
    expect(result.status).toBe("reprovado");
  });

  it("soma ponderada combina nota_1_10 + sim_nao + multipla_escolha", () => {
    const campos = [
      campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 50 }), // 10/10 * 50 = 50
      campo({ tally_question_id: "b", tipo: "sim_nao", peso: 30 }), // 1 * 30 = 30
      campo({
        tally_question_id: "c",
        tipo: "multipla_escolha",
        opcoes_eliminatorias: ["X"],
        peso: 20,
      }), // selecionou não-eliminatória → 1 * 20 = 20
    ];
    const respostas = {
      a: ans(10, "LINEAR_SCALE"),
      b: ans("Sim", "MULTIPLE_CHOICE"),
      c: ans("Y", "MULTIPLE_CHOICE"),
    };
    const result = calcularPontuacao(campos, respostas, 60);
    expect(result.pontuacao_total).toBe(100);
    expect(result.status).toBe("aprovado");
  });

  it("ignora campos do tipo texto na soma", () => {
    const campos = [
      campo({ tally_question_id: "t", tipo: "texto", peso: 50 }), // ignorado
      campo({ tally_question_id: "n", tipo: "nota_1_10", peso: 100 }), // pesa 100
    ];
    const respostas = {
      t: ans("blabla"),
      n: ans(6, "LINEAR_SCALE"),
    };
    const result = calcularPontuacao(campos, respostas, 50);
    expect(result.pontuacao_total).toBe(60);
    expect(result.status).toBe("aprovado");
  });

  it("respostas faltando contam como 0", () => {
    const campos = [campo({ tally_question_id: "a", tipo: "nota_1_10", peso: 100 })];
    const result = calcularPontuacao(campos, {}, 60);
    expect(result.pontuacao_total).toBe(0);
    expect(result.status).toBe("pendente");
  });
});
```

- [ ] **Step 5.2: Rodar testes (devem falhar)**

```bash
npm test --workspace=packages/utils 2>&1 | tail -30
```

Expected: FAIL — `Cannot find module './scoring.js'`.

- [ ] **Step 5.3: Implementar `packages/utils/src/scoring.ts`**

```ts
import type { CampoTipo, FormularioCampo, RespostaStatus, TallyAnswer } from "@link-leagues/types";

export interface ScoringResult {
  pontuacao_total: number;
  status: RespostaStatus;
  motivo_reprovacao?: string;
}

export function calcularPontuacao(
  campos: FormularioCampo[],
  respostas: Record<string, TallyAnswer>,
  pontuacaoMinima: number,
): ScoringResult {
  // 1. Eliminatórias primeiro
  for (const campo of campos) {
    if (!campo.eliminatoria && !temOpcoesEliminatorias(campo)) continue;
    const key = campo.tally_question_id;
    if (!key) continue;
    const resposta = respostas[key];
    if (!resposta) continue;

    const motivo = avaliarEliminatoria(campo, resposta);
    if (motivo) {
      return {
        pontuacao_total: 0,
        status: "reprovado",
        motivo_reprovacao: motivo,
      };
    }
  }

  // 2. Soma ponderada
  let soma = 0;
  for (const campo of campos) {
    if (campo.tipo === "texto" || campo.peso <= 0) continue;
    const key = campo.tally_question_id;
    if (!key) continue;
    const resposta = respostas[key];
    if (!resposta) continue;

    const fator = fatorPontuacao(campo.tipo, resposta.value);
    soma += fator * campo.peso;
  }

  const pontuacao_total = Math.round(soma);
  const status: RespostaStatus = pontuacao_total >= pontuacaoMinima ? "aprovado" : "pendente";
  return { pontuacao_total, status };
}

function temOpcoesEliminatorias(campo: FormularioCampo): boolean {
  return (campo.opcoes_eliminatorias?.length ?? 0) > 0;
}

function avaliarEliminatoria(campo: FormularioCampo, resposta: TallyAnswer): string | null {
  const v = resposta.value;
  if (campo.tipo === "sim_nao" && campo.eliminatoria) {
    if (asString(v) === "Não") return `Resposta "Não" em pergunta eliminatória: ${campo.titulo}`;
  }
  if (campo.tipo === "nota_1_10" && campo.eliminatoria) {
    const n = asNumber(v);
    const minima = campo.nota_minima ?? 0;
    if (n !== null && n < minima) {
      return `Nota ${n} abaixo da mínima ${minima} em: ${campo.titulo}`;
    }
  }
  if (campo.tipo === "multipla_escolha" && campo.opcoes_eliminatorias?.length) {
    const escolhidas = asArrayOfStrings(v);
    const blocker = escolhidas.find((opt) => campo.opcoes_eliminatorias!.includes(opt));
    if (blocker) return `Opção eliminatória "${blocker}" em: ${campo.titulo}`;
  }
  return null;
}

function fatorPontuacao(tipo: CampoTipo, value: unknown): number {
  if (tipo === "nota_1_10") {
    const n = asNumber(value);
    if (n === null) return 0;
    return Math.max(0, Math.min(10, n)) / 10;
  }
  if (tipo === "sim_nao") {
    return asString(value) === "Sim" ? 1 : 0;
  }
  if (tipo === "multipla_escolha") {
    const escolhidas = asArrayOfStrings(value);
    return escolhidas.length > 0 ? 1 : 0;
  }
  return 0;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function asArrayOfStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : ""));
  if (typeof v === "string") return [v];
  return [];
}
```

- [ ] **Step 5.4: Exportar de `packages/utils/src/index.ts`**

Edite `packages/utils/src/index.ts` adicionando ao final:

```ts
export * from "./scoring.js";
```

- [ ] **Step 5.5: Rodar testes (devem passar)**

```bash
npm test --workspace=packages/utils 2>&1 | tail -30
```

Expected: 9 passed.

- [ ] **Step 5.6: Typecheck**

```bash
npm run typecheck --workspace=apps/api 2>&1 | tail -10
```

Expected: typecheck OK em `packages/utils`.

- [ ] **Step 5.7: Commit**

```bash
git add packages/utils/src/scoring.ts packages/utils/src/scoring.test.ts packages/utils/src/index.ts
git commit -m "feat(utils): implementa calcularPontuacao com eliminatórias e soma ponderada"
```

---

## Task 6: Service Tally — Wrapper HTTP + Mapper

**Files:**

- Create: `apps/api/src/services/tally.ts`
- Create: `apps/api/src/services/tally.test.ts`

### Contexto

Wrapper único para todos os chamados à API Tally. Inclui `tally-version` pinned, retry com backoff em 429, e o mapper Link Hub → Tally blocks (com container + option blocks para multipla_escolha/sim_nao).

- [ ] **Step 6.1: Criar diretório services**

```bash
mkdir -p apps/api/src/services
```

- [ ] **Step 6.2: Escrever testes primeiro**

Crie `apps/api/src/services/tally.test.ts`:

```ts
import { describe, it, expect } from "vitest";

import { mapCamposToBlocks, fromWebhookFields, fromSubmissionResponses } from "./tally.js";

import type { CreateCampoInput, TallyField, TallyResponse } from "@link-leagues/types";

function campo(over: Partial<CreateCampoInput>): CreateCampoInput {
  return {
    titulo: "Pergunta",
    tipo: "texto",
    ordem: 0,
    peso: 0,
    eliminatoria: false,
    ...over,
  };
}

describe("mapCamposToBlocks", () => {
  it("inclui FormTitleBlock como primeiro elemento", () => {
    const { blocks } = mapCamposToBlocks({ nome: "Meu Form" }, []);
    expect(blocks[0]?.type).toBe("FormTitleBlock");
    expect((blocks[0]?.payload as { text: string }).text).toBe("Meu Form");
  });

  it("texto vira 1× InputTextBlock", () => {
    const { blocks, ordemParaContainerUuid } = mapCamposToBlocks({ nome: "F" }, [
      campo({ titulo: "Nome completo", tipo: "texto", ordem: 0 }),
    ]);
    const inputs = blocks.filter((b) => b.type === "InputTextBlock");
    expect(inputs).toHaveLength(1);
    expect(ordemParaContainerUuid.get(0)).toBe(inputs[0]?.uuid);
  });

  it("multipla_escolha emite container + N options ligadas por groupUuid", () => {
    const { blocks, ordemParaContainerUuid } = mapCamposToBlocks({ nome: "F" }, [
      campo({
        titulo: "Sabor",
        tipo: "multipla_escolha",
        opcoes: ["Chocolate", "Baunilha", "Morango"],
        ordem: 0,
      }),
    ]);
    const container = blocks.find((b) => b.type === "MultipleChoiceBlock");
    const options = blocks.filter((b) => b.type === "MultipleChoiceOptionBlock");
    expect(container).toBeDefined();
    expect(options).toHaveLength(3);
    for (const opt of options) {
      expect(opt.groupUuid).toBe(container!.uuid);
    }
    expect(ordemParaContainerUuid.get(0)).toBe(container!.uuid);
  });

  it("nota_1_10 vira LinearScaleBlock com start=1 end=10", () => {
    const { blocks } = mapCamposToBlocks({ nome: "F" }, [campo({ tipo: "nota_1_10", ordem: 0 })]);
    const scale = blocks.find((b) => b.type === "LinearScaleBlock");
    expect(scale).toBeDefined();
    expect(scale!.payload).toMatchObject({ start: 1, end: 10 });
  });

  it("sim_nao vira MultipleChoiceBlock com 2 options Sim/Não", () => {
    const { blocks } = mapCamposToBlocks({ nome: "F" }, [campo({ tipo: "sim_nao", ordem: 0 })]);
    const options = blocks.filter((b) => b.type === "MultipleChoiceOptionBlock");
    expect(options.map((o) => (o.payload as { text: string }).text)).toEqual(["Sim", "Não"]);
  });

  it("preserva ordem do wizard no mapa retornado", () => {
    const { ordemParaContainerUuid } = mapCamposToBlocks({ nome: "F" }, [
      campo({ titulo: "A", tipo: "texto", ordem: 0 }),
      campo({ titulo: "B", tipo: "multipla_escolha", opcoes: ["X", "Y"], ordem: 1 }),
      campo({ titulo: "C", tipo: "nota_1_10", ordem: 2 }),
    ]);
    expect([...ordemParaContainerUuid.keys()].sort()).toEqual([0, 1, 2]);
    expect(new Set([...ordemParaContainerUuid.values()]).size).toBe(3);
  });
});

describe("fromWebhookFields", () => {
  it("normaliza key → questionId", () => {
    const fields: TallyField[] = [{ key: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" }];
    const result = fromWebhookFields(fields);
    expect(result).toEqual([
      { questionId: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" },
    ]);
  });
});

describe("fromSubmissionResponses", () => {
  it("resolve label e type via questions[] lookup", () => {
    const responses: TallyResponse[] = [
      { id: "r1", questionId: "q1", answer: 8, formattedAnswer: "8" },
    ];
    const questions = [{ id: "q1", title: "Nota", type: "LINEAR_SCALE" as const }];
    const result = fromSubmissionResponses(responses, questions);
    expect(result).toEqual([{ questionId: "q1", label: "Nota", type: "LINEAR_SCALE", value: 8 }]);
  });

  it("cai em INPUT_TEXT vazio se question não encontrada", () => {
    const responses: TallyResponse[] = [
      { id: "r1", questionId: "qX", answer: "x", formattedAnswer: "x" },
    ];
    const result = fromSubmissionResponses(responses, []);
    expect(result[0]?.type).toBe("INPUT_TEXT");
    expect(result[0]?.label).toBe("");
  });
});
```

- [ ] **Step 6.3: Garantir vitest configurado em apps/api**

Verifique se `apps/api/vitest.config.ts` existe:

```bash
ls apps/api/vitest.config.ts 2>/dev/null || echo "missing"
```

Se faltar, crie:

```ts
// apps/api/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 6.4: Rodar testes (devem falhar)**

```bash
npm test --workspace=apps/api 2>&1 | tail -30
```

Expected: FAIL — `Cannot find module './tally.js'`.

- [ ] **Step 6.5: Implementar `apps/api/src/services/tally.ts`**

```ts
import { randomUUID } from "crypto";

import { env } from "../config/env.js";

import type {
  CreateCampoInput,
  CreateTallyFormBody,
  RespostaNormalizada,
  TallyBlock,
  TallyField,
  TallyForm,
  TallyResponse,
  TallySubmissionsPage,
  TallyWebhook,
} from "@link-leagues/types";

const TALLY_API = "https://api.tally.so";
const TALLY_API_VERSION = "2025-02-01";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${env.TALLY_API_KEY}`);
  headers.set("Content-Type", "application/json");
  headers.set("tally-version", TALLY_API_VERSION);

  const url = `${TALLY_API}${path}`;
  const delays = [1000, 2000, 4000];
  let lastError: unknown;

  for (let attempt = 0; attempt < delays.length + 1; attempt++) {
    const res = await fetch(url, { ...init, headers });
    if (res.status === 429 && attempt < delays.length) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new TallyApiError(`Tally ${res.status} ${res.statusText}: ${body}`, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  throw lastError ?? new TallyApiError("Tally request failed após retries", 0);
}

export class TallyApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TallyApiError";
  }
}

export const tally = {
  forms: {
    create: (input: CreateTallyFormBody) =>
      request<TallyForm>("/forms", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, patch: Partial<TallyForm>) =>
      request<TallyForm>(`/forms/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    publish: (id: string) =>
      request<TallyForm>(`/forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PUBLISHED" }),
      }),
    unpublish: (id: string) =>
      request<TallyForm>(`/forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DRAFT" }),
      }),
    close: (id: string, closedMessage?: string) =>
      request<TallyForm>(`/forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ settings: { isClosed: true, closedMessage } }),
      }),
    get: (id: string) => request<TallyForm>(`/forms/${id}`),
  },
  submissions: {
    list: (
      formId: string,
      opts?: { limit?: number; after?: string; before?: string },
    ): Promise<TallySubmissionsPage> => {
      const qs = new URLSearchParams({ formId });
      if (opts?.limit) qs.set("limit", String(opts.limit));
      if (opts?.after) qs.set("after", opts.after);
      if (opts?.before) qs.set("before", opts.before);
      return request<TallySubmissionsPage>(`/forms/submissions?${qs}`);
    },
  },
  webhooks: {
    get: (id: string) => request<TallyWebhook>(`/webhooks/${id}`),
    create: (formId: string, url: string, signingSecret: string) =>
      request<TallyWebhook>("/webhooks", {
        method: "POST",
        body: JSON.stringify({ formId, url, signingSecret, eventTypes: ["FORM_RESPONSE"] }),
      }),
    setEnabled: async (id: string, isEnabled: boolean) => {
      const current = await request<TallyWebhook>(`/webhooks/${id}`);
      return request<TallyWebhook>(`/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          formId: current.formId,
          url: current.url,
          eventTypes: current.eventTypes,
          isEnabled,
        }),
      });
    },
    delete: (id: string) => request<void>(`/webhooks/${id}`, { method: "DELETE" }),
  },
};

// ============================================================================
// Mapper Link Hub → Tally blocks
// ============================================================================

export function mapCamposToBlocks(
  formulario: { nome: string; descricao?: string },
  campos: CreateCampoInput[],
): { blocks: TallyBlock[]; ordemParaContainerUuid: Map<number, string> } {
  const blocks: TallyBlock[] = [];
  const ordemParaContainerUuid = new Map<number, string>();

  // Title block (visível)
  blocks.push({
    uuid: randomUUID(),
    type: "FormTitleBlock",
    payload: { text: formulario.nome },
  });

  const ordenados = [...campos].sort((a, b) => a.ordem - b.ordem);

  for (const campo of ordenados) {
    const containerUuid = randomUUID();
    ordemParaContainerUuid.set(campo.ordem, containerUuid);

    if (campo.tipo === "texto") {
      blocks.push({
        uuid: containerUuid,
        type: "InputTextBlock",
        payload: { text: campo.titulo, isRequired: campo.eliminatoria },
      });
      continue;
    }

    if (campo.tipo === "nota_1_10") {
      blocks.push({
        uuid: containerUuid,
        type: "LinearScaleBlock",
        payload: { text: campo.titulo, start: 1, end: 10, isRequired: true },
      });
      continue;
    }

    if (campo.tipo === "multipla_escolha") {
      const opcoes = campo.opcoes ?? [];
      blocks.push({
        uuid: containerUuid,
        type: "MultipleChoiceBlock",
        payload: { text: campo.titulo, isRequired: true },
      });
      for (const opcao of opcoes) {
        blocks.push({
          uuid: randomUUID(),
          type: "MultipleChoiceOptionBlock",
          groupUuid: containerUuid,
          groupType: "MultipleChoiceBlock",
          payload: { text: opcao },
        });
      }
      continue;
    }

    if (campo.tipo === "sim_nao") {
      blocks.push({
        uuid: containerUuid,
        type: "MultipleChoiceBlock",
        payload: { text: campo.titulo, isRequired: true },
      });
      for (const text of ["Sim", "Não"]) {
        blocks.push({
          uuid: randomUUID(),
          type: "MultipleChoiceOptionBlock",
          groupUuid: containerUuid,
          groupType: "MultipleChoiceBlock",
          payload: { text },
        });
      }
      continue;
    }
  }

  return { blocks, ordemParaContainerUuid };
}

// ============================================================================
// Adapters de normalização para processarSubmission
// ============================================================================

export function fromWebhookFields(fields: TallyField[]): RespostaNormalizada[] {
  return fields.map((f) => ({
    questionId: f.key,
    label: f.label,
    type: f.type,
    value: f.value,
  }));
}

export function fromSubmissionResponses(
  responses: TallyResponse[],
  questions: TallySubmissionsPage["questions"],
): RespostaNormalizada[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return responses.map((r) => {
    const q = byId.get(r.questionId);
    return {
      questionId: r.questionId,
      label: q?.title ?? "",
      type: q?.type ?? "INPUT_TEXT",
      value: r.answer,
    };
  });
}
```

- [ ] **Step 6.6: Rodar testes (devem passar)**

```bash
npm test --workspace=apps/api 2>&1 | tail -30
```

Expected: testes do `tally.test.ts` passam (9 testes).

- [ ] **Step 6.7: Typecheck**

```bash
npm run typecheck --workspace=apps/api 2>&1 | tail -20
```

Expected: zero erros relacionados a `services/tally.ts`. Erros em `routes/formularios.ts` ainda esperados (corrigimos na Task 9).

- [ ] **Step 6.8: Commit**

```bash
git add apps/api/src/services/tally.ts apps/api/src/services/tally.test.ts apps/api/vitest.config.ts
git commit -m "feat(api): cria service Tally com wrapper HTTP, mapper e adapters"
```

---

## Task 7: Processor — `processarSubmission` compartilhado

**Files:**

- Create: `apps/api/src/services/formularios-processor.ts`

### Contexto

Função compartilhada entre webhook e `/sincronizar`. Recebe `RespostaNormalizada[]` (já adaptado), faz matching por `tally_question_id`, aplica scoring, e insere `formulario_respostas` de forma idempotente.

- [ ] **Step 7.1: Criar `apps/api/src/services/formularios-processor.ts`**

```ts
import { calcularPontuacao } from "@link-leagues/utils";

import { sql } from "../config/db.js";

import type {
  FormularioCampo,
  RespostaNormalizada,
  RespostaStatus,
  TallyAnswer,
  TallyFieldType,
} from "@link-leagues/types";

interface FormularioRow {
  id: string;
  scoring_enabled: boolean;
  pontuacao_minima_aprovacao: number | null;
}

/**
 * Processa uma submission (vinda do webhook ou do /sincronizar).
 * Idempotente por (formulario_id, tally_submission_id).
 *
 * @returns `true` se inseriu nova resposta, `false` se ignorou (duplicada ou form desconhecido).
 */
export async function processarSubmission(
  tallyFormId: string,
  tallySubmissionId: string,
  respostas: RespostaNormalizada[],
  submittedAt: string = new Date().toISOString(),
): Promise<boolean> {
  // 1. Resolve formulário
  const [formulario] = await sql<FormularioRow[]>`
    SELECT id, scoring_enabled, pontuacao_minima_aprovacao
    FROM formularios
    WHERE tally_form_id = ${tallyFormId}
    LIMIT 1
  `;
  if (!formulario) {
    console.warn(`[tally] formulario desconhecido tally_form_id=${tallyFormId}`);
    return false;
  }

  // 2. Idempotência
  const [existente] = await sql`
    SELECT 1 FROM formulario_respostas
    WHERE tally_submission_id = ${tallySubmissionId}
    LIMIT 1
  `;
  if (existente) return false;

  // 3. Monta mapa { tally_question_id → TallyAnswer }
  const respostasMap: Record<string, TallyAnswer> = {};
  for (const r of respostas) {
    respostasMap[r.questionId] = { type: r.type, value: r.value, label: r.label };
  }

  // 4. Extrai nome/email procurando por label case-insensitive
  const nome = encontrarPorLabel(respostas, /^nome/i) ?? "";
  const email = encontrarPorLabel(respostas, /^e-?mail/i) ?? "";

  // 5. Scoring (se habilitado)
  let pontuacao_total: number | null = null;
  let status: RespostaStatus = "pendente";
  let motivo_reprovacao: string | null = null;

  if (formulario.scoring_enabled && formulario.pontuacao_minima_aprovacao !== null) {
    const campos = await sql<FormularioCampo[]>`
      SELECT * FROM formulario_campos
      WHERE formulario_id = ${formulario.id}
      ORDER BY ordem ASC
    `;
    const result = calcularPontuacao(campos, respostasMap, formulario.pontuacao_minima_aprovacao);
    pontuacao_total = result.pontuacao_total;
    status = result.status;
    motivo_reprovacao = result.motivo_reprovacao ?? null;
  }

  // 6. Insert
  await sql`
    INSERT INTO formulario_respostas
      (formulario_id, tally_submission_id, nome, email, respostas,
       pontuacao_total, status, motivo_reprovacao, submitted_at, sincronizado_at)
    VALUES
      (${formulario.id}, ${tallySubmissionId}, ${nome}, ${email},
       ${JSON.stringify(respostasMap)},
       ${pontuacao_total}, ${status}, ${motivo_reprovacao},
       ${submittedAt}, NOW())
    ON CONFLICT (tally_submission_id) DO NOTHING
  `;
  return true;
}

function encontrarPorLabel(respostas: RespostaNormalizada[], pattern: RegExp): string | null {
  const r = respostas.find((x) => pattern.test(x.label));
  if (!r) return null;
  if (typeof r.value === "string") return r.value;
  if (typeof r.value === "number") return String(r.value);
  return null;
}

// Re-exporta tipo para conveniência de import
export type { RespostaNormalizada, TallyFieldType };
```

- [ ] **Step 7.2: Typecheck**

```bash
npm run typecheck --workspace=apps/api 2>&1 | tail -20
```

Expected: zero erros em `services/formularios-processor.ts`.

- [ ] **Step 7.3: Commit**

```bash
git add apps/api/src/services/formularios-processor.ts
git commit -m "feat(api): processarSubmission compartilhado entre webhook e /sincronizar"
```

---

## Task 8: Webhook Endpoint

**Files:**

- Create: `apps/api/src/routes/tally-webhook.ts`
- Create: `apps/api/src/routes/tally-webhook.test.ts`
- Modify: `apps/api/src/index.ts`

### Contexto

Rota pública (sem `authenticate`). Precisa do raw body para HMAC, então é montada antes do `express.json` global em `apps/api/src/index.ts`.

- [ ] **Step 8.1: Escrever testes primeiro**

Crie `apps/api/src/routes/tally-webhook.test.ts`:

```ts
import crypto from "crypto";

import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { tallyWebhookRouter, __setProcessor } from "./tally-webhook.js";

const SECRET = "test-secret-replace-in-prod-min-16-chars";

function makeApp() {
  const app = express();
  app.use(tallyWebhookRouter);
  return app;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("base64");
}

describe("POST /api/formularios/webhook/tally", () => {
  let processor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.TALLY_WEBHOOK_SIGNING_SECRET = SECRET;
    processor = vi.fn().mockResolvedValue(true);
    __setProcessor(processor);
  });

  it("aceita assinatura válida e chama processador", async () => {
    const app = makeApp();
    const body = JSON.stringify({
      eventId: "evt_1",
      eventType: "FORM_RESPONSE",
      createdAt: "2026-05-12T00:00:00Z",
      data: {
        responseId: "resp_1",
        respondentId: "p_1",
        formId: "tally_abc",
        fields: [{ key: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" }],
      },
    });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .set("tally-signature", sign(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(processor).toHaveBeenCalledOnce();
    expect(processor).toHaveBeenCalledWith(
      "tally_abc",
      "resp_1",
      [{ questionId: "k1", label: "Nome", type: "INPUT_TEXT", value: "João" }],
      "2026-05-12T00:00:00Z",
    );
  });

  it("rejeita assinatura inválida com 401", async () => {
    const app = makeApp();
    const body = JSON.stringify({ data: { formId: "x", responseId: "y", fields: [] } });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .set("tally-signature", "bogus")
      .send(body);
    expect(res.status).toBe(401);
    expect(processor).not.toHaveBeenCalled();
  });

  it("rejeita sem header de assinatura com 401", async () => {
    const app = makeApp();
    const body = JSON.stringify({ data: { formId: "x", responseId: "y", fields: [] } });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .send(body);
    expect(res.status).toBe(401);
  });

  it("retorna 200 mesmo quando processarSubmission retorna false (idempotente)", async () => {
    processor.mockResolvedValueOnce(false);
    const app = makeApp();
    const body = JSON.stringify({
      eventId: "evt",
      eventType: "FORM_RESPONSE",
      createdAt: "2026-05-12T00:00:00Z",
      data: { responseId: "r", respondentId: "p", formId: "f", fields: [] },
    });
    const res = await request(app)
      .post("/api/formularios/webhook/tally")
      .set("Content-Type", "application/json")
      .set("tally-signature", sign(body))
      .send(body);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 8.2: Instalar supertest se ainda não existir**

```bash
ls apps/api/node_modules/supertest 2>/dev/null || npm install -D supertest @types/supertest --workspace=apps/api
```

- [ ] **Step 8.3: Rodar testes (devem falhar)**

```bash
npm test --workspace=apps/api 2>&1 | tail -30
```

Expected: FAIL — `Cannot find module './tally-webhook.js'`.

- [ ] **Step 8.4: Implementar `apps/api/src/routes/tally-webhook.ts`**

```ts
import crypto from "crypto";

import express, { Router, type Router as IRouter } from "express";

import { env } from "../config/env.js";
import { processarSubmission as defaultProcessor } from "../services/formularios-processor.js";
import { fromWebhookFields } from "../services/tally.js";

import type { TallyWebhookEvent } from "@link-leagues/types";

export const tallyWebhookRouter: IRouter = Router();

type Processor = (
  formId: string,
  submissionId: string,
  respostas: ReturnType<typeof fromWebhookFields>,
  submittedAt: string,
) => Promise<boolean>;

let processor: Processor = defaultProcessor;

/** Testing seam — não usar em prod. */
export function __setProcessor(fn: Processor): void {
  processor = fn;
}

tallyWebhookRouter.post(
  "/api/formularios/webhook/tally",
  express.raw({ type: "application/json", limit: "200kb" }),
  async (req, res, next) => {
    try {
      const sig = req.header("tally-signature");
      if (!sig) {
        res.status(401).end();
        return;
      }

      const rawBody = req.body as Buffer;
      const expected = crypto
        .createHmac("sha256", env.TALLY_WEBHOOK_SIGNING_SECRET)
        .update(rawBody)
        .digest("base64");

      if (!timingSafeEqualB64(sig, expected)) {
        res.status(401).end();
        return;
      }

      const event = JSON.parse(rawBody.toString("utf8")) as TallyWebhookEvent;
      const respostas = fromWebhookFields(event.data.fields);

      await processor(event.data.formId, event.data.responseId, respostas, event.createdAt);

      res.status(200).end();
    } catch (err) {
      next(err);
    }
  },
);

function timingSafeEqualB64(a: string, b: string): boolean {
  const ab = Buffer.from(a, "base64");
  const bb = Buffer.from(b, "base64");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
```

- [ ] **Step 8.5: Montar o router em `apps/api/src/index.ts` ANTES do `express.json`**

Edite `apps/api/src/index.ts`. Localize a linha:

```ts
app.use(express.json({ limit: "200kb" }));
```

E ANTES dela, adicione:

```ts
import { tallyWebhookRouter } from "./routes/tally-webhook.js";
// ... (deixa o import junto dos outros no topo)

// Mount Tally webhook BEFORE express.json — needs raw body for HMAC
app.use(tallyWebhookRouter);
```

Importe `tallyWebhookRouter` no topo do arquivo, junto dos outros imports.

- [ ] **Step 8.6: Rodar testes (devem passar)**

```bash
npm test --workspace=apps/api 2>&1 | tail -30
```

Expected: 4 testes do tally-webhook passam.

- [ ] **Step 8.7: Typecheck**

```bash
npm run typecheck --workspace=apps/api 2>&1 | tail -20
```

Expected: zero erros em `routes/tally-webhook.ts` e `index.ts`.

- [ ] **Step 8.8: Commit**

```bash
git add apps/api/src/routes/tally-webhook.ts apps/api/src/routes/tally-webhook.test.ts apps/api/src/index.ts apps/api/package.json package-lock.json
git commit -m "feat(api): webhook /api/formularios/webhook/tally com validação HMAC"
```

---

## Task 9: Refactor `routes/formularios.ts` — CRUD com Tally

**Files:**

- Modify: `apps/api/src/routes/formularios.ts`

### Contexto

Refactor completo do arquivo. Endpoints:

- `GET /formularios` — lista, com filtro opcional `?tipo=` e `?liga_id=`. Permissões: `staff` vê tudo; `diretor` vê forms que criou OU forms cuja `liga_id` é sua liga.
- `GET /formularios/minha-liga` — preserva (usado pelo wizard).
- `GET /formularios/:id` — retorna `FormularioComCampos`.
- `POST /formularios` — cria local + chama Tally + atualiza `tally_question_id`.
- `POST /formularios/:id/publicar` — publica no Tally + cria webhook.
- `POST /formularios/:id/encerrar` — `webhooks.setEnabled(false)` + `forms.close()`.
- `POST /formularios/:id/sincronizar` — `GET /forms/submissions` paginado + chama processor.
- `GET /formularios/:id/resultados` — preserva (já funcionava).

Remove `POST /formularios/assets/upload` (não usado).

- [ ] **Step 9.1: Substituir o arquivo completo**

Substitua `apps/api/src/routes/formularios.ts` por:

```ts
import { Router, type Router as IRouter } from "express";

import { env } from "../config/env.js";
import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";
import { processarSubmission } from "../services/formularios-processor.js";
import {
  fromSubmissionResponses,
  mapCamposToBlocks,
  TallyApiError,
  tally,
} from "../services/tally.js";

import type { CreateFormularioInput, FormularioTipo } from "@link-leagues/types";

export const formulariosRouter: IRouter = Router();

const TIPOS_VALIDOS: FormularioTipo[] = [
  "generico",
  "processo_seletivo",
  "pesquisa",
  "inscricao",
  "feedback",
];

// ============================================================================
// GET /formularios/minha-liga
// ============================================================================
formulariosRouter.get(
  "/minha-liga",
  authenticate,
  requireRole("diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const [liga] = await sql`
        SELECT l.id, l.nome
        FROM ligas l
        WHERE l.ativo = true
          AND (
            l.lider_id = (SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1)
            OR EXISTS (
              SELECT 1 FROM liga_membros lm
              JOIN usuarios u ON u.id = lm.usuario_id
              WHERE lm.liga_id = l.id
                AND u.email = ${user.email}
                AND (lm.cargo = 'Diretor' OR u.role = 'diretor')
            )
          )
        LIMIT 1
      `;
      if (!liga) {
        res.status(404).json({ error: "Nenhuma liga encontrada para este diretor." });
        return;
      }
      res.json(liga);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// GET /formularios — listagem
// ============================================================================
formulariosRouter.get(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const tipo = req.query["tipo"] as string | undefined;
      const liga_id = req.query["liga_id"] as string | undefined;

      const tipoFilter = tipo && TIPOS_VALIDOS.includes(tipo as FormularioTipo) ? tipo : null;

      let rows;
      if (user.role === "staff") {
        rows = await sql`
          SELECT f.*, l.nome as liga_nome
          FROM formularios f
          LEFT JOIN ligas l ON l.id = f.liga_id
          WHERE (${tipoFilter}::text IS NULL OR f.tipo = ${tipoFilter})
            AND (${liga_id ?? null}::uuid IS NULL OR f.liga_id = ${liga_id ?? null})
          ORDER BY f.created_at DESC
        `;
      } else {
        const [usuario] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;
        rows = await sql`
          SELECT f.*, l.nome as liga_nome
          FROM formularios f
          LEFT JOIN ligas l ON l.id = f.liga_id
          WHERE (${tipoFilter}::text IS NULL OR f.tipo = ${tipoFilter})
            AND (
              f.created_by = ${usuario?.id ?? null}
              OR (f.liga_id IS NOT NULL AND (
                l.lider_id = ${usuario?.id ?? null}
                OR EXISTS (
                  SELECT 1 FROM liga_membros lm
                  JOIN usuarios u ON u.id = lm.usuario_id
                  WHERE lm.liga_id = l.id AND u.email = ${user.email}
                  AND (lm.cargo = 'Diretor' OR u.role = 'diretor')
                )
              ))
            )
          ORDER BY f.created_at DESC
        `;
      }
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios — cria local + Tally
// ============================================================================
formulariosRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const body = req.body as CreateFormularioInput;
      const {
        liga_id,
        tipo,
        nome,
        descricao,
        scoring_enabled,
        pontuacao_minima_aprovacao,
        campos,
      } = body;

      // Validações
      if (!nome || !tipo || !campos?.length) {
        res.status(400).json({ error: "tipo, nome e campos são obrigatórios." });
        return;
      }
      if (!TIPOS_VALIDOS.includes(tipo)) {
        res.status(400).json({ error: `tipo inválido. Use um de: ${TIPOS_VALIDOS.join(", ")}` });
        return;
      }
      if (
        scoring_enabled &&
        (pontuacao_minima_aprovacao === undefined || pontuacao_minima_aprovacao === null)
      ) {
        res.status(400).json({
          error: "pontuacao_minima_aprovacao é obrigatório quando scoring_enabled=true.",
        });
        return;
      }
      if (user.role === "diretor") {
        if (!liga_id) {
          res.status(400).json({ error: "Diretor deve associar a uma liga." });
          return;
        }
        if (!(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
          res.status(403).json({ error: "Você só pode criar formulários da sua própria liga." });
          return;
        }
      }
      if (user.role === "staff" && tipo === "processo_seletivo" && !liga_id) {
        res.status(400).json({ error: "Processo seletivo requer uma liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      // 1. INSERT formulario (status=rascunho, tally_form_id ainda NULL)
      const [formulario] = await sql`
        INSERT INTO formularios
          (liga_id, tipo, nome, descricao, status, scoring_enabled, pontuacao_minima_aprovacao, created_by)
        VALUES
          (${liga_id ?? null}, ${tipo}, ${nome}, ${descricao ?? null},
           'rascunho', ${scoring_enabled}, ${pontuacao_minima_aprovacao ?? null},
           ${criador?.id ?? null})
        RETURNING *
      `;
      if (!formulario) {
        res.status(500).json({ error: "Erro ao criar formulário." });
        return;
      }

      // 2. INSERT campos (sem tally_question_id ainda)
      for (const c of campos) {
        await sql`
          INSERT INTO formulario_campos
            (formulario_id, titulo, tipo, ordem, peso, eliminatoria, nota_minima, opcoes, opcoes_eliminatorias)
          VALUES
            (${formulario.id}, ${c.titulo}, ${c.tipo}, ${c.ordem},
             ${c.peso}, ${c.eliminatoria}, ${c.nota_minima ?? null},
             ${c.opcoes ? JSON.stringify(c.opcoes) : null},
             ${c.opcoes_eliminatorias ? JSON.stringify(c.opcoes_eliminatorias) : null})
        `;
      }

      // 3. Chama Tally para criar o form
      const { blocks, ordemParaContainerUuid } = mapCamposToBlocks({ nome, descricao }, campos);

      let tallyForm;
      try {
        tallyForm = await tally.forms.create({
          name: nome,
          status: "DRAFT",
          workspaceId: env.TALLY_WORKSPACE_ID,
          blocks,
        });
      } catch (err) {
        // Cleanup local — não persistimos form sem Tally backing
        await sql`DELETE FROM formularios WHERE id = ${formulario.id}`;
        if (err instanceof TallyApiError) {
          res.status(502).json({ error: `Falha ao criar form no Tally: ${err.message}` });
          return;
        }
        throw err;
      }

      const tallyFormUrl = `https://tally.so/r/${tallyForm.id}`;

      // 4. UPDATE formulario com tally_form_id/url
      await sql`
        UPDATE formularios
        SET tally_form_id = ${tallyForm.id},
            tally_form_url = ${tallyFormUrl},
            updated_at = NOW()
        WHERE id = ${formulario.id}
      `;

      // 5. Backfill tally_question_id em cada campo
      for (const [ordem, uuid] of ordemParaContainerUuid) {
        await sql`
          UPDATE formulario_campos
          SET tally_question_id = ${uuid}
          WHERE formulario_id = ${formulario.id} AND ordem = ${ordem}
        `;
      }

      // 6. Retorna formulário completo
      const [final] = await sql`
        SELECT f.*, l.nome as liga_nome
        FROM formularios f
        LEFT JOIN ligas l ON l.id = f.liga_id
        WHERE f.id = ${formulario.id}
      `;
      const camposFinais = await sql`
        SELECT * FROM formulario_campos
        WHERE formulario_id = ${formulario.id}
        ORDER BY ordem ASC
      `;
      res.status(201).json({ ...final, campos: camposFinais });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// GET /formularios/:id
// ============================================================================
formulariosRouter.get(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`
        SELECT f.*, l.nome as liga_nome
        FROM formularios f
        LEFT JOIN ligas l ON l.id = f.liga_id
        WHERE f.id = ${id}
        LIMIT 1
      `;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }
      const campos = await sql`
        SELECT * FROM formulario_campos
        WHERE formulario_id = ${id}
        ORDER BY ordem ASC
      `;
      res.json({ ...formulario, campos });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios/:id/publicar
// ============================================================================
formulariosRouter.post(
  "/:id/publicar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (formulario.status !== "rascunho") {
        res.status(400).json({ error: "Apenas formulários em rascunho podem ser publicados." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }
      if (!formulario.tally_form_id) {
        res.status(500).json({ error: "Formulário sem tally_form_id." });
        return;
      }

      // 1. Publica no Tally
      await tally.forms.publish(formulario.tally_form_id as string);

      // 2. Cria webhook
      let webhook;
      try {
        webhook = await tally.webhooks.create(
          formulario.tally_form_id as string,
          `${env.PUBLIC_API_BASE_URL}/api/formularios/webhook/tally`,
          env.TALLY_WEBHOOK_SIGNING_SECRET,
        );
      } catch (err) {
        // Rollback: volta para DRAFT
        await tally.forms.unpublish(formulario.tally_form_id as string);
        if (err instanceof TallyApiError) {
          res.status(502).json({ error: `Falha ao criar webhook: ${err.message}` });
          return;
        }
        throw err;
      }

      const [updated] = await sql`
        UPDATE formularios
        SET status = 'aberto', tally_webhook_id = ${webhook.id}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios/:id/encerrar
// ============================================================================
formulariosRouter.post(
  "/:id/encerrar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (formulario.status !== "aberto") {
        res.status(400).json({ error: "Apenas formulários abertos podem ser encerrados." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      if (formulario.tally_webhook_id) {
        try {
          await tally.webhooks.setEnabled(formulario.tally_webhook_id as string, false);
        } catch (err) {
          console.warn(`[tally] falha ao desabilitar webhook: ${(err as Error).message}`);
        }
      }
      if (formulario.tally_form_id) {
        try {
          await tally.forms.close(formulario.tally_form_id as string, "Formulário encerrado.");
        } catch (err) {
          console.warn(`[tally] falha ao fechar form: ${(err as Error).message}`);
        }
      }

      const [updated] = await sql`
        UPDATE formularios
        SET status = 'encerrado', updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// POST /formularios/:id/sincronizar
// ============================================================================
formulariosRouter.post(
  "/:id/sincronizar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }
      if (!formulario.tally_form_id) {
        res.status(400).json({ error: "Formulário sem tally_form_id." });
        return;
      }

      let sincronizados = 0;
      let after: string | undefined;
      do {
        const page = await tally.submissions.list(formulario.tally_form_id as string, {
          limit: 100,
          after,
        });
        for (const submission of page.items) {
          const respostas = fromSubmissionResponses(submission.responses, page.questions);
          const inseriu = await processarSubmission(
            formulario.tally_form_id as string,
            submission.id,
            respostas,
            submission.submittedAt,
          );
          if (inseriu) sincronizados++;
        }
        after = page.hasMore ? page.nextCursor : undefined;
      } while (after);

      res.json({ sincronizados });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// GET /formularios/:id/resultados
// ============================================================================
formulariosRouter.get(
  "/:id/resultados",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [formulario] = await sql`SELECT * FROM formularios WHERE id = ${id} LIMIT 1`;
      if (!formulario) {
        res.status(404).json({ error: "Formulário não encontrado." });
        return;
      }
      if (
        user.role === "diretor" &&
        formulario.liga_id &&
        !(await usuarioEhDiretorDaLiga(user.email, formulario.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const statusFiltro = req.query["status"] as string | undefined;
      const respostas = statusFiltro
        ? await sql`
            SELECT * FROM formulario_respostas
            WHERE formulario_id = ${id} AND status = ${statusFiltro}
            ORDER BY pontuacao_total DESC NULLS LAST, submitted_at ASC
          `
        : await sql`
            SELECT * FROM formulario_respostas
            WHERE formulario_id = ${id}
            ORDER BY pontuacao_total DESC NULLS LAST, submitted_at ASC
          `;

      const [stats] = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
          COUNT(*) FILTER (WHERE status = 'reprovado') as reprovados,
          COUNT(*) FILTER (WHERE status = 'pendente') as pendentes
        FROM formulario_respostas
        WHERE formulario_id = ${id}
      `;

      res.json({
        total: Number(stats?.total ?? 0),
        aprovados: Number(stats?.aprovados ?? 0),
        reprovados: Number(stats?.reprovados ?? 0),
        pendentes: Number(stats?.pendentes ?? 0),
        respostas,
      });
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 9.2: Typecheck**

```bash
npm run typecheck --workspace=apps/api 2>&1 | tail -30
```

Expected: zero erros em `routes/formularios.ts`.

- [ ] **Step 9.3: Rodar todos os testes da API**

```bash
npm test --workspace=apps/api 2>&1 | tail -30
```

Expected: todos os testes existentes + os novos passam.

- [ ] **Step 9.4: Commit**

```bash
git add apps/api/src/routes/formularios.ts
git commit -m "feat(api): refatora formularios.ts para usar Tally (cria, publica, encerra, sincroniza)"
```

---

## Task 10: Wizard — `NovoFormularioPage.tsx` para 3 etapas

**Files:**

- Modify: `apps/web/src/pages/formularios/NovoFormularioPage.tsx`

### Contexto

Reduz wizard de 4 → 3 etapas. Remove etapa de Personalização inteira (`TypeformMockup`, `ColorField`, `ImageUrlField`). Adiciona seleção de `tipo` e toggle `scoring_enabled`. Validação de pesos somando 100 só aplica se `scoring_enabled`.

- [ ] **Step 10.1: Substituir o arquivo completo**

Substitua `apps/web/src/pages/formularios/NovoFormularioPage.tsx` por:

```tsx
import { ArrowLeft, ArrowRight, Check, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import type {
  CampoTipo,
  CreateCampoInput,
  CreateFormularioInput,
  FormularioComCampos,
  FormularioTipo,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface LigaOpcao {
  id: string;
  nome: string;
}

const CAMPO_LABELS: Record<CampoTipo, string> = {
  texto: "Texto livre",
  multipla_escolha: "Múltipla escolha",
  nota_1_10: "Nota (1–10)",
  sim_nao: "Sim / Não",
};

const TIPO_LABELS: Record<FormularioTipo, string> = {
  generico: "Genérico",
  processo_seletivo: "Processo Seletivo",
  pesquisa: "Pesquisa",
  inscricao: "Inscrição",
  feedback: "Feedback",
};

const ETAPA_LABELS = ["Informações", "Campos", "Revisão"];

export function NovoFormularioPage() {
  const navigate = useNavigate();
  const { role } = useUser();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [linkCriado, setLinkCriado] = useState<string | null>(null);
  const [formularioId, setFormularioId] = useState<string | null>(null);
  const [ligas, setLigas] = useState<LigaOpcao[]>([]);
  const [ligaFixa, setLigaFixa] = useState<LigaOpcao | null>(null);
  const [carregandoLiga, setCarregandoLiga] = useState(false);

  // Etapa 1 — Informações
  const [tipo, setTipo] = useState<FormularioTipo>("generico");
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [pontuacaoMinima, setPontuacaoMinima] = useState(60);
  const [ligaId, setLigaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  // Etapa 2 — Campos
  const [campos, setCampos] = useState<CreateCampoInput[]>([]);
  const [somaPesos, setSomaPesos] = useState(0);

  useEffect(() => {
    if (role === "diretor") void carregarMinhaLiga();
    else if (role === "staff") void carregarLigas();
  }, [role]);

  useEffect(() => {
    setSomaPesos(campos.reduce((acc, c) => acc + (c.peso || 0), 0));
  }, [campos]);

  // Quando tipo muda, sugere scoring default
  useEffect(() => {
    setScoringEnabled(tipo === "processo_seletivo");
  }, [tipo]);

  async function carregarMinhaLiga() {
    try {
      setCarregandoLiga(true);
      const token = await getToken();
      const res = await fetch("/api/formularios/minha-liga", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const liga = (await res.json()) as LigaOpcao;
      setLigaFixa(liga);
      setLigaId(liga.id);
    } catch {
      toast.error("Erro ao carregar sua liga.");
    } finally {
      setCarregandoLiga(false);
    }
  }

  async function carregarLigas() {
    try {
      const token = await getToken();
      const res = await fetch("/api/ligas", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      setLigas(dados.map((l: { id: string; nome: string }) => ({ id: l.id, nome: l.nome })));
    } catch {
      toast.error("Erro ao carregar ligas");
    }
  }

  function adicionarCampo(t: CampoTipo) {
    const novo: CreateCampoInput = {
      titulo: "",
      tipo: t,
      ordem: campos.length,
      peso: 0,
      eliminatoria: false,
      nota_minima: t === "nota_1_10" ? 5 : undefined,
      opcoes: t === "multipla_escolha" ? ["", ""] : undefined,
      opcoes_eliminatorias: t === "multipla_escolha" ? [] : undefined,
    };
    setCampos([...campos, novo]);
  }

  function atualizarCampo(index: number, dados: Partial<CreateCampoInput>) {
    setCampos((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        return { ...c, ...dados };
      }),
    );
  }

  function removerCampo(index: number) {
    setCampos((prev) => prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, ordem: i })));
  }

  function atualizarOpcao(campoIndex: number, opcaoIndex: number, valor: string) {
    setCampos((prev) =>
      prev.map((c, i) => {
        if (i !== campoIndex) return c;
        const opcoes = [...(c.opcoes ?? [])];
        opcoes[opcaoIndex] = valor;
        return { ...c, opcoes };
      }),
    );
  }

  function adicionarOpcao(campoIndex: number) {
    setCampos((prev) =>
      prev.map((c, i) => (i === campoIndex ? { ...c, opcoes: [...(c.opcoes ?? []), ""] } : c)),
    );
  }

  function toggleOpcaoEliminatoria(campoIndex: number, opcao: string) {
    setCampos((prev) =>
      prev.map((c, i) => {
        if (i !== campoIndex) return c;
        const eliminatorias = c.opcoes_eliminatorias ?? [];
        const jaEsta = eliminatorias.includes(opcao);
        return {
          ...c,
          opcoes_eliminatorias: jaEsta
            ? eliminatorias.filter((o) => o !== opcao)
            : [...eliminatorias, opcao],
        };
      }),
    );
  }

  async function criarFormulario(publicar: boolean) {
    // Validações
    if (!tipo || !nome || campos.length === 0) {
      toast.error("Preencha todas as informações obrigatórias.");
      return;
    }
    if (tipo === "processo_seletivo" && !ligaId) {
      toast.error("Processo Seletivo requer uma liga.");
      return;
    }
    if (scoringEnabled) {
      const camposComPeso = campos.filter((c) => c.tipo !== "texto");
      if (camposComPeso.length > 0 && somaPesos !== 100) {
        toast.error(`A soma dos pesos deve ser exatamente 100. Atual: ${somaPesos}.`);
        return;
      }
    }

    try {
      setSalvando(true);
      const token = await getToken();
      const payload: CreateFormularioInput = {
        liga_id: ligaId || undefined,
        tipo,
        nome,
        descricao: descricao || undefined,
        scoring_enabled: scoringEnabled,
        pontuacao_minima_aprovacao: scoringEnabled ? pontuacaoMinima : undefined,
        campos,
      };

      const res = await fetch("/api/formularios", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? "Erro ao criar formulário");
      }

      const formulario = (await res.json()) as FormularioComCampos;
      setFormularioId(formulario.id);

      if (publicar) {
        const pubRes = await fetch(`/api/formularios/${formulario.id}/publicar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pubRes.ok) {
          const err = await pubRes.json();
          toast.warning(
            `Formulário criado, mas não publicado: ${(err as { error?: string }).error ?? "erro"}`,
          );
        }
      }

      setLinkCriado(formulario.tally_form_url ?? null);
      setEtapa(4); // tela de sucesso
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar formulário");
    } finally {
      setSalvando(false);
    }
  }

  // ============== TELA DE SUCESSO ==============
  if (etapa === 4 && linkCriado) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="text-center py-12 border border-navy/15">
          <Check className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="font-display font-bold text-[20px] text-navy mb-2">
            Formulário criado com sucesso!
          </h2>
          <p className="text-[13px] text-navy/60 mb-6">
            Compartilhe o link abaixo com os respondentes.
          </p>
          <div className="flex items-center gap-2 border border-navy/20 p-3 mx-auto max-w-sm">
            <span className="text-[12px] text-navy/60 truncate flex-1">{linkCriado}</span>
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(linkCriado);
                toast.success("Link copiado!");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-center gap-3 mt-8">
            <Button
              variant="outline"
              onClick={() => navigate("/formularios")}
              className="border-navy/20 text-navy"
            >
              Ver todos os formulários
            </Button>
            {formularioId && (
              <Button
                onClick={() => navigate(`/formularios/${formularioId}`)}
                className="bg-navy text-white hover:bg-navy/90"
              >
                Ver respostas
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-8">
        <button
          onClick={() => navigate("/formularios")}
          className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Formulários
        </button>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mb-1">
          Novo Formulário
        </p>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Criar Formulário
        </h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto">
        {ETAPA_LABELS.map((label, i) => {
          const num = i + 1;
          const ativa = etapa === num;
          const concluida = etapa > num;
          return (
            <div key={num} className="flex items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                    ${ativa ? "bg-navy text-white" : concluida ? "bg-navy/20 text-navy" : "bg-brand-gray text-navy/40"}`}
                >
                  {concluida ? <Check className="w-3 h-3" /> : num}
                </div>
                <span className={`text-[12px] font-medium ${ativa ? "text-navy" : "text-navy/40"}`}>
                  {label}
                </span>
              </div>
              {i < ETAPA_LABELS.length - 1 && <div className="w-8 h-px bg-navy/15 mx-3" />}
            </div>
          );
        })}
      </div>

      {/* ETAPA 1 — Informações */}
      {etapa === 1 && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Tipo de formulário *
            </label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as FormularioTipo)}>
              <SelectTrigger className="border-border bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TIPO_LABELS) as [FormularioTipo, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 p-3 border border-border bg-muted/30 rounded">
            <input
              type="checkbox"
              id="scoring"
              checked={scoringEnabled}
              onChange={(e) => setScoringEnabled(e.target.checked)}
              className="accent-navy"
            />
            <label htmlFor="scoring" className="text-[13px] text-navy flex-1">
              <span className="font-semibold">Habilitar pontuação automática</span>
              <span className="block text-[11px] text-navy/50 mt-0.5">
                Permite definir pesos e critérios eliminatórios para cada campo.
              </span>
            </label>
          </div>

          {scoringEnabled && (
            <div>
              <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
                Pontuação mínima para aprovação *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={pontuacaoMinima}
                onChange={(e) => setPontuacaoMinima(Number(e.target.value))}
                className="w-32 px-3 py-2 border border-border bg-muted/50 text-[13px] rounded"
              />
              <span className="ml-2 text-[12px] text-navy/50">/ 100</span>
            </div>
          )}

          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Liga {tipo === "processo_seletivo" ? "*" : "(opcional)"}
            </label>
            {role === "diretor" ? (
              carregandoLiga ? (
                <p className="text-[13px] text-foreground/40">Carregando...</p>
              ) : (
                <div className="border border-border px-3 py-2 bg-muted/50 rounded">
                  <p className="text-[13px] text-foreground font-medium">
                    {ligaFixa?.nome ?? "Sua liga"}
                  </p>
                </div>
              )
            ) : (
              <Select value={ligaId} onValueChange={setLigaId}>
                <SelectTrigger className="border-border bg-muted/50">
                  <SelectValue
                    placeholder={tipo === "processo_seletivo" ? "Selecione a liga" : "Sem liga"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {tipo !== "processo_seletivo" && <SelectItem value="">Sem liga</SelectItem>}
                  {ligas.map((liga) => (
                    <SelectItem key={liga.id} value={liga.id}>
                      {liga.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Nome do formulário *
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Processo Seletivo 2026.1"
              className="w-full px-3 py-2.5 border border-border bg-muted/50 text-[13px] rounded placeholder:text-foreground/20"
            />
          </div>

          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o formulário..."
              rows={3}
              className="w-full px-3 py-2.5 border border-border bg-muted/50 text-[13px] rounded placeholder:text-foreground/20 resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (!nome) {
                  toast.error("Nome é obrigatório.");
                  return;
                }
                if (tipo === "processo_seletivo" && !ligaId) {
                  toast.error("Processo Seletivo requer uma liga.");
                  return;
                }
                setEtapa(2);
              }}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors flex items-center gap-1.5"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2 — Campos */}
      {etapa === 2 && (
        <div className="space-y-5 max-w-2xl">
          {scoringEnabled && campos.some((c) => c.tipo !== "texto") && (
            <div
              className={`text-[12px] p-3 border ${
                somaPesos === 100
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              Soma dos pesos: {somaPesos}/100
              {somaPesos !== 100 && " — deve totalizar exatamente 100%"}
            </div>
          )}

          <div className="space-y-4">
            {campos.map((campo, index) => (
              <div key={index} className="border border-navy/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-navy/30 flex-shrink-0" />
                  <Badge className="text-[10px] bg-brand-gray text-navy px-2 py-0.5">
                    {CAMPO_LABELS[campo.tipo]}
                  </Badge>
                  <button
                    onClick={() => removerCampo(index)}
                    className="ml-auto text-navy/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  value={campo.titulo}
                  onChange={(e) => atualizarCampo(index, { titulo: e.target.value })}
                  placeholder="Digite a pergunta..."
                  className="w-full px-3 py-2.5 border border-border bg-muted/50 text-[13px] rounded"
                />

                {campo.tipo === "multipla_escolha" && (
                  <div className="space-y-2">
                    <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                      Opções
                    </label>
                    {(campo.opcoes ?? []).map((opcao, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        {scoringEnabled && (
                          <input
                            type="checkbox"
                            checked={(campo.opcoes_eliminatorias ?? []).includes(opcao)}
                            onChange={() => toggleOpcaoEliminatoria(index, opcao)}
                            className="accent-red-500"
                            title="Marcar como eliminatória"
                          />
                        )}
                        <input
                          value={opcao}
                          onChange={(e) => atualizarOpcao(index, oi, e.target.value)}
                          placeholder={`Opção ${oi + 1}`}
                          className="w-full px-3 py-2 border border-border bg-muted/50 text-[12px] rounded"
                        />
                      </div>
                    ))}
                    {scoringEnabled && (
                      <p className="text-[10px] text-navy/40">☑ marcado = opção eliminatória</p>
                    )}
                    <button
                      onClick={() => adicionarOpcao(index)}
                      className="text-[11px] text-navy/50 hover:text-navy transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar opção
                    </button>
                  </div>
                )}

                {scoringEnabled && campo.tipo === "nota_1_10" && (
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
                        Nota mínima
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={campo.nota_minima ?? 5}
                        onChange={(e) =>
                          atualizarCampo(index, { nota_minima: Number(e.target.value) })
                        }
                        className="w-20 px-3 py-2 border border-border bg-muted/50 text-[12px] rounded"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        checked={campo.eliminatoria}
                        onChange={(e) => atualizarCampo(index, { eliminatoria: e.target.checked })}
                        className="accent-red-500"
                      />
                      <label className="text-[11px] text-foreground/60">Eliminatória</label>
                    </div>
                  </div>
                )}

                {scoringEnabled && campo.tipo === "sim_nao" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={campo.eliminatoria}
                      onChange={(e) => atualizarCampo(index, { eliminatoria: e.target.checked })}
                      className="accent-red-500"
                    />
                    <label className="text-[11px] text-foreground/60">
                      {`Eliminatória se responder "Não"`}
                    </label>
                  </div>
                )}

                {scoringEnabled && campo.tipo !== "texto" && (
                  <div>
                    <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
                      Peso na pontuação: {campo.peso}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={campo.peso}
                      onChange={(e) => atualizarCampo(index, { peso: Number(e.target.value) })}
                      className="w-full accent-navy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border border-dashed border-navy/20 p-4">
            <p className="text-[11px] text-navy/50 mb-3 font-medium">Adicionar campo</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CAMPO_LABELS) as [CampoTipo, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => adicionarCampo(t)}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/60 border border-foreground/30 px-3 py-1.5 rounded-full hover:text-foreground hover:border-foreground/50 transition-colors"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa(1)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <button
              onClick={() => {
                if (campos.length === 0) {
                  toast.error("Adicione pelo menos um campo.");
                  return;
                }
                setEtapa(3);
              }}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors flex items-center gap-1.5"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3 — Revisão */}
      {etapa === 3 && (
        <div className="space-y-6 max-w-2xl">
          <div className="border border-navy/15 p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-navy">Informações</h3>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <span className="text-navy/50">Tipo:</span>{" "}
                <span className="text-navy font-medium">{TIPO_LABELS[tipo]}</span>
              </div>
              <div>
                <span className="text-navy/50">Scoring:</span>{" "}
                <span className="text-navy font-medium">{scoringEnabled ? "Sim" : "Não"}</span>
              </div>
              <div>
                <span className="text-navy/50">Nome:</span>{" "}
                <span className="text-navy font-medium">{nome}</span>
              </div>
              {scoringEnabled && (
                <div>
                  <span className="text-navy/50">Mínima:</span>{" "}
                  <span className="text-navy font-medium">{pontuacaoMinima}/100</span>
                </div>
              )}
              {descricao && (
                <div className="col-span-2">
                  <span className="text-navy/50">Descrição:</span>{" "}
                  <span className="text-navy">{descricao}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border border-navy/15 p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-navy">
              Campos ({campos.length})
            </h3>
            <div className="space-y-2">
              {campos.map((c, i) => (
                <div key={i} className="flex items-start gap-3 text-[13px]">
                  <span className="text-navy/40 w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="text-navy">{c.titulo || "(sem título)"}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="text-[10px] bg-brand-gray text-navy px-1.5 py-0">
                        {CAMPO_LABELS[c.tipo]}
                      </Badge>
                      {scoringEnabled && c.peso > 0 && (
                        <span className="text-[10px] text-navy/40">{c.peso}%</span>
                      )}
                      {scoringEnabled && c.eliminatoria && (
                        <span className="text-[10px] text-red-500">eliminatória</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa(2)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => criarFormulario(false)}
                disabled={salvando}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground transition-colors disabled:opacity-40"
              >
                {salvando ? "Criando..." : "Salvar como rascunho"}
              </button>
              <button
                onClick={() => criarFormulario(true)}
                disabled={salvando}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors disabled:opacity-40"
              >
                {salvando ? "Criando..." : "Criar e publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

> **Nota:** `PerguntaTipo` (nome antigo) foi removido na Task 2. Se algum outro arquivo no projeto ainda importar `PerguntaTipo`, o typecheck na Task 14 vai pegar e você atualiza para `CampoTipo`.

- [ ] **Step 10.2: Typecheck**

```bash
npm run typecheck --workspace=apps/web 2>&1 | tail -20
```

Expected: alguns erros nas outras páginas (corrigimos nas Tasks 11 e 12). Zero erros no `NovoFormularioPage.tsx`.

- [ ] **Step 10.3: Commit**

```bash
git add apps/web/src/pages/formularios/NovoFormularioPage.tsx
git commit -m "feat(web): wizard de formulário reduzido a 3 etapas com tipo e scoring opcional"
```

---

## Task 11: Detalhe — `FormularioDetalhePage.tsx` com abas

**Files:**

- Create: `apps/web/src/pages/formularios/components/TallyPreview.tsx`
- Modify: `apps/web/src/pages/formularios/FormularioDetalhePage.tsx`

- [ ] **Step 11.1: Criar componente `TallyPreview`**

```bash
mkdir -p apps/web/src/pages/formularios/components
```

Crie `apps/web/src/pages/formularios/components/TallyPreview.tsx`:

```tsx
import { ExternalLink } from "lucide-react";

interface Props {
  tallyFormId: string;
}

export function TallyPreview({ tallyFormId }: Props) {
  const src = `https://tally.so/embed/${tallyFormId}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1`;
  const editUrl = `https://tally.so/forms/${tallyFormId}/edit`;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy/40 px-3 py-1.5 rounded-full hover:bg-navy hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Editar no Tally
        </a>
      </div>
      <iframe
        src={src}
        title="Tally form preview"
        width="100%"
        height="700"
        className="border border-navy/10 rounded"
      />
    </div>
  );
}
```

- [ ] **Step 11.2: Substituir `FormularioDetalhePage.tsx`**

Substitua `apps/web/src/pages/formularios/FormularioDetalhePage.tsx` por:

```tsx
import { ArrowLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import { TallyPreview } from "./components/TallyPreview";

import type { KpiItem } from "@/pages/home/v1/primitives";
import type {
  FormularioComCampos,
  FormularioResposta,
  FormularioStatus,
  ResultadosFormulario,
  RespostaStatus,
  TallyAnswer,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_RESP_LABELS: Record<RespostaStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};
const STATUS_RESP_BADGE: Record<RespostaStatus, string> = {
  pendente: "bg-amber-100 text-amber-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-600",
};
const STATUS_FORM_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};
const STATUS_FORM_BADGE: Record<FormularioStatus, string> = {
  rascunho: "bg-brand-yellow/20 text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-navy/10 text-navy/60",
};

type FiltroStatus = RespostaStatus | "todos";

function renderAnswer(answer: TallyAnswer | undefined): string {
  if (!answer) return "—";
  const v = answer.value;
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(String).join(", ");
  return JSON.stringify(v);
}

export function FormularioDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState<FormularioComCampos | null>(null);
  const [resultados, setResultados] = useState<ResultadosFormulario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [respostaAberta, setRespostaAberta] = useState<FormularioResposta | null>(null);

  useEffect(() => {
    if (id) void carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const token = await getToken();
      const [resForm, resRes] = await Promise.all([
        fetch(`/api/formularios/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/formularios/${id}/resultados`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!resForm.ok) throw new Error();
      setFormulario(await resForm.json());
      if (resRes.ok) setResultados(await resRes.json());
    } catch {
      toast.error("Erro ao carregar formulário");
    } finally {
      setCarregando(false);
    }
  }

  async function sincronizar() {
    if (!id) return;
    try {
      setSincronizando(true);
      const token = await getToken();
      const res = await fetch(`/api/formularios/${id}/sincronizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const dados = (await res.json()) as { sincronizados: number };
      toast.success(`${dados.sincronizados} nova(s) resposta(s) sincronizada(s).`);
      await carregarDados();
    } catch {
      toast.error("Erro ao sincronizar respostas");
    } finally {
      setSincronizando(false);
    }
  }

  async function encerrar() {
    if (!id) return;
    try {
      setEncerrando(true);
      const token = await getToken();
      const res = await fetch(`/api/formularios/${id}/encerrar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Formulário encerrado.");
      await carregarDados();
    } catch {
      toast.error("Erro ao encerrar formulário");
    } finally {
      setEncerrando(false);
    }
  }

  function exportarCSV() {
    if (!resultados || !formulario) return;
    const headerCols = formulario.scoring_enabled
      ? ["Nome", "Email", "Pontuação", "Status", "Submissão", "Motivo"]
      : ["Nome", "Email", "Submissão"];
    const linhas = [
      headerCols,
      ...resultados.respostas.map((r) =>
        formulario.scoring_enabled
          ? [
              r.nome,
              r.email,
              String(r.pontuacao_total ?? ""),
              STATUS_RESP_LABELS[r.status],
              new Date(r.submitted_at).toLocaleString("pt-BR"),
              r.motivo_reprovacao ?? "",
            ]
          : [r.nome, r.email, new Date(r.submitted_at).toLocaleString("pt-BR")],
      ),
    ];
    const csv = linhas.map((l) => l.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respostas-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/40 text-[13px]">
        Carregando...
      </div>
    );
  }
  if (!formulario) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/40 text-[13px]">
        Formulário não encontrado.
      </div>
    );
  }

  const respostasFiltradas =
    resultados?.respostas.filter((r) => filtroStatus === "todos" || r.status === filtroStatus) ??
    [];

  const scoring = formulario.scoring_enabled;
  const kpis: KpiItem[] = scoring
    ? [
        { label: "Total", valor: String(resultados?.total ?? 0) },
        { label: "Aprovados", valor: String(resultados?.aprovados ?? 0) },
        { label: "Reprovados", valor: String(resultados?.reprovados ?? 0) },
        { label: "Pendentes", valor: String(resultados?.pendentes ?? 0) },
      ]
    : [{ label: "Total de respostas", valor: String(resultados?.total ?? 0) }];

  const total = resultados?.total ?? 0;
  const pctAprovados = scoring && total > 0 ? Math.round((resultados!.aprovados / total) * 100) : 0;
  const pctReprovados =
    scoring && total > 0 ? Math.round((resultados!.reprovados / total) * 100) : 0;
  const pctPendentes = scoring && total > 0 ? 100 - pctAprovados - pctReprovados : 0;

  const filtrosStatus: { valor: FiltroStatus; label: string }[] = scoring
    ? [
        { valor: "todos", label: "Todos" },
        { valor: "aprovado", label: "Aprovados" },
        { valor: "pendente", label: "Pendentes" },
        { valor: "reprovado", label: "Reprovados" },
      ]
    : [{ valor: "todos", label: "Todos" }];

  const formularioComLiga = formulario as FormularioComCampos & { liga_nome?: string };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <button
        onClick={() => navigate("/formularios")}
        className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Formulários
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
              {formulario.nome}
            </h1>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_FORM_BADGE[formulario.status]}`}
            >
              {STATUS_FORM_LABELS[formulario.status]}
            </span>
          </div>
          {formularioComLiga.liga_nome && (
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40">
              {formularioComLiga.liga_nome}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {formulario.tally_form_url && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-navy/20 text-navy gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(formulario.tally_form_url ?? "");
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar link
              </Button>
              <a href={formulario.tally_form_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="border-navy/20 text-navy gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir form
                </Button>
              </a>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={sincronizar}
            disabled={sincronizando}
            className="border-navy/20 text-navy gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? "animate-spin" : ""}`} />
            {sincronizando ? "Sincronizando..." : "Sincronizar"}
          </Button>
          {formulario.status === "aberto" && (
            <Button
              variant="outline"
              size="sm"
              onClick={encerrar}
              disabled={encerrando}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              {encerrando ? "Encerrando..." : "Encerrar"}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="respostas">
        <TabsList>
          <TabsTrigger value="respostas">Respostas</TabsTrigger>
          {formulario.tally_form_id && <TabsTrigger value="preview">Preview</TabsTrigger>}
        </TabsList>

        <TabsContent value="respostas" className="mt-6">
          <section>
            <SectionHeader
              titulo={scoring ? "Visão Geral" : "Resumo"}
              tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
            />

            {scoring && resultados && resultados.total > 0 && (
              <div className="mb-6">
                <div className="flex h-2 rounded-full overflow-hidden bg-navy/10 mb-3">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${pctAprovados}%` }}
                  />
                  <div
                    className="bg-red-400 transition-all"
                    style={{ width: `${pctReprovados}%` }}
                  />
                  <div
                    className="bg-amber-400 transition-all"
                    style={{ width: `${pctPendentes}%` }}
                  />
                </div>
                <div className="flex gap-6 text-[11px] text-navy/60">
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" />
                    Aprovados ({resultados.aprovados})
                  </span>
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1.5 align-middle" />
                    Reprovados ({resultados.reprovados})
                  </span>
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
                    Pendentes ({resultados.pendentes})
                  </span>
                </div>
              </div>
            )}

            <KpiRow items={kpis} cols={kpis.length} />
          </section>

          <section className="mt-12">
            <SectionHeader
              titulo="Respostas"
              tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
              acao={
                resultados && resultados.total > 0 ? (
                  <button
                    onClick={exportarCSV}
                    className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground hover:text-background transition-colors"
                  >
                    Exportar CSV
                  </button>
                ) : null
              }
            />

            {scoring && (
              <div className="flex gap-2 mb-5">
                {filtrosStatus.map(({ valor, label }) => (
                  <button
                    key={valor}
                    onClick={() => setFiltroStatus(valor)}
                    className={
                      filtroStatus === valor
                        ? "bg-navy text-white px-3 py-1 rounded-full text-[11px] font-semibold"
                        : "border border-navy/20 text-navy/60 px-3 py-1 rounded-full text-[11px] font-semibold hover:border-navy/40"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {respostasFiltradas.length === 0 ? (
              <div className="border border-dashed border-navy/20 rounded-lg py-16 text-center">
                <p className="text-[13px] text-navy/40">
                  {resultados?.total === 0
                    ? "Nenhuma resposta ainda. Clique em Sincronizar para buscar."
                    : "Nenhuma resposta neste filtro."}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-foreground/[0.08]">
                    {(scoring
                      ? ["Nome", "Email", "Pontuação", "Status", "Data"]
                      : ["Nome", "Email", "Data"]
                    ).map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40 font-normal"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {respostasFiltradas.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setRespostaAberta(r)}
                      className="border-b border-foreground/[0.06] hover:bg-navy/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                        {r.nome || "—"}
                      </td>
                      <td className="py-3 px-4 font-plex-sans text-[13px] text-navy/60">
                        {r.email || "—"}
                      </td>
                      {scoring && (
                        <>
                          <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                            {r.pontuacao_total ?? "—"}/100
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_RESP_BADGE[r.status]}`}
                            >
                              {STATUS_RESP_LABELS[r.status]}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 font-plex-mono text-[11px] text-navy/40">
                        {new Date(r.submitted_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </TabsContent>

        {formulario.tally_form_id && (
          <TabsContent value="preview" className="mt-6">
            <TallyPreview tallyFormId={formulario.tally_form_id} />
          </TabsContent>
        )}
      </Tabs>

      <Sheet open={!!respostaAberta} onOpenChange={(open) => !open && setRespostaAberta(null)}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle className="font-display font-bold text-[16px] text-navy">
              {respostaAberta?.nome || "Resposta"}
            </SheetTitle>
          </SheetHeader>
          {respostaAberta && (
            <div className="mt-4 space-y-4 overflow-y-auto">
              {scoring && (
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_RESP_BADGE[respostaAberta.status]}`}
                  >
                    {STATUS_RESP_LABELS[respostaAberta.status]}
                  </span>
                  <span className="font-plex-sans text-[13px] text-navy font-semibold">
                    {respostaAberta.pontuacao_total ?? "—"}/100
                  </span>
                </div>
              )}
              <p className="font-plex-sans text-[12px] text-navy/50">{respostaAberta.email}</p>
              {scoring && respostaAberta.motivo_reprovacao && (
                <div className="bg-red-50 border border-red-100 p-3 text-[12px] text-red-600 rounded">
                  {respostaAberta.motivo_reprovacao}
                </div>
              )}
              <div className="space-y-3 mt-4">
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40">
                  Respostas
                </p>
                {formulario.campos.map((campo, i) => {
                  const answer = campo.tally_question_id
                    ? respostaAberta.respostas[campo.tally_question_id]
                    : undefined;
                  return (
                    <div key={i} className="border-b border-navy/[0.08] pb-3">
                      <p className="font-plex-mono text-[10px] uppercase tracking-[0.1em] text-navy/40 mb-0.5">
                        {campo.titulo}
                      </p>
                      <p className="font-plex-sans text-[13px] text-navy">{renderAnswer(answer)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 11.3: Typecheck**

```bash
npm run typecheck --workspace=apps/web 2>&1 | tail -20
```

Expected: zero erros em `FormularioDetalhePage.tsx` e `TallyPreview.tsx`.

- [ ] **Step 11.4: Commit**

```bash
git add apps/web/src/pages/formularios/FormularioDetalhePage.tsx apps/web/src/pages/formularios/components/TallyPreview.tsx
git commit -m "feat(web): detalhe de formulário com abas Respostas/Preview e parser Tally"
```

---

## Task 12: Listagem — `FormulariosPage.tsx` com filtro de tipo

**Files:**

- Modify: `apps/web/src/pages/formularios/FormulariosPage.tsx`

- [ ] **Step 12.1: Ler o arquivo atual completo para preservar estrutura**

```bash
wc -l apps/web/src/pages/formularios/FormulariosPage.tsx
```

- [ ] **Step 12.2: Substituir o arquivo**

Substitua `apps/web/src/pages/formularios/FormulariosPage.tsx` por:

```tsx
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import type { KpiItem } from "@/pages/home/v1/primitives";
import type { Formulario, FormularioStatus, FormularioTipo } from "@link-leagues/types";

const STATUS_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};
const STATUS_BADGE: Record<FormularioStatus, string> = {
  rascunho: "bg-brand-yellow/20 text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-navy/10 text-navy/60",
};
const TIPO_LABELS: Record<FormularioTipo, string> = {
  generico: "Genérico",
  processo_seletivo: "Processo Seletivo",
  pesquisa: "Pesquisa",
  inscricao: "Inscrição",
  feedback: "Feedback",
};

type FiltroStatus = FormularioStatus | "todos";
type FiltroTipo = FormularioTipo | "todos";

interface FormularioComLiga extends Formulario {
  liga_nome: string | null;
}

export function FormulariosPage() {
  const navigate = useNavigate();
  const { data, carregando } = useCachedFetch<FormularioComLiga[]>("/api/formularios");
  const formularios = data ?? [];
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  const filtrados = useMemo(
    () =>
      formularios.filter(
        (f) =>
          (filtroStatus === "todos" || f.status === filtroStatus) &&
          (filtroTipo === "todos" || f.tipo === filtroTipo),
      ),
    [formularios, filtroStatus, filtroTipo],
  );

  const kpis: KpiItem[] = [
    { label: "Total", valor: String(formularios.length) },
    {
      label: "Abertos",
      valor: String(formularios.filter((f) => f.status === "aberto").length),
    },
    {
      label: "Encerrados",
      valor: String(formularios.filter((f) => f.status === "encerrado").length),
    },
    {
      label: "Rascunhos",
      valor: String(formularios.filter((f) => f.status === "rascunho").length),
    },
  ];

  const filtrosStatus: { valor: FiltroStatus; label: string }[] = [
    { valor: "todos", label: "Todos" },
    { valor: "aberto", label: "Abertos" },
    { valor: "encerrado", label: "Encerrados" },
    { valor: "rascunho", label: "Rascunhos" },
  ];

  const filtrosTipo: { valor: FiltroTipo; label: string }[] = [
    { valor: "todos", label: "Todos os tipos" },
    { valor: "processo_seletivo", label: "Processo Seletivo" },
    { valor: "pesquisa", label: "Pesquisa" },
    { valor: "inscricao", label: "Inscrição" },
    { valor: "feedback", label: "Feedback" },
    { valor: "generico", label: "Genérico" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mb-1">
            Formulários
          </p>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Formulários
          </h1>
        </div>
        <Button
          onClick={() => navigate("/formularios/novo")}
          className="bg-navy text-white hover:bg-navy/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Formulário
        </Button>
      </div>

      <div className="mb-10">
        <KpiRow items={kpis} cols={4} />
      </div>

      <div className="space-y-12">
        <section>
          <SectionHeader
            titulo="Todos os Formulários"
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
          />

          <div className="flex flex-wrap gap-2 mb-3">
            {filtrosStatus.map(({ valor, label }) => (
              <button
                key={valor}
                onClick={() => setFiltroStatus(valor)}
                className={
                  filtroStatus === valor
                    ? "bg-navy text-white px-3 py-1 rounded-full text-[11px] font-semibold"
                    : "border border-navy/20 text-navy/60 px-3 py-1 rounded-full text-[11px] font-semibold hover:border-navy/40"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {filtrosTipo.map(({ valor, label }) => (
              <button
                key={valor}
                onClick={() => setFiltroTipo(valor)}
                className={
                  filtroTipo === valor
                    ? "bg-link-blue text-white px-3 py-1 rounded-full text-[11px] font-semibold"
                    : "border border-link-blue/20 text-link-blue/70 px-3 py-1 rounded-full text-[11px] font-semibold hover:border-link-blue/40"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {carregando ? (
            <p className="text-[13px] text-navy/40 py-10 text-center">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <div className="border border-dashed border-navy/20 rounded-lg py-16 text-center">
              <p className="text-[13px] text-navy/40">
                {formularios.length === 0
                  ? "Nenhum formulário ainda."
                  : "Nenhum formulário neste filtro."}
              </p>
              {formularios.length === 0 && (
                <Button
                  onClick={() => navigate("/formularios/novo")}
                  className="mt-4 bg-navy text-white hover:bg-navy/90"
                >
                  Criar primeiro formulário
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  {["Nome", "Tipo", "Liga", "Status", "Criado em"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40 font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => navigate(`/formularios/${f.id}`)}
                    className="border-b border-foreground/[0.06] hover:bg-navy/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                      {f.nome}
                    </td>
                    <td className="py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.1em] text-navy/60">
                      {TIPO_LABELS[f.tipo]}
                    </td>
                    <td className="py-3 px-4 font-plex-sans text-[13px] text-navy/60">
                      {f.liga_nome ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[f.status]}`}
                      >
                        {STATUS_LABELS[f.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-plex-mono text-[11px] text-navy/40">
                      {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 12.3: Typecheck**

```bash
npm run typecheck 2>&1 | tail -30
```

Expected: zero erros em todo o projeto.

- [ ] **Step 12.4: Commit**

```bash
git add apps/web/src/pages/formularios/FormulariosPage.tsx
git commit -m "feat(web): listagem de formulários com filtros por status e tipo"
```

---

## Task 13: Verificação Final — Build + Lint + Smoke Test E2E

**Files:** —

- [ ] **Step 13.1: Build completo**

```bash
npm run build 2>&1 | tail -30
```

Expected: build OK em `apps/api` e `apps/web`.

- [ ] **Step 13.2: Lint**

```bash
npm run lint 2>&1 | tail -30
```

Expected: zero erros. Warnings de import legado em `PerguntaTipo as _Legacy` esperados — se aparecerem, remova o alias do import do `NovoFormularioPage.tsx`.

- [ ] **Step 13.3: Todos os testes**

```bash
npm test 2>&1 | tail -40
```

Expected: testes do scoring (9) + tally service (9) + webhook (4) passam.

- [ ] **Step 13.4: Smoke test manual E2E**

Pré-requisitos:

- Conta no Tally com API key válida em `TALLY_API_KEY`
- ngrok/cloudflared rodando expondo `localhost:3001` (a URL pública vai em `PUBLIC_API_BASE_URL`)
- `TALLY_WEBHOOK_SIGNING_SECRET` configurado

```bash
# Terminal 1: api
npm run dev:api

# Terminal 2: web
npm run dev:web

# Terminal 3: tunnel
ngrok http 3001  # copia URL pra PUBLIC_API_BASE_URL e reinicia api
```

Checklist manual:

1. Login como diretor de liga.
2. `/formularios/novo`:
   - Etapa 1: escolhe tipo "Processo Seletivo", marca scoring (deve marcar automaticamente), pontuação 70.
   - Etapa 2: adiciona 3 campos (texto "Nome completo", nota 1-10 "Disponibilidade", sim/não "Aceita termos"). Pesos 0/50/50.
   - Etapa 3: revisa, clica "Criar e publicar".
3. Confirma tela de sucesso com link Tally clicável.
4. Abre o link em outra aba: form Tally renderiza com o título + 3 campos. Submete uma resposta.
5. Em ~5s, no Link Hub `/formularios/:id`:
   - Aba Respostas: aparece 1 resposta. Nome preenchido. Score calculado. Status conforme regra.
   - Clica linha → Sheet abre com respostas formatadas.
   - Aba Preview: iframe carrega o form Tally.
6. Clica "Sincronizar": toast diz "0 novas" (já estava via webhook).
7. Clica "Encerrar":
   - Form em Tally mostra "Formulário encerrado." se acessar URL pública.
   - Webhook em Tally fica `isEnabled=false` (confirmar via dashboard Tally).
   - No Link Hub status muda para "Encerrado".

- [ ] **Step 13.5: Commit final (se algo precisou de ajuste durante o smoke)**

Se durante o smoke você fez algum ajuste:

```bash
git add -A
git commit -m "fix: ajustes pós-smoke test e2e"
```

Se tudo passou sem ajustes, pule este step.

---

## Task 14: Cleanup — Arquivos e Imports Legados

**Files:**

- Verify imports of removed symbols

- [ ] **Step 14.1: Verificar referências ao tipo `PerguntaTipo` antigo**

```bash
grep -rn "PerguntaTipo\b" apps packages --include="*.ts" --include="*.tsx" | grep -v ".test."
```

Se aparecer apenas o alias `_Legacy` no `NovoFormularioPage.tsx`, remova essa linha do import.

- [ ] **Step 14.2: Verificar referências a `processo_id`, `processo_seletivo` em SQL/código não-migration**

```bash
grep -rn "processo_id\|processos_seletivos\|processo_perguntas\|processo_candidatos" apps packages --include="*.ts" --include="*.tsx"
```

Expected: zero hits. Se aparecer, ajustar para os nomes novos.

- [ ] **Step 14.3: Verificar referências a `google_form`, `google_item`, `google_response`**

```bash
grep -rn "google_form\|google_item\|google_response" apps packages --include="*.ts" --include="*.tsx"
```

Expected: zero hits.

- [ ] **Step 14.4: Verificar imports de `TemaFormulario`**

```bash
grep -rn "TemaFormulario\|ColorField\|ImageUrlField\|TypeformMockup" apps packages --include="*.ts" --include="*.tsx"
```

Expected: zero hits (já foi removido no `NovoFormularioPage.tsx` da Task 10).

- [ ] **Step 14.5: Commit de cleanup (se houve mudança)**

```bash
git status
# se houver mudanças:
git add -A
git commit -m "chore: remove referências legadas a Google Forms / Processo Seletivo"
```

---

## Resumo de comandos para validação contínua

Durante a execução, use estes comandos com frequência:

```bash
# Typecheck completo
npm run typecheck

# Testes (workspace específico)
npm test --workspace=packages/utils
npm test --workspace=apps/api

# Build
npm run build

# Lint
npm run lint
```
