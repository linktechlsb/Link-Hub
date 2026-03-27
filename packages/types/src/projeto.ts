import type { Usuario } from "./user.js";
import type { Liga } from "./liga.js";

export type StatusProjeto =
  | "rascunho"
  | "em_aprovacao"
  | "aprovado"
  | "rejeitado"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export interface Projeto {
  id: string;
  liga_id: string;
  liga?: Pick<Liga, "id" | "nome">;
  nome: string;
  descricao?: string;
  responsavel_id: string;
  responsavel?: Usuario;
  status: StatusProjeto;
  prazo?: string;
  percentual_concluido: number;
  criado_em: string;
  atualizado_em: string;
}

export interface CreateProjetoInput {
  liga_id: string;
  nome: string;
  descricao?: string;
  responsavel_id: string;
  prazo?: string;
}

export interface UpdateProjetoInput {
  nome?: string;
  descricao?: string;
  responsavel_id?: string;
  prazo?: string;
  percentual_concluido?: number;
}
