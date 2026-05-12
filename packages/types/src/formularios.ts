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
