// === Tipos para criar / ler form (POST /forms, GET /forms/{id}) ===
export type TallyBlockType =
  | "FORM_TITLE"
  | "TEXT"
  | "LABEL"
  | "TITLE"
  | "HEADING_1"
  | "HEADING_2"
  | "HEADING_3"
  | "DIVIDER"
  | "PAGE_BREAK"
  | "THANK_YOU_PAGE"
  | "IMAGE"
  | "EMBED"
  | "EMBED_VIDEO"
  | "EMBED_AUDIO"
  | "QUESTION"
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_CHOICE_OPTION"
  | "CHECKBOXES"
  | "CHECKBOX"
  | "DROPDOWN"
  | "DROPDOWN_OPTION"
  | "RANKING"
  | "RANKING_OPTION"
  | "MATRIX"
  | "MATRIX_ROW"
  | "MATRIX_COLUMN"
  | "MULTI_SELECT"
  | "MULTI_SELECT_OPTION"
  | "INPUT_TEXT"
  | "INPUT_NUMBER"
  | "INPUT_EMAIL"
  | "INPUT_LINK"
  | "INPUT_PHONE_NUMBER"
  | "INPUT_DATE"
  | "INPUT_TIME"
  | "TEXTAREA"
  | "FILE_UPLOAD"
  | "HIDDEN_FIELDS"
  | "LINEAR_SCALE"
  | "RATING"
  | "PAYMENT"
  | "SIGNATURE"
  | "WALLET_CONNECT"
  | "CONDITIONAL_LOGIC"
  | "CALCULATED_FIELDS"
  | "CAPTCHA"
  | "RESPONDENT_COUNTRY";

export interface TallyBlock {
  uuid: string;
  groupUuid: string;
  type: TallyBlockType;
  groupType: TallyBlockType;
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
