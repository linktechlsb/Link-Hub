export interface CrmContato {
  id: string;
  liga_id: string;
  nome: string;
  emprego?: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  linkedin?: string;
  /** Visível para pessoas de fora da liga quando true. */
  publico: boolean;
  criado_por?: string;
  criado_em: string;
}

export interface CreateCrmContatoInput {
  liga_id: string;
  nome: string;
  emprego?: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  linkedin?: string;
  publico?: boolean;
}

export interface UpdateCrmContatoInput {
  nome?: string;
  emprego?: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  linkedin?: string;
  publico?: boolean;
}
