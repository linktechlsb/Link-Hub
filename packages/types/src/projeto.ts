import type { Liga } from "./liga.js";
import type { Usuario } from "./user.js";

export interface CategoriasProjeto {
  id: string;
  nome: string;
  descricao?: string;
  liga_id?: string;
  ativo: boolean;
  criado_em: string;
}

export interface CreateCategoriasProjetoInput {
  nome: string;
  descricao?: string;
}

export type StatusProjeto =
  | "rascunho"
  | "em_aprovacao"
  | "aprovado"
  | "rejeitado"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

export type TipoProjeto =
  | "iniciacao_cientifica"
  | "projeto_interno"
  | "projeto_externo"
  | "projeto_estruturante";

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
  impacto?: string;
  professor_id?: string;
  empresa_parceira?: string;
  tipo_projeto?: TipoProjeto;
  categoria_id?: string;
  categoria?: CategoriasProjeto;
  ligas_participantes?: Pick<Liga, "id" | "nome">[];
  criado_em: string;
  atualizado_em: string;
}

export interface CreateProjetoInput {
  liga_id: string;
  titulo: string;
  descricao?: string;
  responsavel_id: string;
  prazo?: string;
  impacto?: string;
  professor_id?: string;
  empresa_parceira?: string;
  tipo_projeto?: TipoProjeto;
  categoria_id?: string;
  ligas_participantes_ids?: string[];
}

export interface UpdateProjetoInput {
  titulo?: string;
  descricao?: string;
  responsavel_id?: string;
  prazo?: string;
  percentual_concluido?: number;
  impacto?: string;
  professor_id?: string;
  empresa_parceira?: string;
  tipo_projeto?: TipoProjeto;
  categoria_id?: string;
  ligas_participantes_ids?: string[];
}
