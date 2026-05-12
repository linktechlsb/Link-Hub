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

export class TallyApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TallyApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${env.TALLY_API_KEY}`);
  headers.set("Content-Type", "application/json");
  headers.set("tally-version", TALLY_API_VERSION);

  const url = `${TALLY_API}${path}`;
  const delays = [1000, 2000, 4000];

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
  throw new TallyApiError("Tally request failed após retries", 0);
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

  // FORM_TITLE: groupUuid === uuid (não um UUID separado)
  const formTitleUuid = randomUUID();
  blocks.push({
    uuid: formTitleUuid,
    groupUuid: formTitleUuid,
    type: "FORM_TITLE",
    groupType: "FORM_TITLE",
    payload: { html: formulario.nome },
  });

  const ordenados = [...campos].sort((a, b) => a.ordem - b.ordem);

  for (const campo of ordenados) {
    if (campo.tipo === "texto") {
      const inputUuid = randomUUID();
      ordemParaContainerUuid.set(campo.ordem, inputUuid);
      blocks.push({
        uuid: inputUuid,
        groupUuid: inputUuid, // groupUuid === uuid para blocos de pergunta
        type: "INPUT_TEXT",
        groupType: "QUESTION",
        payload: { html: campo.titulo, isRequired: campo.eliminatoria, placeholder: "" },
      });
      continue;
    }

    if (campo.tipo === "nota_1_10") {
      const inputUuid = randomUUID();
      ordemParaContainerUuid.set(campo.ordem, inputUuid);
      blocks.push({
        uuid: inputUuid,
        groupUuid: inputUuid,
        type: "LINEAR_SCALE",
        groupType: "QUESTION",
        payload: { html: campo.titulo, isRequired: true, start: 1, end: 10 },
      });
      continue;
    }

    if (campo.tipo === "multipla_escolha") {
      const containerUuid = randomUUID();
      ordemParaContainerUuid.set(campo.ordem, containerUuid);
      blocks.push({
        uuid: containerUuid,
        groupUuid: containerUuid,
        type: "MULTIPLE_CHOICE",
        groupType: "QUESTION",
        payload: { html: campo.titulo },
      });
      const opcoes = campo.opcoes ?? [];
      opcoes.forEach((opcao, i) => {
        blocks.push({
          uuid: randomUUID(),
          groupUuid: containerUuid,
          type: "MULTIPLE_CHOICE_OPTION",
          groupType: "MULTIPLE_CHOICE",
          // isFirst/isLast vão no payload das options (não no topo do bloco)
          payload: { text: opcao, index: i, isFirst: i === 0, isLast: i === opcoes.length - 1 },
        });
      });
      continue;
    }

    if (campo.tipo === "sim_nao") {
      const containerUuid = randomUUID();
      ordemParaContainerUuid.set(campo.ordem, containerUuid);
      blocks.push({
        uuid: containerUuid,
        groupUuid: containerUuid,
        type: "MULTIPLE_CHOICE",
        groupType: "QUESTION",
        payload: { html: campo.titulo },
      });
      const opts = ["Sim", "Não"];
      opts.forEach((text, i) => {
        blocks.push({
          uuid: randomUUID(),
          groupUuid: containerUuid,
          type: "MULTIPLE_CHOICE_OPTION",
          groupType: "MULTIPLE_CHOICE",
          payload: { text, index: i, isFirst: i === 0, isLast: i === opts.length - 1 },
        });
      });
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
