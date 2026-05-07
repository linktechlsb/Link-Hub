# Processo Seletivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que diretores criem processos seletivos com formulários Typeform, definam critérios de scoring e visualizem resultados dos candidatos.

**Architecture:** Diretores criam o processo na nossa UI → nossa API chama Typeform Create API e salva o link → candidatos preenchem externamente → diretores sincronizam respostas via botão → backend aplica scoring automático → frontend exibe tabela de candidatos com status.

**Tech Stack:** Express + postgres (sql tagged template), Typeform REST API v3, React + shadcn/ui, TypeScript, Supabase (DB via DATABASE_URL direto)

---

## File Map

**Criar:**

- `packages/types/src/processo-seletivo.ts` — interfaces TypeScript
- `apps/api/src/services/typeform.ts` — cliente Typeform (criar form, buscar respostas)
- `apps/api/src/routes/processo-seletivo.ts` — rotas Express
- `apps/web/src/pages/processo-seletivo/NovoProcessoPage.tsx` — wizard 3 etapas
- `apps/web/src/pages/processo-seletivo/ProcessoDetalhePage.tsx` — resultados

**Modificar:**

- `packages/types/src/index.ts` — exportar novo módulo
- `apps/api/src/config/env.ts` — adicionar TYPEFORM_API_KEY ao schema
- `apps/api/src/routes/index.ts` — montar processoSeletivoRouter
- `apps/web/src/router/index.tsx` — adicionar sub-rotas `/processo-seletivo/novo` e `/processo-seletivo/:id`
- `apps/web/src/pages/processo-seletivo/ProcessoSeletivoPage.tsx` — substituir placeholder por lista real

**Variáveis de ambiente:**

- `apps/api/.env` — adicionar `TYPEFORM_API_KEY`
- `apps/api/.env.example` — documentar `TYPEFORM_API_KEY`

---

## Task 1: Tipos TypeScript

**Files:**

- Create: `packages/types/src/processo-seletivo.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Criar arquivo de tipos**

Criar `packages/types/src/processo-seletivo.ts`:

```typescript
export type ProcessoStatus = "rascunho" | "aberto" | "encerrado";
export type PerguntaTipo = "texto" | "multipla_escolha" | "nota_1_10" | "sim_nao";
export type CandidatoStatus = "pendente" | "aprovado" | "reprovado";

export interface ProcessoSeletivo {
  id: string;
  liga_id: string;
  nome: string;
  descricao?: string;
  status: ProcessoStatus;
  typeform_form_id?: string;
  typeform_form_url?: string;
  pontuacao_minima_aprovacao: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessoPergunta {
  id: string;
  processo_id: string;
  typeform_field_id?: string;
  titulo: string;
  tipo: PerguntaTipo;
  peso: number;
  eliminatoria: boolean;
  nota_minima?: number;
  opcoes_eliminatorias?: string[];
  opcoes?: string[];
  ordem: number;
}

export interface ProcessoCandidato {
  id: string;
  processo_id: string;
  typeform_response_id: string;
  nome: string;
  email: string;
  pontuacao_total: number;
  status: CandidatoStatus;
  respostas: Record<string, unknown>;
  motivo_reprovacao?: string;
  submitted_at: string;
  sincronizado_at: string;
}

export interface CreatePerguntaInput {
  titulo: string;
  tipo: PerguntaTipo;
  peso: number;
  eliminatoria: boolean;
  nota_minima?: number;
  opcoes_eliminatorias?: string[];
  opcoes?: string[];
  ordem: number;
}

export interface CreateProcessoInput {
  liga_id: string;
  nome: string;
  descricao?: string;
  pontuacao_minima_aprovacao: number;
  perguntas: CreatePerguntaInput[];
}

export interface ProcessoSeletivoComPerguntas extends ProcessoSeletivo {
  perguntas: ProcessoPergunta[];
}

export interface ResultadosProcesso {
  total: number;
  aprovados: number;
  reprovados: number;
  pendentes: number;
  candidatos: ProcessoCandidato[];
}
```

- [ ] **Step 2: Exportar do index**

Editar `packages/types/src/index.ts`, adicionar no final:

```typescript
export * from "./processo-seletivo.js";
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/processo-seletivo.ts packages/types/src/index.ts
git commit -m "feat: add processo-seletivo types"
```

---

## Task 2: Migração do Banco de Dados

Executar as queries abaixo diretamente no Supabase SQL Editor (Dashboard → SQL Editor).

- [ ] **Step 1: Criar tabela `processos_seletivos`**

```sql
CREATE TABLE processos_seletivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aberto', 'encerrado')),
  typeform_form_id TEXT,
  typeform_form_url TEXT,
  pontuacao_minima_aprovacao INTEGER NOT NULL DEFAULT 70 CHECK (pontuacao_minima_aprovacao BETWEEN 0 AND 100),
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Criar tabela `processo_perguntas`**

```sql
CREATE TABLE processo_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  typeform_field_id TEXT,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'multipla_escolha', 'nota_1_10', 'sim_nao')),
  peso INTEGER NOT NULL DEFAULT 0 CHECK (peso BETWEEN 0 AND 100),
  eliminatoria BOOLEAN NOT NULL DEFAULT FALSE,
  nota_minima INTEGER CHECK (nota_minima BETWEEN 1 AND 10),
  opcoes_eliminatorias JSONB,
  opcoes JSONB,
  ordem INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 3: Criar tabela `processo_candidatos`**

```sql
CREATE TABLE processo_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  typeform_response_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  pontuacao_total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reprovado')),
  respostas JSONB NOT NULL DEFAULT '{}',
  motivo_reprovacao TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sincronizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(processo_id, typeform_response_id)
);
```

- [ ] **Step 4: Verificar no Supabase**

No SQL Editor, executar:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('processos_seletivos', 'processo_perguntas', 'processo_candidatos');
```

Esperado: 3 linhas retornadas.

---

## Task 3: Configuração de Ambiente

**Files:**

- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/.env`

- [ ] **Step 1: Adicionar TYPEFORM_API_KEY ao schema de env**

Editar `apps/api/src/config/env.ts`, adicionar dentro do `EnvSchema`:

```typescript
TYPEFORM_API_KEY: z.string().min(1),
```

O objeto final deve incluir esse campo. Exemplo de onde inserir (após `CORS_ORIGIN`):

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  TYPEFORM_API_KEY: z.string().min(1), // ← adicionar aqui
  RATE_LIMIT_DISABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  APP_URL: z.string().url().default("http://localhost:3000"),
});
```

- [ ] **Step 2: Adicionar ao .env.example**

Abrir `apps/api/.env.example` e adicionar a linha:

```
TYPEFORM_API_KEY=tfp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- [ ] **Step 3: Adicionar valor real ao .env**

Abrir `apps/api/.env` e adicionar a chave real obtida em https://admin.typeform.com/account#/section/tokens:

```
TYPEFORM_API_KEY=tfp_SUA_CHAVE_AQUI
```

- [ ] **Step 4: Verificar typecheck da API**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/.env.example
git commit -m "feat: add TYPEFORM_API_KEY to env config"
```

---

## Task 4: Serviço Typeform

**Files:**

- Create: `apps/api/src/services/typeform.ts`

- [ ] **Step 1: Criar o serviço Typeform**

Criar `apps/api/src/services/typeform.ts`:

```typescript
import { env } from "../config/env.js";
import type { CreatePerguntaInput } from "@link-leagues/types";

const TYPEFORM_BASE_URL = "https://api.typeform.com";

interface TypeformField {
  ref: string;
  type: string;
  title: string;
  properties?: {
    choices?: Array<{ label: string }>;
    steps?: number;
    start_at_one?: boolean;
  };
  validations?: {
    required?: boolean;
  };
}

interface TypeformCreateResponse {
  id: string;
  _links: {
    display: string;
  };
}

interface TypeformAnswer {
  field: { ref: string; type: string };
  type: string;
  text?: string;
  number?: number;
  choice?: { label: string };
  boolean?: boolean;
}

interface TypeformResponse {
  response_id: string;
  submitted_at: string;
  answers: TypeformAnswer[];
  variables?: Array<{ key: string; type: string; text?: string; number?: number }>;
}

interface TypeformResponsesResult {
  items: TypeformResponse[];
  total_items: number;
}

function mapPerguntaToField(pergunta: CreatePerguntaInput): TypeformField {
  const ref = `pergunta_${pergunta.ordem}`;

  switch (pergunta.tipo) {
    case "texto":
      return {
        ref,
        type: "long_text",
        title: pergunta.titulo,
        validations: { required: false },
      };

    case "multipla_escolha":
      return {
        ref,
        type: "multiple_choice",
        title: pergunta.titulo,
        properties: {
          choices: (pergunta.opcoes ?? []).map((label) => ({ label })),
        },
        validations: { required: true },
      };

    case "nota_1_10":
      return {
        ref,
        type: "opinion_scale",
        title: pergunta.titulo,
        properties: {
          steps: 10,
          start_at_one: true,
        },
        validations: { required: true },
      };

    case "sim_nao":
      return {
        ref,
        type: "yes_no",
        title: pergunta.titulo,
        validations: { required: true },
      };
  }
}

export async function criarFormTypeform(
  nome: string,
  perguntas: CreatePerguntaInput[],
): Promise<{ formId: string; formUrl: string }> {
  const fields = perguntas.sort((a, b) => a.ordem - b.ordem).map(mapPerguntaToField);

  const body = {
    title: nome,
    fields,
    settings: {
      language: "pt-br",
      is_public: true,
      progress_bar: "proportion",
      show_progress_bar: true,
    },
    welcome_screens: [
      {
        title: `Bem-vindo(a) ao processo seletivo: ${nome}`,
        properties: {
          show_button: true,
          button_text: "Começar",
        },
      },
    ],
    thankyou_screens: [
      {
        title: "Obrigado pela sua inscrição!",
        properties: {
          show_button: false,
        },
      },
    ],
  };

  const res = await fetch(`${TYPEFORM_BASE_URL}/forms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TYPEFORM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Erro ao criar formulário no Typeform: ${error}`);
  }

  const data = (await res.json()) as TypeformCreateResponse;
  return {
    formId: data.id,
    formUrl: data._links.display,
  };
}

export async function buscarRespostasTypeform(formId: string): Promise<TypeformResponse[]> {
  const res = await fetch(`${TYPEFORM_BASE_URL}/forms/${formId}/responses?page_size=1000`, {
    headers: {
      Authorization: `Bearer ${env.TYPEFORM_API_KEY}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Erro ao buscar respostas do Typeform: ${error}`);
  }

  const data = (await res.json()) as TypeformResponsesResult;
  return data.items;
}

export function extrairNomeEmail(resposta: TypeformResponse): { nome: string; email: string } {
  const variables = resposta.variables ?? [];
  const answers = resposta.answers ?? [];

  const nomeVar = variables.find((v) => v.key === "nome");
  const emailVar = variables.find((v) => v.key === "email");

  const nomeAnswer = answers.find((a) => a.field.type === "short_text" && a.type === "text");
  const emailAnswer = answers.find((a) => a.field.type === "email" && a.type === "email");

  return {
    nome: (nomeVar?.text ?? (nomeAnswer as { text?: string })?.text ?? "Candidato") as string,
    email: (emailVar?.text ?? (emailAnswer as { text?: string })?.text ?? "") as string,
  };
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/typeform.ts
git commit -m "feat: add Typeform service for form creation and responses"
```

---

## Task 5: Rotas da API

**Files:**

- Create: `apps/api/src/routes/processo-seletivo.ts`
- Modify: `apps/api/src/routes/index.ts`

- [ ] **Step 1: Criar o arquivo de rotas**

Criar `apps/api/src/routes/processo-seletivo.ts`:

```typescript
import { Router, type Router as IRouter } from "express";

import { sql } from "../config/db.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { usuarioEhDiretorDaLiga } from "../middleware/authorization.js";
import { criarFormTypeform, buscarRespostasTypeform } from "../services/typeform.js";

import type { CreateProcessoInput, ProcessoPergunta, ProcessoCandidato } from "@link-leagues/types";

export const processoSeletivoRouter: IRouter = Router();

// GET /processo-seletivo — lista processos (filtrado por liga para diretores)
processoSeletivoRouter.get(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const liga_id = req.query["liga_id"] as string | undefined;

      let processos;

      if (user.role === "staff") {
        if (liga_id) {
          processos = await sql`
            SELECT ps.*, l.nome as liga_nome
            FROM processos_seletivos ps
            JOIN ligas l ON l.id = ps.liga_id
            WHERE ps.liga_id = ${liga_id}
            ORDER BY ps.created_at DESC
          `;
        } else {
          processos = await sql`
            SELECT ps.*, l.nome as liga_nome
            FROM processos_seletivos ps
            JOIN ligas l ON l.id = ps.liga_id
            ORDER BY ps.created_at DESC
          `;
        }
      } else {
        const [usuario] = await sql`
          SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1
        `;
        processos = await sql`
          SELECT ps.*, l.nome as liga_nome
          FROM processos_seletivos ps
          JOIN ligas l ON l.id = ps.liga_id
          WHERE (
            l.lider_id = ${usuario.id}
            OR EXISTS (
              SELECT 1 FROM liga_membros lm
              JOIN usuarios u ON u.id = lm.usuario_id
              WHERE lm.liga_id = l.id AND u.email = ${user.email}
              AND (lm.cargo = 'Diretor' OR u.role = 'diretor')
            )
          )
          ORDER BY ps.created_at DESC
        `;
      }

      res.json(processos);
    } catch (err) {
      next(err);
    }
  },
);

// POST /processo-seletivo — cria processo + form no Typeform
processoSeletivoRouter.post(
  "/",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { liga_id, nome, descricao, pontuacao_minima_aprovacao, perguntas } =
        req.body as CreateProcessoInput;

      if (!liga_id || !nome || !perguntas?.length) {
        res.status(400).json({ error: "liga_id, nome e perguntas são obrigatórios." });
        return;
      }

      if (user.role === "diretor" && !(await usuarioEhDiretorDaLiga(user.email, liga_id))) {
        res.status(403).json({ error: "Você só pode criar processos da sua própria liga." });
        return;
      }

      const [criador] = await sql`SELECT id FROM usuarios WHERE email = ${user.email} LIMIT 1`;

      // Criar form no Typeform
      const { formId, formUrl } = await criarFormTypeform(nome, perguntas);

      // Inserir processo
      const [processo] = await sql`
        INSERT INTO processos_seletivos
          (liga_id, nome, descricao, pontuacao_minima_aprovacao, typeform_form_id, typeform_form_url, created_by)
        VALUES
          (${liga_id}, ${nome}, ${descricao ?? null}, ${pontuacao_minima_aprovacao ?? 70}, ${formId}, ${formUrl}, ${criador?.id ?? null})
        RETURNING *
      `;

      // Inserir perguntas
      for (const pergunta of perguntas) {
        const fieldRef = `pergunta_${pergunta.ordem}`;
        await sql`
          INSERT INTO processo_perguntas
            (processo_id, typeform_field_id, titulo, tipo, peso, eliminatoria, nota_minima, opcoes_eliminatorias, opcoes, ordem)
          VALUES
            (${processo.id}, ${fieldRef}, ${pergunta.titulo}, ${pergunta.tipo},
             ${pergunta.peso ?? 0}, ${pergunta.eliminatoria ?? false},
             ${pergunta.nota_minima ?? null},
             ${pergunta.opcoes_eliminatorias ? JSON.stringify(pergunta.opcoes_eliminatorias) : null},
             ${pergunta.opcoes ? JSON.stringify(pergunta.opcoes) : null},
             ${pergunta.ordem})
        `;
      }

      const pergundasSalvas = await sql`
        SELECT * FROM processo_perguntas WHERE processo_id = ${processo.id} ORDER BY ordem ASC
      `;

      res.status(201).json({ ...processo, perguntas: pergundasSalvas });
    } catch (err) {
      next(err);
    }
  },
);

// GET /processo-seletivo/:id — detalhes + perguntas
processoSeletivoRouter.get(
  "/:id",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT ps.*, l.nome as liga_nome
        FROM processos_seletivos ps
        JOIN ligas l ON l.id = ps.liga_id
        WHERE ps.id = ${id}
        LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const perguntas = await sql`
        SELECT * FROM processo_perguntas WHERE processo_id = ${id} ORDER BY ordem ASC
      `;

      res.json({ ...processo, perguntas });
    } catch (err) {
      next(err);
    }
  },
);

// POST /processo-seletivo/:id/publicar — abre o processo
processoSeletivoRouter.post(
  "/:id/publicar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (processo.status !== "rascunho") {
        res.status(400).json({ error: "Apenas processos em rascunho podem ser publicados." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const [updated] = await sql`
        UPDATE processos_seletivos
        SET status = 'aberto', updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// POST /processo-seletivo/:id/encerrar — fecha o processo
processoSeletivoRouter.post(
  "/:id/encerrar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (processo.status !== "aberto") {
        res.status(400).json({ error: "Apenas processos abertos podem ser encerrados." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const [updated] = await sql`
        UPDATE processos_seletivos
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

// POST /processo-seletivo/:id/sincronizar — busca respostas do Typeform e aplica scoring
processoSeletivoRouter.post(
  "/:id/sincronizar",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (!processo.typeform_form_id) {
        res.status(400).json({ error: "Processo não possui formulário Typeform associado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const perguntas = (await sql`
        SELECT * FROM processo_perguntas WHERE processo_id = ${id} ORDER BY ordem ASC
      `) as ProcessoPergunta[];

      const respostasTypeform = await buscarRespostasTypeform(processo.typeform_form_id as string);

      // IDs já sincronizados
      const jaSincronizados = await sql`
        SELECT typeform_response_id FROM processo_candidatos WHERE processo_id = ${id}
      `;
      const idsExistentes = new Set(
        jaSincronizados.map((r: { typeform_response_id: string }) => r.typeform_response_id),
      );

      let novosCandidatos = 0;

      for (const resposta of respostasTypeform) {
        if (idsExistentes.has(resposta.response_id)) continue;

        // Extrair nome/email das respostas
        const answers = resposta.answers ?? [];
        let nome = "Candidato";
        let email = "";

        for (const answer of answers) {
          if (
            answer.field?.type === "short_text" &&
            answer.type === "text" &&
            !nome.startsWith("C")
          ) {
            nome = answer.text ?? nome;
          }
          if (answer.type === "email" || answer.field?.type === "email") {
            email = (answer as { email?: string }).email ?? answer.text ?? "";
          }
        }

        // Calcular scoring
        let pontuacao = 0;
        let reprovado = false;
        let motivo_reprovacao: string | null = null;

        for (const pergunta of perguntas) {
          const fieldRef = pergunta.typeform_field_id;
          const answer = answers.find((a) => a.field?.ref === fieldRef);

          if (!answer) continue;

          if (pergunta.eliminatoria) {
            if (pergunta.tipo === "sim_nao" && answer.boolean === false) {
              reprovado = true;
              motivo_reprovacao = `Critério eliminatório: ${pergunta.titulo}`;
              break;
            }

            if (pergunta.tipo === "multipla_escolha") {
              const respLabel = answer.choice?.label ?? "";
              const eliminatorias = (pergunta.opcoes_eliminatorias as string[]) ?? [];
              if (eliminatorias.includes(respLabel)) {
                reprovado = true;
                motivo_reprovacao = `Critério eliminatório: ${pergunta.titulo}`;
                break;
              }
            }

            if (pergunta.tipo === "nota_1_10") {
              const nota = answer.number ?? 0;
              if (pergunta.nota_minima && nota < pergunta.nota_minima) {
                reprovado = true;
                motivo_reprovacao = `Nota mínima não atingida: ${pergunta.titulo}`;
                break;
              }
            }
          }

          // Calcular pontuação
          if (pergunta.peso > 0) {
            if (pergunta.tipo === "nota_1_10") {
              const nota = answer.number ?? 0;
              pontuacao += (nota / 10) * pergunta.peso;
            } else if (pergunta.tipo === "sim_nao") {
              pontuacao += answer.boolean ? pergunta.peso : 0;
            } else if (pergunta.tipo === "multipla_escolha") {
              // resposta não eliminatória = candidato deu uma resposta aceitável → peso completo
              const respLabel = answer.choice?.label ?? "";
              const eliminatorias = (pergunta.opcoes_eliminatorias as string[]) ?? [];
              if (!eliminatorias.includes(respLabel)) {
                pontuacao += pergunta.peso;
              }
            }
          }
        }

        const status = reprovado
          ? "reprovado"
          : Math.round(pontuacao) >= (processo.pontuacao_minima_aprovacao as number)
            ? "aprovado"
            : "pendente";

        await sql`
          INSERT INTO processo_candidatos
            (processo_id, typeform_response_id, nome, email, pontuacao_total, status, respostas, motivo_reprovacao, submitted_at)
          VALUES
            (${id}, ${resposta.response_id}, ${nome}, ${email},
             ${Math.round(pontuacao)}, ${status},
             ${JSON.stringify(resposta.answers ?? [])},
             ${motivo_reprovacao},
             ${resposta.submitted_at})
          ON CONFLICT (processo_id, typeform_response_id) DO NOTHING
        `;

        novosCandidatos++;
      }

      res.json({ sincronizados: novosCandidatos, total_typeform: respostasTypeform.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /processo-seletivo/:id/resultados — lista candidatos com estatísticas
processoSeletivoRouter.get(
  "/:id/resultados",
  authenticate,
  requireRole("staff", "diretor"),
  async (req, res, next) => {
    try {
      const id = req.params["id"] as string;
      const user = (req as AuthenticatedRequest).user!;

      const [processo] = await sql`
        SELECT * FROM processos_seletivos WHERE id = ${id} LIMIT 1
      `;

      if (!processo) {
        res.status(404).json({ error: "Processo seletivo não encontrado." });
        return;
      }

      if (
        user.role === "diretor" &&
        !(await usuarioEhDiretorDaLiga(user.email, processo.liga_id as string))
      ) {
        res.status(403).json({ error: "Acesso não autorizado." });
        return;
      }

      const status = req.query["status"] as string | undefined;

      const candidatos = status
        ? await sql`
            SELECT * FROM processo_candidatos
            WHERE processo_id = ${id} AND status = ${status}
            ORDER BY pontuacao_total DESC, submitted_at ASC
          `
        : await sql`
            SELECT * FROM processo_candidatos
            WHERE processo_id = ${id}
            ORDER BY pontuacao_total DESC, submitted_at ASC
          `;

      const [stats] = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
          COUNT(*) FILTER (WHERE status = 'reprovado') as reprovados,
          COUNT(*) FILTER (WHERE status = 'pendente') as pendentes
        FROM processo_candidatos
        WHERE processo_id = ${id}
      `;

      res.json({
        total: Number(stats.total),
        aprovados: Number(stats.aprovados),
        reprovados: Number(stats.reprovados),
        pendentes: Number(stats.pendentes),
        candidatos,
      });
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 2: Montar o router em routes/index.ts**

Editar `apps/api/src/routes/index.ts`, adicionar import e mount:

```typescript
import { processoSeletivoRouter } from "./processo-seletivo.js";
```

E adicionar no final:

```typescript
router.use("/processo-seletivo", processoSeletivoRouter);
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 4: Testar a API manualmente**

Com a API rodando (`npm run dev:api`), testar:

```bash
# Health check
curl http://localhost:3001/api/health

# Listar processos (requer token)
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/processo-seletivo
```

Esperado: array vazio `[]` (nenhum processo criado ainda).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/processo-seletivo.ts apps/api/src/routes/index.ts
git commit -m "feat: add processo-seletivo API routes with Typeform integration"
```

---

## Task 6: Frontend — Rotas e Tipos de Contexto

**Files:**

- Modify: `apps/web/src/router/index.tsx`

- [ ] **Step 1: Adicionar imports das novas páginas no router**

Editar `apps/web/src/router/index.tsx`, adicionar imports:

```typescript
import { NovoProcessoPage } from "@/pages/processo-seletivo/NovoProcessoPage";
import { ProcessoDetalhePage } from "@/pages/processo-seletivo/ProcessoDetalhePage";
```

- [ ] **Step 2: Adicionar sub-rotas**

No array `children` do `AppLayout`, substituir a linha do `processo-seletivo`:

```typescript
// Antes:
{ path: "processo-seletivo", element: <ProcessoSeletivoPage /> },

// Depois:
{ path: "processo-seletivo", element: <ProcessoSeletivoPage /> },
{ path: "processo-seletivo/novo", element: <NovoProcessoPage /> },
{ path: "processo-seletivo/:id", element: <ProcessoDetalhePage /> },
```

- [ ] **Step 3: Verificar typecheck (vai falhar — arquivos ainda não existem)**

```bash
npm run typecheck
```

Esperado: erros de "Cannot find module" para as novas páginas. Isso é esperado — os próximos tasks criam esses arquivos.

---

## Task 7: Frontend — Página de Lista de Processos

**Files:**

- Modify: `apps/web/src/pages/processo-seletivo/ProcessoSeletivoPage.tsx`

- [ ] **Step 1: Reescrever ProcessoSeletivoPage com lista real**

Substituir o conteúdo completo de `apps/web/src/pages/processo-seletivo/ProcessoSeletivoPage.tsx`:

```tsx
import { Plus, ClipboardList, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { ProcessoSeletivo, ProcessoStatus } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_LABELS: Record<ProcessoStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

const STATUS_COLORS: Record<ProcessoStatus, string> = {
  rascunho: "bg-brand-gray text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-red-100 text-red-700",
};

interface ProcessoComLiga extends ProcessoSeletivo {
  liga_nome: string;
}

export function ProcessoSeletivoPage() {
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<ProcessoComLiga[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarProcessos();
  }, []);

  async function carregarProcessos() {
    try {
      setCarregando(true);
      const token = await getToken();
      const res = await fetch("http://localhost:3001/api/processo-seletivo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar processos");
      const dados = await res.json();
      setProcessos(dados);
    } catch {
      toast.error("Erro ao carregar processos seletivos");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Processo Seletivo
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
            Recrutamento · Liga
          </p>
        </div>
        <Button
          onClick={() => navigate("/processo-seletivo/novo")}
          className="bg-navy text-white hover:bg-navy/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Processo
        </Button>
      </div>

      {carregando ? (
        <div className="text-center py-16 text-navy/50 text-sm">Carregando...</div>
      ) : processos.length === 0 ? (
        <div className="border border-navy/15 p-12 text-center">
          <ClipboardList className="w-8 h-8 text-navy/30 mx-auto mb-3" />
          <p className="font-display font-bold text-[16px] tracking-[-0.02em] text-navy">
            Nenhum processo seletivo ainda
          </p>
          <p className="text-[13px] text-navy/50 mt-1">
            Crie um novo processo para começar a recrutar membros.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {processos.map((processo) => (
            <div
              key={processo.id}
              className="border border-navy/15 p-5 hover:border-navy/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/processo-seletivo/${processo.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-[15px] text-navy truncate">
                      {processo.nome}
                    </span>
                    <Badge className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[processo.status]}`}>
                      {STATUS_LABELS[processo.status]}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-navy/50">{processo.liga_nome}</p>
                  {processo.descricao && (
                    <p className="text-[12px] text-navy/60 mt-1 line-clamp-1">
                      {processo.descricao}
                    </p>
                  )}
                </div>
                {processo.typeform_form_url && (
                  <a
                    href={processo.typeform_form_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-navy/40 hover:text-navy transition-colors flex-shrink-0"
                    title="Abrir formulário"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/processo-seletivo/ProcessoSeletivoPage.tsx
git commit -m "feat: replace processo-seletivo placeholder with real list"
```

---

## Task 8: Frontend — Wizard Novo Processo

**Files:**

- Create: `apps/web/src/pages/processo-seletivo/NovoProcessoPage.tsx`

- [ ] **Step 1: Criar o componente wizard**

Criar `apps/web/src/pages/processo-seletivo/NovoProcessoPage.tsx`:

```tsx
import { ArrowLeft, ArrowRight, Check, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

import type {
  CreatePerguntaInput,
  CreateProcessoInput,
  PerguntaTipo,
  ProcessoSeletivoComPerguntas,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface LigaOpcao {
  id: string;
  nome: string;
}

const TIPO_LABELS: Record<PerguntaTipo, string> = {
  texto: "Texto livre",
  multipla_escolha: "Múltipla escolha",
  nota_1_10: "Nota (1–10)",
  sim_nao: "Sim / Não",
};

const ETAPA_LABELS = ["Informações", "Perguntas", "Revisão"];

export function NovoProcessoPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [linkCriado, setLinkCriado] = useState<string | null>(null);
  const [processoId, setProcessoId] = useState<string | null>(null);
  const [ligas, setLigas] = useState<LigaOpcao[]>([]);

  // Etapa 1
  const [ligaId, setLigaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pontuacaoMinima, setPontuacaoMinima] = useState(70);

  // Etapa 2
  const [perguntas, setPerguntas] = useState<CreatePerguntaInput[]>([]);
  const [somaPesos, setSomaPesos] = useState(0);

  useEffect(() => {
    carregarLigas();
  }, []);

  useEffect(() => {
    const soma = perguntas.reduce((acc, p) => acc + (p.peso || 0), 0);
    setSomaPesos(soma);
  }, [perguntas]);

  async function carregarLigas() {
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:3001/api/ligas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      setLigas(dados.map((l: { id: string; nome: string }) => ({ id: l.id, nome: l.nome })));
    } catch {
      toast.error("Erro ao carregar ligas");
    }
  }

  function adicionarPergunta(tipo: PerguntaTipo) {
    const novaPergunta: CreatePerguntaInput = {
      titulo: "",
      tipo,
      peso: tipo === "texto" ? 0 : 0,
      eliminatoria: false,
      nota_minima: tipo === "nota_1_10" ? 5 : undefined,
      opcoes: tipo === "multipla_escolha" ? ["", ""] : undefined,
      opcoes_eliminatorias: tipo === "multipla_escolha" ? [] : undefined,
      ordem: perguntas.length,
    };
    setPerguntas([...perguntas, novaPergunta]);
  }

  function atualizarPergunta(index: number, dados: Partial<CreatePerguntaInput>) {
    const novas = [...perguntas];
    novas[index] = { ...novas[index], ...dados };
    setPerguntas(novas);
  }

  function removerPergunta(index: number) {
    const novas = perguntas.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i }));
    setPerguntas(novas);
  }

  function atualizarOpcao(perguntaIndex: number, opcaoIndex: number, valor: string) {
    const novas = [...perguntas];
    const opcoes = [...(novas[perguntaIndex].opcoes ?? [])];
    opcoes[opcaoIndex] = valor;
    novas[perguntaIndex] = { ...novas[perguntaIndex], opcoes };
    setPerguntas(novas);
  }

  function adicionarOpcao(perguntaIndex: number) {
    const novas = [...perguntas];
    novas[perguntaIndex] = {
      ...novas[perguntaIndex],
      opcoes: [...(novas[perguntaIndex].opcoes ?? []), ""],
    };
    setPerguntas(novas);
  }

  function toggleOpcaoEliminatoria(perguntaIndex: number, opcao: string) {
    const novas = [...perguntas];
    const eliminatorias = novas[perguntaIndex].opcoes_eliminatorias ?? [];
    const jaEsta = eliminatorias.includes(opcao);
    novas[perguntaIndex] = {
      ...novas[perguntaIndex],
      opcoes_eliminatorias: jaEsta
        ? eliminatorias.filter((o) => o !== opcao)
        : [...eliminatorias, opcao],
    };
    setPerguntas(novas);
  }

  async function criarProcesso(publicar: boolean) {
    if (!ligaId || !nome || perguntas.length === 0) {
      toast.error("Preencha todas as informações obrigatórias.");
      return;
    }

    const perguntasComPeso = perguntas.filter((p) => p.tipo !== "texto");
    if (perguntasComPeso.length > 0 && somaPesos !== 100) {
      toast.error(`A soma dos pesos deve ser exatamente 100. Atual: ${somaPesos}.`);
      return;
    }

    try {
      setSalvando(true);
      const token = await getToken();
      const payload: CreateProcessoInput = {
        liga_id: ligaId,
        nome,
        descricao: descricao || undefined,
        pontuacao_minima_aprovacao: pontuacaoMinima,
        perguntas,
      };

      const res = await fetch("http://localhost:3001/api/processo-seletivo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao criar processo");
      }

      const processo = (await res.json()) as ProcessoSeletivoComPerguntas;
      setProcessoId(processo.id);

      if (publicar) {
        await fetch(`http://localhost:3001/api/processo-seletivo/${processo.id}/publicar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setLinkCriado(processo.typeform_form_url ?? null);
      setEtapa(4); // etapa de sucesso
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar processo");
    } finally {
      setSalvando(false);
    }
  }

  // Etapa 4 — Sucesso
  if (etapa === 4 && linkCriado) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="text-center py-12 border border-navy/15">
          <Check className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="font-display font-bold text-[20px] text-navy mb-2">
            Processo criado com sucesso!
          </h2>
          <p className="text-[13px] text-navy/60 mb-6">
            Compartilhe o link abaixo com os candidatos.
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
              onClick={() => navigate("/processo-seletivo")}
              className="border-navy/20 text-navy"
            >
              Ver todos os processos
            </Button>
            {processoId && (
              <Button
                onClick={() => navigate(`/processo-seletivo/${processoId}`)}
                className="bg-navy text-white hover:bg-navy/90"
              >
                Ver resultados
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/processo-seletivo")}
          className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Novo Processo Seletivo
        </h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-10">
        {ETAPA_LABELS.map((label, i) => {
          const num = i + 1;
          const ativa = etapa === num;
          const concluida = etapa > num;
          return (
            <div key={num} className="flex items-center">
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

      {/* Etapa 1 — Informações */}
      {etapa === 1 && (
        <div className="space-y-5">
          <div>
            <Label className="text-[12px] font-medium text-navy mb-1.5 block">Liga *</Label>
            <Select value={ligaId} onValueChange={setLigaId}>
              <SelectTrigger className="border-navy/20 text-navy">
                <SelectValue placeholder="Selecione a liga" />
              </SelectTrigger>
              <SelectContent>
                {ligas.map((liga) => (
                  <SelectItem key={liga.id} value={liga.id}>
                    {liga.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[12px] font-medium text-navy mb-1.5 block">
              Nome do processo *
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Processo Seletivo 2026.1"
              className="border-navy/20"
            />
          </div>

          <div>
            <Label className="text-[12px] font-medium text-navy mb-1.5 block">Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o processo seletivo..."
              className="border-navy/20 resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-[12px] font-medium text-navy mb-1.5 block">
              Pontuação mínima para aprovação: {pontuacaoMinima}/100
            </Label>
            <input
              type="range"
              min={0}
              max={100}
              value={pontuacaoMinima}
              onChange={(e) => setPontuacaoMinima(Number(e.target.value))}
              className="w-full accent-navy"
            />
            <div className="flex justify-between text-[11px] text-navy/40 mt-1">
              <span>0</span>
              <span>100</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                if (!ligaId || !nome) {
                  toast.error("Liga e nome são obrigatórios.");
                  return;
                }
                setEtapa(2);
              }}
              className="bg-navy text-white hover:bg-navy/90 gap-2"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 2 — Perguntas */}
      {etapa === 2 && (
        <div className="space-y-5">
          {/* Indicador de soma de pesos */}
          {perguntas.some((p) => p.tipo !== "texto") && (
            <div
              className={`text-[12px] p-3 border ${somaPesos === 100 ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
            >
              Soma dos pesos: {somaPesos}/100
              {somaPesos !== 100 && " — deve totalizar exatamente 100%"}
            </div>
          )}

          {/* Lista de perguntas */}
          <div className="space-y-4">
            {perguntas.map((pergunta, index) => (
              <div key={index} className="border border-navy/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-navy/30 flex-shrink-0" />
                  <Badge className="text-[10px] bg-brand-gray text-navy px-2 py-0.5 flex-shrink-0">
                    {TIPO_LABELS[pergunta.tipo]}
                  </Badge>
                  <button
                    onClick={() => removerPergunta(index)}
                    className="ml-auto text-navy/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <Label className="text-[11px] text-navy/50 mb-1 block">Pergunta *</Label>
                  <Input
                    value={pergunta.titulo}
                    onChange={(e) => atualizarPergunta(index, { titulo: e.target.value })}
                    placeholder="Digite a pergunta..."
                    className="border-navy/20 text-[13px]"
                  />
                </div>

                {/* Opções para múltipla escolha */}
                {pergunta.tipo === "multipla_escolha" && (
                  <div className="space-y-2">
                    <Label className="text-[11px] text-navy/50 block">Opções</Label>
                    {(pergunta.opcoes ?? []).map((opcao, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(pergunta.opcoes_eliminatorias ?? []).includes(opcao)}
                          onChange={() => toggleOpcaoEliminatoria(index, opcao)}
                          className="accent-red-500 flex-shrink-0"
                          title="Marcar como eliminatória"
                        />
                        <Input
                          value={opcao}
                          onChange={(e) => atualizarOpcao(index, oi, e.target.value)}
                          placeholder={`Opção ${oi + 1}`}
                          className="border-navy/20 text-[12px]"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-navy/40">☑ marcado = opção eliminatória</p>
                    <button
                      onClick={() => adicionarOpcao(index)}
                      className="text-[11px] text-navy/50 hover:text-navy transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar opção
                    </button>
                  </div>
                )}

                {/* Configurações de nota */}
                {pergunta.tipo === "nota_1_10" && (
                  <div className="flex items-center gap-4">
                    <div>
                      <Label className="text-[11px] text-navy/50 mb-1 block">Nota mínima</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={pergunta.nota_minima ?? 5}
                        onChange={(e) =>
                          atualizarPergunta(index, { nota_minima: Number(e.target.value) })
                        }
                        className="border-navy/20 w-20 text-[12px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        id={`elim-${index}`}
                        checked={pergunta.eliminatoria}
                        onChange={(e) =>
                          atualizarPergunta(index, { eliminatoria: e.target.checked })
                        }
                        className="accent-red-500"
                      />
                      <Label htmlFor={`elim-${index}`} className="text-[11px] text-navy/60">
                        Eliminatória
                      </Label>
                    </div>
                  </div>
                )}

                {/* Sim/Não eliminatória */}
                {pergunta.tipo === "sim_nao" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`elim-sn-${index}`}
                      checked={pergunta.eliminatoria}
                      onChange={(e) => atualizarPergunta(index, { eliminatoria: e.target.checked })}
                      className="accent-red-500"
                    />
                    <Label htmlFor={`elim-sn-${index}`} className="text-[11px] text-navy/60">
                      "Não" é eliminatório
                    </Label>
                  </div>
                )}

                {/* Peso */}
                {pergunta.tipo !== "texto" && (
                  <div>
                    <Label className="text-[11px] text-navy/50 mb-1 block">
                      Peso na pontuação: {pergunta.peso}%
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pergunta.peso}
                      onChange={(e) => atualizarPergunta(index, { peso: Number(e.target.value) })}
                      className="w-full accent-navy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar pergunta */}
          <div className="border border-dashed border-navy/20 p-4">
            <p className="text-[11px] text-navy/50 mb-3 font-medium">Adicionar pergunta</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TIPO_LABELS) as [PerguntaTipo, string][]).map(([tipo, label]) => (
                <button
                  key={tipo}
                  onClick={() => adicionarPergunta(tipo)}
                  className="text-[11px] border border-navy/20 px-3 py-1.5 hover:bg-navy/5 text-navy transition-colors"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setEtapa(1)} className="text-navy gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              onClick={() => {
                if (perguntas.length === 0) {
                  toast.error("Adicione pelo menos uma pergunta.");
                  return;
                }
                setEtapa(3);
              }}
              className="bg-navy text-white hover:bg-navy/90 gap-2"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 3 — Revisão */}
      {etapa === 3 && (
        <div className="space-y-6">
          <div className="border border-navy/15 p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-navy">Informações</h3>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <span className="text-navy/50">Nome:</span>{" "}
                <span className="text-navy font-medium">{nome}</span>
              </div>
              <div>
                <span className="text-navy/50">Pontuação mínima:</span>{" "}
                <span className="text-navy font-medium">{pontuacaoMinima}/100</span>
              </div>
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
              Perguntas ({perguntas.length})
            </h3>
            <div className="space-y-2">
              {perguntas.map((p, i) => (
                <div key={i} className="flex items-start gap-3 text-[13px]">
                  <span className="text-navy/40 w-5 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="text-navy">{p.titulo || "(sem título)"}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="text-[10px] bg-brand-gray text-navy px-1.5 py-0">
                        {TIPO_LABELS[p.tipo]}
                      </Badge>
                      {p.peso > 0 && <span className="text-[10px] text-navy/40">{p.peso}%</span>}
                      {p.eliminatoria && (
                        <span className="text-[10px] text-red-500">eliminatória</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setEtapa(2)} className="text-navy gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => criarProcesso(false)}
                disabled={salvando}
                className="border-navy/20 text-navy"
              >
                {salvando ? "Criando..." : "Salvar como rascunho"}
              </Button>
              <Button
                onClick={() => criarProcesso(true)}
                disabled={salvando}
                className="bg-navy text-white hover:bg-navy/90"
              >
                {salvando ? "Criando..." : "Criar e publicar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/processo-seletivo/NovoProcessoPage.tsx
git commit -m "feat: add NovoProcessoPage wizard with 3-step form builder"
```

---

## Task 9: Frontend — Página de Resultados

**Files:**

- Create: `apps/web/src/pages/processo-seletivo/ProcessoDetalhePage.tsx`

- [ ] **Step 1: Criar o componente de resultados**

Criar `apps/web/src/pages/processo-seletivo/ProcessoDetalhePage.tsx`:

```tsx
import { ArrowLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

import type {
  ProcessoCandidato,
  ProcessoSeletivoComPerguntas,
  ResultadosProcesso,
  CandidatoStatus,
  ProcessoStatus,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CANDIDATO_LABELS: Record<CandidatoStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_CANDIDATO_COLORS: Record<CandidatoStatus, string> = {
  pendente: "bg-amber-100 text-amber-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-600",
};

const STATUS_PROCESSO_LABELS: Record<ProcessoStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

export function ProcessoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [processo, setProcesso] = useState<ProcessoSeletivoComPerguntas | null>(null);
  const [resultados, setResultados] = useState<ResultadosProcesso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<CandidatoStatus | "todos">("todos");
  const [candidatoAberto, setCandidatoAberto] = useState<ProcessoCandidato | null>(null);

  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const token = await getToken();

      const [resProcesso, resResultados] = await Promise.all([
        fetch(`http://localhost:3001/api/processo-seletivo/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:3001/api/processo-seletivo/${id}/resultados`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!resProcesso.ok) throw new Error("Processo não encontrado");
      const dadosProcesso = await resProcesso.json();
      setProcesso(dadosProcesso);

      if (resResultados.ok) {
        const dadosResultados = await resResultados.json();
        setResultados(dadosResultados);
      }
    } catch {
      toast.error("Erro ao carregar processo seletivo");
    } finally {
      setCarregando(false);
    }
  }

  async function sincronizar() {
    if (!id) return;
    try {
      setSincronizando(true);
      const token = await getToken();
      const res = await fetch(`http://localhost:3001/api/processo-seletivo/${id}/sincronizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      toast.success(`${dados.sincronizados} novo(s) candidato(s) sincronizado(s).`);
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
      const res = await fetch(`http://localhost:3001/api/processo-seletivo/${id}/encerrar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Processo encerrado.");
      await carregarDados();
    } catch {
      toast.error("Erro ao encerrar processo");
    } finally {
      setEncerrando(false);
    }
  }

  function exportarCSV() {
    if (!resultados) return;
    const linhas = [
      ["Nome", "Email", "Pontuação", "Status", "Data de submissão", "Motivo reprovação"],
      ...resultados.candidatos.map((c) => [
        c.nome,
        c.email,
        String(c.pontuacao_total),
        STATUS_CANDIDATO_LABELS[c.status],
        new Date(c.submitted_at).toLocaleString("pt-BR"),
        c.motivo_reprovacao ?? "",
      ]),
    ];
    const csv = linhas.map((l) => l.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidatos-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const candidatosFiltrados =
    resultados?.candidatos.filter((c) => filtroStatus === "todos" || c.status === filtroStatus) ??
    [];

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/50 text-sm">
        Carregando...
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/50 text-sm">
        Processo não encontrado.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/processo-seletivo")}
          className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
                {processo.nome}
              </h1>
              <Badge className="text-[10px] px-2 py-0.5 bg-brand-gray text-navy">
                {STATUS_PROCESSO_LABELS[processo.status]}
              </Badge>
            </div>
            <p className="text-[12px] text-navy/50">
              {(processo as { liga_nome?: string }).liga_nome ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {processo.typeform_form_url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-navy/20 text-navy gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(processo.typeform_form_url!);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar link
                </Button>
                <a href={processo.typeform_form_url} target="_blank" rel="noopener noreferrer">
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
            {processo.status === "aberto" && (
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
      </div>

      {/* Estatísticas */}
      {resultados && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", valor: resultados.total, cor: "text-navy" },
            { label: "Aprovados", valor: resultados.aprovados, cor: "text-green-700" },
            { label: "Reprovados", valor: resultados.reprovados, cor: "text-red-600" },
            { label: "Pendentes", valor: resultados.pendentes, cor: "text-amber-700" },
          ].map(({ label, valor, cor }) => (
            <div key={label} className="border border-navy/15 p-4 text-center">
              <div className={`font-display font-bold text-[28px] ${cor}`}>{valor}</div>
              <div className="text-[11px] text-navy/50 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros + Export */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {(["todos", "aprovado", "pendente", "reprovado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`text-[11px] px-3 py-1.5 border transition-colors
                ${filtroStatus === s ? "border-navy bg-navy text-white" : "border-navy/20 text-navy/60 hover:border-navy/40"}`}
            >
              {s === "todos" ? "Todos" : STATUS_CANDIDATO_LABELS[s]}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportarCSV}
          className="border-navy/20 text-navy text-[11px]"
        >
          Exportar CSV
        </Button>
      </div>

      {/* Tabela de candidatos */}
      {candidatosFiltrados.length === 0 ? (
        <div className="border border-navy/15 p-10 text-center text-[13px] text-navy/40">
          {resultados?.total === 0
            ? "Nenhum candidato ainda. Clique em Sincronizar para buscar respostas."
            : "Nenhum candidato neste filtro."}
        </div>
      ) : (
        <div className="border border-navy/15">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy/10">
                {["Nome", "Email", "Pontuação", "Status", "Data"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium text-navy/50 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidatosFiltrados.map((candidato) => (
                <tr
                  key={candidato.id}
                  className="border-b border-navy/5 hover:bg-navy/[0.02] cursor-pointer transition-colors"
                  onClick={() => setCandidatoAberto(candidato)}
                >
                  <td className="px-4 py-3 text-[13px] font-medium text-navy">{candidato.nome}</td>
                  <td className="px-4 py-3 text-[12px] text-navy/60">{candidato.email}</td>
                  <td className="px-4 py-3 text-[13px] text-navy font-medium">
                    {candidato.pontuacao_total}/100
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-[10px] px-2 py-0.5 ${STATUS_CANDIDATO_COLORS[candidato.status]}`}
                    >
                      {STATUS_CANDIDATO_LABELS[candidato.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-navy/40">
                    {new Date(candidato.submitted_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer de detalhe do candidato */}
      <Sheet open={!!candidatoAberto} onOpenChange={(open) => !open && setCandidatoAberto(null)}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle className="font-display font-bold text-[16px] text-navy">
              {candidatoAberto?.nome}
            </SheetTitle>
          </SheetHeader>
          {candidatoAberto && (
            <div className="mt-4 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-3">
                <Badge
                  className={`text-[11px] px-2 py-0.5 ${STATUS_CANDIDATO_COLORS[candidatoAberto.status]}`}
                >
                  {STATUS_CANDIDATO_LABELS[candidatoAberto.status]}
                </Badge>
                <span className="text-[13px] text-navy font-medium">
                  {candidatoAberto.pontuacao_total}/100
                </span>
              </div>
              <p className="text-[12px] text-navy/50">{candidatoAberto.email}</p>
              {candidatoAberto.motivo_reprovacao && (
                <div className="bg-red-50 border border-red-100 p-3 text-[12px] text-red-600">
                  {candidatoAberto.motivo_reprovacao}
                </div>
              )}
              <div className="space-y-3 mt-4">
                <h4 className="text-[12px] font-medium text-navy/50 uppercase tracking-wider">
                  Respostas
                </h4>
                {processo.perguntas.map((pergunta, i) => {
                  const respostas = candidatoAberto.respostas as Array<{
                    field: { ref: string };
                    text?: string;
                    number?: number;
                    boolean?: boolean;
                    choice?: { label: string };
                  }>;
                  const resp = respostas?.find((r) => r.field?.ref === pergunta.typeform_field_id);
                  const valor =
                    resp?.text ??
                    resp?.choice?.label ??
                    resp?.number?.toString() ??
                    (resp?.boolean !== undefined ? (resp.boolean ? "Sim" : "Não") : "—");

                  return (
                    <div key={i} className="border-b border-navy/8 pb-3">
                      <p className="text-[11px] text-navy/50 mb-0.5">{pergunta.titulo}</p>
                      <p className="text-[13px] text-navy">{valor}</p>
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

- [ ] **Step 2: Verificar typecheck completo**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/processo-seletivo/ProcessoDetalhePage.tsx
git commit -m "feat: add ProcessoDetalhePage with candidate results and CSV export"
```

---

## Task 10: Verificação End-to-End

- [ ] **Step 1: Rodar a aplicação completa**

```bash
npm run dev
```

Abrir http://localhost:3000 e fazer login como diretor ou staff.

- [ ] **Step 2: Testar criação de processo**

1. Navegar para `/processo-seletivo`
2. Clicar em "Novo Processo"
3. Preencher: selecionar liga, nome "Teste 2026.1", pontuação mínima 60
4. Adicionar perguntas:
   - Pergunta nota 1-10: "Avalie sua experiência com projetos", peso 50, nota mínima 5, eliminatória
   - Pergunta sim/não: "Você tem disponibilidade de 10h/semana?", eliminatória
   - Pergunta texto: "Conte-nos sobre você"
5. Revisar e clicar "Criar e publicar"
6. Verificar que o link do Typeform aparece na tela de sucesso

- [ ] **Step 3: Verificar o form no Typeform**

Abrir o link retornado no passo anterior. Deve exibir as 3 perguntas na ordem correta.

- [ ] **Step 4: Preencher como candidato**

Preencher o formulário com respostas:

- Nota 3 (abaixo de 5) → deve ser reprovado
- Voltar e preencher nota 8, Sim, texto qualquer → deve ser aprovado (se pontuação >= 60)

- [ ] **Step 5: Sincronizar e verificar resultados**

1. Na página do processo, clicar "Sincronizar"
2. Verificar que os candidatos aparecem na tabela
3. Verificar status corretos (reprovado para nota < 5)
4. Clicar em um candidato → drawer com respostas deve abrir
5. Exportar CSV → verificar download

- [ ] **Step 6: Commit final**

```bash
git add .
git commit -m "feat: complete processo-seletivo module with Typeform integration"
```
