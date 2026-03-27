import type { Usuario } from "./user.js";

export type StatusPresenca = "presente" | "ausente" | "justificado";

export interface Evento {
  id: string;
  liga_id: string;
  titulo: string;
  descricao?: string;
  data: string;
  criado_em: string;
}

export interface Presenca {
  id: string;
  evento_id: string;
  evento?: Evento;
  liga_id: string;
  usuario_id: string;
  usuario?: Usuario;
  status: StatusPresenca;
  justificativa?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface CreatePresencaInput {
  evento_id: string;
  liga_id: string;
  usuario_id: string;
  status: StatusPresenca;
  justificativa?: string;
}
