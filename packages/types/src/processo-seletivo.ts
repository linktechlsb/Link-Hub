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
