import type { Liga } from "./liga.js";

export interface Sala {
  id: string;
  nome: string;
  capacidade?: number;
  localizacao?: string;
  ativo: boolean;
}

export interface ReservaSala {
  id: string;
  sala_id: string;
  sala?: Sala;
  liga_id: string;
  liga?: Pick<Liga, "id" | "nome">;
  titulo: string;
  inicio: string;
  fim: string;
  criado_por: string;
  criado_em: string;
}

export interface CreateReservaInput {
  sala_id: string;
  liga_id: string;
  titulo: string;
  inicio: string;
  fim: string;
}
