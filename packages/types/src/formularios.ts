export type FormularioStatus = "rascunho" | "aberto" | "encerrado";
export type PerguntaTipo = "texto" | "multipla_escolha" | "nota_1_10" | "sim_nao";
export type CandidatoStatus = "pendente" | "aprovado" | "reprovado";

export interface TemaFormulario {
  cor_fundo: string;
  cor_pergunta: string;
  cor_botao: string;
  logo_url?: string;
  imagem_fundo_url?: string;
}

export interface Formulario {
  id: string;
  liga_id: string;
  nome: string;
  descricao?: string;
  status: FormularioStatus;
  google_form_id?: string;
  google_form_url?: string;
  tema?: TemaFormulario;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormularioPergunta {
  id: string;
  processo_id: string;
  google_item_id?: string;
  titulo: string;
  tipo: PerguntaTipo;
  peso: number;
  eliminatoria: boolean;
  nota_minima?: number;
  opcoes_eliminatorias?: string[];
  opcoes?: string[];
  ordem: number;
}

export interface FormularioCandidato {
  id: string;
  processo_id: string;
  google_response_id: string;
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

export interface CreateFormularioInput {
  liga_id: string;
  nome: string;
  descricao?: string;
  perguntas: CreatePerguntaInput[];
  tema?: TemaFormulario;
}

export interface FormularioComPerguntas extends Formulario {
  perguntas: FormularioPergunta[];
}

export interface ResultadosFormulario {
  total: number;
  aprovados: number;
  reprovados: number;
  pendentes: number;
  candidatos: FormularioCandidato[];
}
