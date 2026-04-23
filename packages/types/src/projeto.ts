import type { Liga } from "./liga.js";
import type { Usuario } from "./user.js";

export type StatusProjeto =
  | "rascunho"
  | "em_aprovacao"
  | "aprovado"
  | "rejeitado"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

export interface Projeto {
  id: string;
  liga_id: string;
  liga?: Pick<Liga, "id" | "nome">;
  titulo: string;
  descricao?: string;
  responsavel_id: string;
  responsavel?: Usuario;
  criado_por?: string;
  status: StatusProjeto;
  prazo?: string;
  percentual_concluido: number;
  aprovacao_professor: StatusAprovacao;
  aprovacao_staff: StatusAprovacao;
  criado_em: string;
  atualizado_em: string;
}

export interface CreateProjetoInput {
  liga_id: string;
  titulo: string;
  descricao?: string;
  responsavel_id: string;
  prazo?: string;
}

export interface UpdateProjetoInput {
  titulo?: string;
  descricao?: string;
  responsavel_id?: string;
  prazo?: string;
  percentual_concluido?: number;
}
