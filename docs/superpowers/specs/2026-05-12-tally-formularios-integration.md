# Tally Forms Integration — Generic Formulários Module

> **Status:** Design / spec — aguardando aprovação para virar plano de implementação.
> **Autor:** Diogo (com Claude)
> **Data:** 2026-05-12

## Goal

Trocar Google Forms por **Tally** como provedor de formulários, e ao mesmo tempo **generalizar o módulo de formulários** para que não seja exclusivo de Processo Seletivo. O Link Hub passa a oferecer uma plataforma de formulários genéricos (pesquisa, inscrição, feedback, processo seletivo, etc.), com scoring automático como **funcionalidade opcional**.

A integração com o Tally é **100% via API**:

- Criação e edição de formulários via `POST /forms` e `PATCH /forms/{id}`
- Coleta de respostas via webhook (`POST /webhooks` para configurar) + endpoint de catch-up via `GET /forms/submissions?formId=...`
- Branding/cores ficam delegados ao Tally (controlados pela dashboard deles)

## Non-goals

- Editar formulário depois de publicado. Bloqueado no UI; matches current behavior.
- Migrar formulários antigos que tinham `google_form_id`. Os existentes ficam órfãos (campo nulo) — não há dados de produção a preservar (Google Forms já foi desativado no commit `7f2bb35`).
- Migrar branding/cores do Tally para dentro do Link Hub. A tela de "Personalização" e o `TypeformMockup` saem; quem quiser customizar usa o Tally.
- Suportar tipos de bloco Tally além dos quatro que já existem no wizard atual. Expansão futura.

## Background

### Estado atual

- DB tem `processos_seletivos`, `processo_perguntas`, `processo_candidatos`, com colunas `google_form_id`/`google_form_url`/`google_item_id`/`google_response_id` e shape de respostas no formato Google (`textAnswers.answers[].value` ou `scaleAnswer.value`).
- `apps/api/src/routes/formularios.ts` cria registros locais mas com `google_form_id = NULL` (Google Forms foi removido no commit `7f2bb35`). O endpoint `POST /:id/sincronizar` retorna **501**.
- Wizard de criação (`NovoFormularioPage.tsx`) tem 4 etapas, incluindo etapa de personalização (cores + imagens) que assume um `TypeformMockup` próprio. Essa customização **nunca foi propagada para o Google Forms** (havia um aviso amarelo dizendo "edite manualmente").
- Visualmente, a feature está finalizada e em produção (commits `2026-05-09-formularios-redesign`).

### O que muda conceitualmente

1. O módulo deixa de ser "Processo Seletivo" e vira "Formulários". Processo Seletivo passa a ser **um tipo de formulário** (com scoring habilitado).
2. **Scoring deixa de ser obrigatório.** Existem formulários sem pontuação (pesquisa, feedback, inscrição) e formulários com pontuação (processo seletivo). Controlado por uma flag `scoring_enabled`.
3. **Liga deixa de ser obrigatória.** Formulários internos da Link (ex: pesquisa de clima organizacional para todos os membros) podem existir sem `liga_id`.
4. Tally é a fonte de renderização. Link Hub é a fonte de configuração (campos + scoring) e armazenamento de respostas processadas.

## Architecture

### Componentes

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Link Hub Frontend      │        │  Link Hub API                │
│  (apps/web)             │        │  (apps/api)                  │
│                         │        │                              │
│  • FormulariosPage      │ HTTP   │  • routes/formularios.ts     │
│  • NovoFormularioPage   │◄──────►│  • services/tally.ts         │
│  • FormularioDetalhe    │        │  • routes/tally-webhook.ts   │
│    (iframe Tally embed) │        │  • utils/scoring (shared)    │
└─────────────────────────┘        └──────────────┬───────────────┘
                                                  │
                                   Tally REST API │  HMAC-signed webhook
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │  Tally (api.tally.so)        │
                                   │  • Forms, submissions,       │
                                   │    webhooks                  │
                                   └──────────────────────────────┘
```

### Domain model (renomeado e generalizado)

```sql
formularios (renomeado de processos_seletivos)
  id              UUID
  liga_id         UUID NULL     -- agora opcional
  tipo            TEXT NOT NULL CHECK IN ('generico','processo_seletivo','pesquisa','inscricao','feedback')
  nome            TEXT
  descricao       TEXT
  status          TEXT          -- rascunho | aberto | encerrado
  scoring_enabled BOOLEAN       -- NEW
  pontuacao_minima_aprovacao INT  -- NEW, usado quando scoring_enabled
  tally_form_id   TEXT          -- renomeado de google_form_id
  tally_form_url  TEXT          -- renomeado de google_form_url
  tally_webhook_id TEXT         -- NEW (pra deletar webhook ao encerrar)
  created_by, created_at, updated_at

formulario_campos (renomeado de processo_perguntas)
  id                    UUID
  formulario_id         UUID  -- renomeado de processo_id
  tally_question_id     TEXT  -- renomeado de google_item_id, NULL antes do create
  titulo                TEXT
  tipo                  TEXT  -- texto | multipla_escolha | nota_1_10 | sim_nao
  ordem                 INT
  peso                  INT   -- usado quando scoring_enabled
  eliminatoria          BOOLEAN
  nota_minima           INT
  opcoes                JSONB
  opcoes_eliminatorias  JSONB

formulario_respostas (renomeado de processo_candidatos)
  id                  UUID
  formulario_id       UUID  -- renomeado de processo_id
  tally_submission_id TEXT  -- renomeado de google_response_id, UNIQUE
  nome                TEXT
  email               TEXT
  respostas           JSONB  -- shape Tally
  pontuacao_total     INT    -- nullable; populado se scoring_enabled
  status              TEXT   -- pendente | aprovado | reprovado; pendente se sem scoring
  motivo_reprovacao   TEXT
  submitted_at        TIMESTAMP
  sincronizado_at     TIMESTAMP
```

### Fluxos principais

**1. Criar formulário (rascunho):**

```
Frontend (Wizard)
  → POST /api/formularios { tipo, nome, descricao, scoring_enabled, campos[] }
     API:
       • INSERT formularios (status=rascunho, tally_form_id=NULL)
       • INSERT formulario_campos[] (sem tally_question_id ainda)
       • const { blocks, ordemParaContainerUuid } = mapCamposToBlocks(form, campos)
       • const tallyForm = tally.forms.create({ name: form.nome, status: 'DRAFT', blocks })
       • UPDATE formularios SET tally_form_id, tally_form_url
       • Para cada (ordem, containerUuid) em ordemParaContainerUuid:
           UPDATE formulario_campos SET tally_question_id=containerUuid WHERE formulario_id=? AND ordem=?
       • Retorna formulário completo
```

**2. Publicar:**

```
POST /api/formularios/:id/publicar
  API:
    • tally.forms.update(tally_form_id, { status: 'PUBLISHED' })
    • tally.webhooks.create(formId, PUBLIC_API_BASE_URL + '/api/formularios/webhook/tally', SIGNING_SECRET)
    • UPDATE formularios SET status='aberto', tally_webhook_id
```

**3. Resposta chega via webhook:**

```
Tally → POST /api/formularios/webhook/tally
  • Valida header `tally-signature` (lowercase). Algoritmo:
       expected = createHmac('sha256', TALLY_WEBHOOK_SIGNING_SECRET)
                    .update(rawBody)              // raw bytes, sem reparse
                    .digest('base64')
    Comparação com timingSafeEqual. 401 se inválido.
  • Resolve formulario por payload.data.formId == formularios.tally_form_id
  • Idempotência: skip se já existe formulario_respostas com tally_submission_id == payload.data.responseId
  • Constrói mapa { tally_question_id → field.value } usando data.fields[].key
  • Extrai nome/email procurando por label case-insensitive
  • Se scoring_enabled: utils/scoring.calcularPontuacao(campos, mapa, pontuacao_minima) → status + pontuacao + motivo
  • Senão: status='pendente', pontuacao=NULL
  • INSERT formulario_respostas (respostas serializa o mapa completo)
  • Retorna 200 em até 10s
```

**4. Sincronização manual (catch-up):**

```
POST /api/formularios/:id/sincronizar
  • Page through tally.submissions.list(tally_form_id) até hasMore=false
  • Para cada submission não-conhecida (UNIQUE em tally_submission_id), aplica mesma lógica do webhook
  • Retorna { sincronizados: n }
```

**5. Encerrar (reversível):**

```
POST /api/formularios/:id/encerrar
  • tally.webhooks.setEnabled(tally_webhook_id, false)   -- mantém histórico/ID, evita recriar
  • tally.forms.close(tally_form_id, 'Formulário encerrado.')
      -- PATCH /forms/{id} { settings: { isClosed: true, closedMessage } }
      -- form fica PUBLISHED, mas Tally renderiza tela de "form encerrado" para o respondente
  • UPDATE formularios SET status='encerrado'
  -- tally_webhook_id permanece salvo para reabertura futura (se virar feature)
```

> **Por que não usar status `DRAFT` para encerrar:** `DRAFT` no Tally é "form ainda não publicado" — quem acessar a URL pública vê página de erro/redirect. `settings.isClosed=true` mantém o form em `PUBLISHED` e exibe uma mensagem amigável.
> **Por que não usar `DELETE /webhooks`:** desabilitar (`isEnabled=false`) preserva histórico de eventos no Tally e permite reativar sem custo. Já guardamos `tally_webhook_id`.

## Components

### `packages/types/src/formularios.ts` (atualizado)

```ts
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
  respostas: Record<string, TallyAnswer>; // chave = tally_question_id
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
  aprovados: number; // sempre 0 se !scoring_enabled
  reprovados: number; // idem
  pendentes: number;
  respostas: FormularioResposta[];
}

export interface CreateCampoInput {
  /* mesmo shape do FormularioCampo sem id/formulario_id/tally_question_id */
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

### `packages/types/src/tally.ts` (novo)

Tipos derivados do OpenAPI Tally (`https://developers.tally.so/api-reference/openapi.json`), apenas os subsets que usamos:

**Importante:** A API do Tally usa **dois vocabulários distintos** de tipos para blocos/respostas. Mantemos eles separados nos tipos.

- **`TallyBlockType`** — usado em `POST /forms` e `GET /forms/{id}` para descrever blocks. PascalCase com sufixo `Block`. Containers como `MultipleChoiceBlock` exigem N `MultipleChoiceOptionBlock` filhos (mesma coisa com `Checkboxes`/`CheckboxBlock`, `Dropdown`/`DropdownOptionBlock`).
- **`TallyFieldType`** — usado no payload do webhook em `data.fields[].type`. SCREAMING_SNAKE_CASE (`INPUT_TEXT`, `MULTIPLE_CHOICE`, `LINEAR_SCALE`).

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
  groupUuid?: string; // amarra option blocks ao seu container
  groupType?: TallyBlockType;
  payload: Record<string, unknown>; // ex: { text, isRequired, start, end, options? }
}

export interface TallyFormSettings {
  isClosed?: boolean;
  closedMessage?: string;
  // ... outros campos de settings
}

export interface TallyForm {
  id: string;
  name: string; // nome interno da workspace
  workspaceId?: string;
  status: "BLANK" | "DRAFT" | "PUBLISHED" | "DELETED";
  blocks: TallyBlock[];
  settings?: TallyFormSettings;
}

// === Tipos do webhook (POST de Tally para nós) ===
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
  key: string; // = blockUuid do container no form
  label: string;
  type: TallyFieldType;
  value: unknown;
}

// Forma normalizada que persistimos em formulario_respostas.respostas (Record<key, TallyAnswer>)
export interface TallyAnswer {
  type: TallyFieldType;
  value: unknown;
  label: string;
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

// === Tipos de submissions list (GET /forms/submissions) ===
export interface TallySubmission {
  id: string;
  formId: string;
  isCompleted: boolean;
  submittedAt: string;
  responses: TallyResponse[];
}
export interface TallyResponse {
  id: string;
  questionId: string;
  answer: unknown;
  formattedAnswer: string;
}
// NOTA: a chave real do array no payload da Tally é `items` (não `submissions`).
// Confirmar com um request real antes de codar `/sincronizar`; ajustar se for diferente.
export interface TallySubmissionsPage {
  items: TallySubmission[];
  questions: Array<{ id: string; title: string; type: string }>;
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
```

### `packages/utils/src/scoring.ts` (novo)

```ts
export function calcularPontuacao(
  campos: FormularioCampo[],
  respostas: Record<string, TallyAnswer>,
  pontuacaoMinima: number,
): { pontuacao_total: number; status: RespostaStatus; motivo_reprovacao?: string };
```

**Regras (não muda do que já existia no DB schema, só implementa pela primeira vez):**

1. **Eliminatórias primeiro.** Para cada campo com `eliminatoria=true`:
   - `sim_nao`: se resposta = "Não" → reprovado
   - `nota_1_10`: se resposta < `nota_minima` → reprovado
   - `multipla_escolha`: se resposta ∈ `opcoes_eliminatorias` → reprovado
   - Em caso de reprovação: `status='reprovado'`, `motivo_reprovacao=<descrição>`
2. **Soma ponderada.** Para campos com `peso > 0` e tipo ≠ `texto`:
   - `nota_1_10`: `(valor / 10) * peso`
   - `sim_nao`: `(valor === 'Sim' ? 1 : 0) * peso`
   - `multipla_escolha`: 1 se selecionou alguma opção não eliminatória, senão 0 (× peso)
   - `pontuacao_total = Math.round(soma)`
3. **Threshold.** Se `pontuacao_total >= pontuacaoMinima` → `aprovado`, senão `pendente`.

Inclui testes em `packages/utils/src/scoring.test.ts` cobrindo:

- Eliminatória sim/não, nota mínima, opção eliminatória
- Soma ponderada com pesos zerados e não-zerados
- Threshold aprovado/pendente
- Sem campos pontuáveis (todos texto) → pontuacao=0, status=pendente

### `apps/api/src/services/tally.ts` (novo)

```ts
const TALLY_API = "https://api.tally.so";
const TALLY_API_VERSION = "2025-02-01"; // pinned; bump explicitamente quando validarmos versão nova

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Headers: Authorization Bearer + Content-Type JSON + tally-version pinned
  // 429: backoff exponencial (1s/2s/4s) até 3 tentativas
  // Outros 4xx/5xx: throw com payload do erro
}

export const tally = {
  forms: {
    create: (input: CreateTallyFormBody) =>
      request<TallyForm>("/forms", { method: "POST", body: JSON.stringify(input) }),
    update: (id: string, patch: Partial<TallyForm>) =>
      request<TallyForm>(`/forms/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    close: (id: string, closedMessage?: string) =>
      request<TallyForm>(`/forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ settings: { isClosed: true, closedMessage } }),
      }),
    reopen: (id: string) =>
      request<TallyForm>(`/forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ settings: { isClosed: false } }),
      }),
    get: (id: string) => request<TallyForm>(`/forms/${id}`),
  },
  submissions: {
    // ATENÇÃO: path correto é /forms/submissions (NÃO /forms/{id}/submissions)
    // Cursor de paginação é `before`/`after` (não afterId)
    list: (formId: string, opts?: { limit?: number; after?: string; before?: string }) => {
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
    // PATCH /webhooks/{id} exige formId, url, eventTypes como required no body — não dá pra
    // mandar só { isEnabled }. Fazemos GET antes e remontamos o body completo.
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
```

**Mapper Link Hub → Tally (`mapCamposToBlocks`)** gera blocks tratando containers e options separadamente:

```ts
export interface CreateTallyFormBody {
  name: string; // nome interno (= formulario.nome)
  status: "BLANK" | "DRAFT" | "PUBLISHED";
  workspaceId?: string;
  blocks: TallyBlock[];
}

// Retorna blocks + um mapa `ordem → containerUuid` (para escrever tally_question_id depois).
// O Tally precisa que options venham logo após o container, ligados por groupUuid.
export function mapCamposToBlocks(
  formulario: { nome: string; descricao?: string },
  campos: CreateCampoInput[],
): { blocks: TallyBlock[]; ordemParaContainerUuid: Map<number, string> };
```

**Regra por tipo de campo:**

| Tipo Link Hub      | Blocks Tally emitidos                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `texto`            | 1× `InputTextBlock`                                                                                    |
| `multipla_escolha` | 1× `MultipleChoiceBlock` (container) + N× `MultipleChoiceOptionBlock` (mesmo `groupUuid` do container) |
| `nota_1_10`        | 1× `LinearScaleBlock` com `payload.start=1`, `payload.end=10`                                          |
| `sim_nao`          | 1× `MultipleChoiceBlock` + 2× `MultipleChoiceOptionBlock` ("Sim", "Não")                               |

Adicionalmente, no início dos blocks vai 1× `FormTitleBlock` com `payload.text=formulario.nome` (Tally usa isso como título visível). O campo `name` do form recebe o mesmo valor (nome interno).

**Extração dos `tally_question_id`** após criar: percorre `form.blocks` ignorando `FormTitleBlock`/`TitleBlock`/`TextBlock` e qualquer bloco cujo `type` termine em `OptionBlock`/`CheckboxBlock`. O índice `i` dentro da lista filtrada corresponde a `campos[i].ordem`, e o `block.uuid` correspondente vira `tally_question_id`. O mapa retornado de `mapCamposToBlocks` espelha essa lógica (preserva ordem do wizard → uuid do container).

> **Critério de matching no webhook:** `data.fields[].key === formulario_campos.tally_question_id`. Os fields do webhook **apenas trazem containers** (não options); o `value` de campos `MULTIPLE_CHOICE` é a label da opção escolhida (ou array, se multi-select).

### `apps/api/src/routes/formularios.ts` (refatorado)

Endpoints listados na seção **Architecture / Fluxos**. Permissões mantém o padrão `authenticate` + `requireRole('staff','diretor')`, com regra adicional: forms `tipo='processo_seletivo'` continuam restritos ao escopo de liga (diretor só vê os da própria liga); forms genéricos sem `liga_id` ficam visíveis a todos `staff` e ao `diretor` criador.

### `apps/api/src/routes/tally-webhook.ts` (novo)

```ts
// Rota pública (sem authenticate), montada em /api/formularios/webhook/tally.
// Importante: middleware express.raw ANTES dos parsers JSON globais, pra preservar o raw body
// (necessário pro HMAC). Express monta esse handler isolado.
router.post("/webhook/tally", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    // 1. Verifica assinatura (header lowercase, HMAC SHA-256 base64 do raw body)
    const sig = req.header("tally-signature");
    const expected = crypto
      .createHmac("sha256", process.env.TALLY_WEBHOOK_SIGNING_SECRET!)
      .update(req.body) // Buffer raw
      .digest("base64");
    if (!sig || !timingSafeEqualB64(sig, expected)) {
      res.status(401).end();
      return;
    }

    // 2. Parse e processa
    const event = JSON.parse(req.body.toString("utf8")) as TallyWebhookEvent;
    await processarSubmission(event.data.formId, event.data.responseId, event.data.fields);

    res.status(200).end();
  } catch (err) {
    next(err);
  }
});
```

A função `processarSubmission` é compartilhada entre webhook e `/sincronizar`. Como o Tally usa **shapes diferentes** entre o webhook (`TallyField`: `{ key, label, type, value }`) e o endpoint de submissions (`TallyResponse`: `{ id, questionId, answer, formattedAnswer }`), normalizamos antes de chamar:

```ts
// Forma interna unificada usada por processarSubmission
export interface RespostaNormalizada {
  questionId: string; // = TallyField.key OU TallyResponse.questionId
  label: string; // = TallyField.label OU questions[].title (do submissions list)
  type: TallyFieldType; // = TallyField.type OU questions[].type
  value: unknown; // = TallyField.value OU TallyResponse.answer
}

function fromWebhookFields(fields: TallyField[]): RespostaNormalizada[] {
  return fields.map((f) => ({ questionId: f.key, label: f.label, type: f.type, value: f.value }));
}

function fromSubmissionResponses(
  responses: TallyResponse[],
  questions: TallySubmissionsPage["questions"], // pra resolver label/type via questionId
): RespostaNormalizada[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return responses.map((r) => {
    const q = byId.get(r.questionId);
    return {
      questionId: r.questionId,
      label: q?.title ?? "",
      type: (q?.type as TallyFieldType) ?? "INPUT_TEXT",
      value: r.answer,
    };
  });
}

async function processarSubmission(
  formId: string,
  submissionId: string,
  respostas: RespostaNormalizada[],
): Promise<void> {
  /* matching por questionId == tally_question_id, scoring, insert idempotente */
}
```

- **Webhook path:** `processarSubmission(formId, responseId, fromWebhookFields(event.data.fields))`
- **Sincronizar path:** para cada submission da página: `processarSubmission(formId, submission.id, fromSubmissionResponses(submission.responses, page.questions))`

O matching com `formulario_campos.tally_question_id` usa `RespostaNormalizada.questionId` em ambos os caminhos.

### Frontend

**`NovoFormularioPage.tsx`** — Wizard reduzido a **3 etapas**:

1. **Tipo + Informações**
   - Select de `tipo` (Genérico / Processo Seletivo / Pesquisa / Inscrição / Feedback)
   - Toggle `scoring_enabled` (default `true` se tipo=processo_seletivo, `false` caso contrário; mas editável)
   - Se diretor: liga é fixa (sua); se staff e tipo=processo_seletivo: select de liga obrigatório; se staff e outro tipo: select de liga opcional (com "Sem liga" no topo)
   - Nome + descrição
2. **Campos**
   - Idem ao atual, mas a coluna de "peso / eliminatória / nota mínima" só aparece se `scoring_enabled`
   - Validação de pesos somando 100 só aplica se `scoring_enabled`
3. **Revisão + publicar**
   - Mostra resumo. Botões "Salvar rascunho" e "Criar e publicar"
   - Tela 5 (sucesso) mantém com link copiável e botão "Ver respostas"

**Etapas removidas:**

- Personalização inteira (`TypeformMockup`, `ColorField`, `ImageUrlField`)
- Aviso amarelo sobre logo/imagem não aplicar (não existe mais)

**`FormularioDetalhePage.tsx`** — Adicionar duas abas (componente `Tabs` shadcn):

- **Aba "Respostas"** (default): KpiRow + filtros + tabela atual. Quando `!scoring_enabled`: KpiRow vira "Total de respostas" só; tabela esconde colunas Pontuação / Status; Sheet esconde status badge e motivo.
- **Aba "Preview"**: `<iframe src="https://tally.so/embed/{tally_form_id}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" width="100%" height="600">`. Link "Editar no Tally" → `https://tally.so/forms/{tally_form_id}/edit`.

Sheet de resposta individual atualiza parser: lê `respostas[tally_question_id]` no shape Tally novo (object com `value` ou `formattedAnswer`) ao invés do shape Google antigo.

**`FormulariosPage.tsx`** — Listagem ganha **filtro de tipo** (pill extra ou select). Coluna "Pontuação mínima" só aparece se houver formulários com scoring na lista filtrada; senão substitui por "Tipo".

## Data flow

### Webhook payload exemplo (do Tally)

```json
{
  "eventId": "evt_abc",
  "eventType": "FORM_RESPONSE",
  "createdAt": "2026-05-12T10:30:00Z",
  "data": {
    "responseId": "resp_xyz",
    "respondentId": "person_123",
    "formId": "tally_form_id_here",
    "fields": [
      { "key": "question_uuid_1", "label": "Nome", "type": "INPUT_TEXT", "value": "João" },
      {
        "key": "question_uuid_2",
        "label": "Email",
        "type": "INPUT_EMAIL",
        "value": "joao@email.com"
      },
      { "key": "question_uuid_3", "label": "Nota técnica", "type": "LINEAR_SCALE", "value": 8 }
    ]
  }
}
```

### Mapeamento para `formulario_respostas.respostas`

```json
{
  "question_uuid_1": { "type": "INPUT_TEXT", "value": "João", "label": "Nome" },
  "question_uuid_2": { "type": "INPUT_EMAIL", "value": "joao@email.com", "label": "Email" },
  "question_uuid_3": { "type": "LINEAR_SCALE", "value": 8, "label": "Nota técnica" }
}
```

Identificação de nome/email: procuramos por `label` que corresponda (case-insensitive) a "nome"/"email" e usamos como `formulario_respostas.nome/email`. Se não encontrar, deixamos string vazia (a UI mostra "—").

## Error handling

| Cenário                                                                  | Comportamento                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Tally API 4xx no `forms.create`                                          | Aborta criação, devolve erro estruturado para o frontend, **não persiste** registro local                          |
| Tally API 4xx no `webhooks.create` durante publicar                      | Faz rollback do PUBLISHED via `PATCH /forms/{id} { status: 'DRAFT' }`, devolve erro, mantém formulário em rascunho |
| Webhook chega com `formId` desconhecido                                  | Loga warning, retorna 200 (não dá erro pro Tally — evita retries inúteis)                                          |
| Webhook chega com submission duplicada (`tally_submission_id` já existe) | Skip silencioso, retorna 200                                                                                       |
| Webhook chega sem assinatura válida                                      | 401, não processa                                                                                                  |
| Resposta sem campo nome/email                                            | Salva com strings vazias, UI mostra "—"                                                                            |
| Sincronização manual com submissions já-conhecidas                       | Idempotente por `UNIQUE(tally_submission_id)`; retorna apenas count dos novos                                      |
| Rate limit Tally (429)                                                   | Backoff exponencial até 3 tentativas, depois propaga erro                                                          |
| `pontuacao_minima_aprovacao` é null mas `scoring_enabled` é true         | Validação no `POST /formularios`: bloqueia criação                                                                 |

## Testing

Foco em testes de unidade no que tem lógica não-trivial:

- `packages/utils/src/scoring.test.ts` — todas regras de scoring (eliminatórias, soma ponderada, threshold, edge cases)
- `apps/api/src/services/tally.test.ts` — `mapCamposToBlocks` para cada tipo de campo (verifica blocks emitidos + `ordemParaContainerUuid` retornado, garantindo que options ficam ligadas ao container via `groupUuid`)
- `apps/api/src/routes/tally-webhook.test.ts` — assinatura HMAC válida/inválida, idempotência, `formId` desconhecido, dispatch para scoring quando habilitado, skip de scoring quando desabilitado

Smoke test manual end-to-end (documentado no plano de execução): criar form → publicar → submeter resposta no Tally real → confirmar chegada via webhook → encerrar → confirmar webhook desabilitado (`isEnabled=false`) e form com `settings.isClosed=true`.

## Environment variables

| Variável                       | Onde                       | Descrição                                                                           |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------------------------- |
| `TALLY_API_KEY`                | `apps/api/.env`            | Bearer token da Tally                                                               |
| `TALLY_WEBHOOK_SIGNING_SECRET` | `apps/api/.env`            | Secret gerado, passado para `webhooks.create` e usado pra validar `Tally-Signature` |
| `TALLY_WORKSPACE_ID`           | `apps/api/.env` (opcional) | Se quiser organizar forms num workspace específico                                  |
| `PUBLIC_API_BASE_URL`          | `apps/api/.env`            | URL pública da API (em dev: ngrok/cloudflared). Usado ao registrar webhook          |

## Execution phases

1. **Migrações + types** — rename de tabelas/colunas, novos campos, atualizar `packages/types/src/formularios.ts` + novo `packages/types/src/tally.ts`. Sem mudança de comportamento ainda.
2. **Service Tally + scoring util** — `apps/api/src/services/tally.ts` + `packages/utils/src/scoring.ts` com testes.
3. **Webhook endpoint** — `apps/api/src/routes/tally-webhook.ts` montado, validação HMAC, idempotência.
4. **Refactor endpoints CRUD** — `POST /formularios` (cria no Tally), `/publicar`/`/encerrar` (gerencia webhook), `/sincronizar` (reimplementado via API).
5. **Wizard simplificado** — `NovoFormularioPage.tsx` para 3 etapas, remove personalização.
6. **Detalhe com abas + parser novo** — `FormularioDetalhePage.tsx` com aba Preview (iframe) e Sheet adaptado.
7. **Listagem com filtro de tipo** — `FormulariosPage.tsx` ganha filtro `tipo`.
8. **Cleanup** — remover `TypeformMockup`, `ColorField`, `ImageUrlField`, endpoint `assets/upload`, coluna `tema` (já no passo 1).
9. **Smoke test e2e** — fluxo manual completo descrito acima.

## Open questions

Nenhuma — todas as decisões em aberto foram resolvidas:

- ✅ Estratégia: **B (criação programática via API)** confirmada
- ✅ Generalização: **formulários genéricos com `tipo` + `scoring_enabled`** opcional
- ✅ `liga_id`: **opcional**
- ✅ Edição após publicado: **bloqueada**

## Changelog — revisão Codex (2026-05-12)

Pegadas do verificador aplicadas:

1. **`GET /forms/{formId}/submissions` → `GET /forms/submissions?formId=...`** com cursor `before`/`after` (não `afterId`). Corrigido no service.
2. **Separação `TallyBlockType` vs `TallyFieldType`** — block types da API de forms (PascalCase com sufixo `Block`) divergem dos field types do webhook (SCREAMING_SNAKE). Tipos agora distintos.
3. **MultipleChoice/Checkboxes/Dropdown são container + N option blocks** — mapper emite container + options (mesmo `groupUuid`), e a extração de `tally_question_id` filtra apenas containers antes de zipar com a ordem do wizard.
4. **Header webhook é `tally-signature` (lowercase)** e HMAC SHA-256 em **base64** do raw body (não hex). Comparação com `timingSafeEqual`. Middleware `express.raw` para preservar bytes.
5. **`tally-version: 2025-02-01`** pinned no helper `request()`. Bump explícito quando validarmos nova versão.
6. **Encerrar via `webhooks.setEnabled(false)`** (PATCH `isEnabled=false`) em vez de `DELETE /webhooks/{id}`. Mantém histórico e permite reabertura barata.
7. **Encerrar via `settings.isClosed=true`** (form continua PUBLISHED) em vez de mudar status para DRAFT, que confundiria respondentes com tela de erro.
8. **Form `name` (interno) + `FormTitleBlock` (visível)** — ambos preenchidos com `formulario.nome`. Mapper inclui o title block como primeiro elemento.

### Revisão Codex — rodada 2 (2026-05-12)

9. **`PATCH /webhooks/{id}` exige `formId`/`url`/`eventTypes`/`isEnabled` no body** — `setEnabled` agora faz GET antes para remontar o body completo. Sem isso, a API responde 400.
10. **`TallyAnswer` definida em `packages/types/src/tally.ts`** — `{ type: TallyFieldType; value: unknown; label: string }`. Usada em `FormularioResposta.respostas`.
11. **`TallySubmissionsPage.items`** (não `submissions`) — chave real do payload. Comentário pede verificação com request real antes de codar `/sincronizar`.
12. **Rollback no erro de `webhooks.create` durante publicar** — `PATCH /forms/{id} { status: 'DRAFT' }`, não `settings.isClosed=true`. Para forms que nunca foram lançados, voltar pra DRAFT é o estado correto.
13. **Smoke test e testes de service** — atualizados para refletir `setEnabled(false)` (não delete) e `ordemParaContainerUuid` no retorno de `mapCamposToBlocks` (em vez de `extractTallyQuestionIds` separado, que não existe mais).

### Revisão Codex — rodada 3 (2026-05-12)

14. **`processarSubmission` recebe `RespostaNormalizada[]`** — webhook usa `fromWebhookFields(TallyField[])` (`key`→`questionId`, `value`→`value`), sincronização usa `fromSubmissionResponses(TallyResponse[], questions)` (resolve `label`/`type` via lookup em `questions[]`). Os dois caminhos convergem antes do matching contra `tally_question_id`.
15. **Goal section** — `GET /forms/submissions?formId=...` (path correto, alinhado com o service).

### Pontos registrados (não bloqueadores)

- `UNIQUE(formulario_id, tally_question_id)` em `formulario_campos` — adicionar no plano de execução, fase 1 das migrações.
- Permissões de forms genéricos sem `liga_id` — definir regra clara no plano (proposta: `staff` vê tudo; `diretor` vê apenas os que criou OU os com `liga_id` da sua liga).
- Status `pendente` para forms sem scoring é semanticamente ruim mas funcional. Decisão de design mantida; pode evoluir para um enum separado depois (ex: `recebida` vs `pendente`/`aprovado`/`reprovado`).
