/** Tipos de item acionável exibidos no card "Pendências" da Home. */
export type TipoPendencia =
  | "projeto_aprovacao"
  | "projeto_atrasado"
  | "evento_aprovacao"
  | "tarefa";

/** Item acionável que aguarda algo do usuário, derivado conforme o papel. */
export interface Pendencia {
  id: string;
  tipo: TipoPendencia;
  titulo: string;
  /** Contexto curto (ex.: nome da liga). */
  contexto?: string;
  prazo?: string | null;
}
