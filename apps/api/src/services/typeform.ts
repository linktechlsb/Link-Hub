import { env } from "../config/env.js";

import type { CreatePerguntaInput, TemaProcesso } from "@link-leagues/types";

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
  email?: string;
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
          choices: (pergunta.opcoes ?? [])
            .map((label) => label.trim())
            .filter((label) => label.length > 0)
            .map((label) => ({ label })),
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

export async function criarTemaTypeform(tema: TemaProcesso): Promise<string> {
  const body: Record<string, unknown> = {
    name: `tema-${Date.now()}`,
    colors: {
      answer: tema.cor_botao,
      background: tema.cor_fundo,
      button: tema.cor_botao,
      question: tema.cor_pergunta,
    },
    font: "Montserrat",
  };

  if (tema.imagem_fundo_url) {
    body["background"] = { href: tema.imagem_fundo_url, layout: "fullscreen", brightness: 0 };
  }

  if (tema.logo_url) {
    body["has_transparent_button"] = false;
  }

  const res = await fetch(`${TYPEFORM_BASE_URL}/themes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TYPEFORM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Erro ao criar tema no Typeform: ${error}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function criarFormTypeform(
  nome: string,
  perguntas: CreatePerguntaInput[],
  themeId?: string,
): Promise<{ formId: string; formUrl: string }> {
  const fields = perguntas.sort((a, b) => a.ordem - b.ordem).map(mapPerguntaToField);

  const body: Record<string, unknown> = {
    title: nome,
    fields,
    settings: {
      language: "pt",
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

  if (themeId) {
    body["theme"] = { href: `${TYPEFORM_BASE_URL}/themes/${themeId}` };
  }

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
