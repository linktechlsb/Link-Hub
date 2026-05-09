import { google, type forms_v1 } from "googleapis";

import { env } from "../config/env.js";

import type { CreatePerguntaInput } from "@link-leagues/types";

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: [
    "https://www.googleapis.com/auth/forms.body",
    "https://www.googleapis.com/auth/forms.responses.readonly",
  ],
  subject: env.GOOGLE_SERVICE_ACCOUNT_SUBJECT,
});

const forms = google.forms({ version: "v1", auth });

export interface GoogleFormAnswer {
  questionId: string;
  textAnswers?: { answers: Array<{ value: string }> };
  scaleAnswer?: { value: number };
}

export interface GoogleFormResponse {
  responseId: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers: Record<string, GoogleFormAnswer>;
}

function mapPerguntaToRequest(
  pergunta: CreatePerguntaInput,
  index: number,
): forms_v1.Schema$Request {
  let questionItem: forms_v1.Schema$QuestionItem;

  switch (pergunta.tipo) {
    case "texto":
      questionItem = {
        question: {
          required: false,
          textQuestion: { paragraph: true },
        },
      };
      break;

    case "multipla_escolha":
      questionItem = {
        question: {
          required: true,
          choiceQuestion: {
            type: "RADIO",
            options: (pergunta.opcoes ?? [])
              .map((o) => o.trim())
              .filter((o) => o.length > 0)
              .map((o) => ({ value: o })),
          },
        },
      };
      break;

    case "nota_1_10":
      questionItem = {
        question: {
          required: true,
          scaleQuestion: { low: 1, high: 10 },
        },
      };
      break;

    case "sim_nao":
      questionItem = {
        question: {
          required: true,
          choiceQuestion: {
            type: "RADIO",
            options: [{ value: "Sim" }, { value: "Não" }],
          },
        },
      };
      break;
  }

  return {
    createItem: {
      item: { title: pergunta.titulo, questionItem },
      location: { index },
    },
  };
}

export async function criarFormGoogle(
  nome: string,
  descricao: string | undefined,
  perguntas: CreatePerguntaInput[],
): Promise<{ formId: string; formUrl: string; questionIds: Record<number, string> }> {
  const createRes = await forms.forms.create({
    requestBody: { info: { title: nome } },
  });

  const formId = createRes.data.formId!;
  const formUrl = `https://docs.google.com/forms/d/${formId}/viewform`;

  const perguntasOrdenadas = [...perguntas].sort((a, b) => a.ordem - b.ordem);

  const requests: forms_v1.Schema$Request[] = [
    {
      updateSettings: {
        settings: { emailCollectionType: "INPUT_EMAIL" },
        updateMask: "emailCollectionType",
      },
    },
  ];

  if (descricao) {
    requests.push({
      updateFormInfo: {
        info: { description: descricao },
        updateMask: "description",
      },
    });
  }

  for (let i = 0; i < perguntasOrdenadas.length; i++) {
    const pergunta = perguntasOrdenadas[i];
    if (pergunta) {
      requests.push(mapPerguntaToRequest(pergunta, i));
    }
  }

  const batchRes = await forms.forms.batchUpdate({
    formId,
    requestBody: { requests },
  });

  // replies[0] = updateSettings, replies[1] = updateFormInfo (se descricao), depois createItem
  const replies = batchRes.data.replies ?? [];
  const offset = descricao ? 2 : 1;

  const questionIds: Record<number, string> = {};
  for (let i = 0; i < perguntasOrdenadas.length; i++) {
    const reply = replies[i + offset];
    const questionId = reply?.createItem?.questionId?.[0];
    if (questionId) {
      questionIds[perguntasOrdenadas[i]?.ordem ?? i] = questionId;
    }
  }

  return { formId, formUrl, questionIds };
}

export async function buscarRespostasGoogle(formId: string): Promise<GoogleFormResponse[]> {
  const res = await forms.forms.responses.list({ formId, pageSize: 5000 });
  return (res.data.responses ?? []) as GoogleFormResponse[];
}
