import type { Usuario } from "./user.js";

export interface Liga {
  id: string;
  nome: string;
  descricao?: string;
  lider_id: string;
  lider?: Usuario;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface LigaMembro {
  id: string;
  liga_id: string;
  usuario_id: string;
  usuario?: Usuario;
  ingressou_em: string;
}

export interface CreateLigaInput {
  nome: string;
  descricao?: string;
  lider_id: string;
}

export interface UpdateLigaInput {
  nome?: string;
  descricao?: string;
  lider_id?: string;
  ativo?: boolean;
}
