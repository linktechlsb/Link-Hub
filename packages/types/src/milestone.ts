export type StatusMilestone = "pendente" | "em_andamento" | "concluido";

export type StatusTarefa = "pendente" | "em_andamento" | "concluida";

export interface Tarefa {
  id: string;
  milestone_id: string;
  titulo: string;
  descricao?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  status: StatusTarefa;
  prazo?: string;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Milestone {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
  status: StatusMilestone;
  ordem: number;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
  tarefas?: Tarefa[];
}

/** Milestone próximo (agregado entre projetos), para o dashboard da Home. */
export interface MilestoneProximo {
  id: string;
  titulo: string;
  prazo?: string;
  status: StatusMilestone;
  projeto: { id: string; titulo: string };
  liga: { id: string; nome: string };
}

export interface CreateMilestoneInput {
  projeto_id: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
  ordem?: number;
}

export interface UpdateMilestoneInput {
  titulo?: string;
  descricao?: string;
  prazo?: string;
  status?: StatusMilestone;
  ordem?: number;
}

export interface CreateTarefaInput {
  titulo: string;
  descricao?: string;
  responsavel_id?: string;
  prazo?: string;
}

export interface UpdateTarefaInput {
  titulo?: string;
  descricao?: string;
  responsavel_id?: string | null;
  status?: StatusTarefa;
  prazo?: string;
}
