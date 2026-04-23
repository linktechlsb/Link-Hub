import type { Usuario } from "./user.js";

export interface Liga {
  id: string;
  nome: string;
  descricao?: string;
  lider_id: string;
  lider?: Usuario;
  lider_email?: string;
  imagem_url?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  diretores?: { id: string; nome: string; avatar_url?: string | null }[];
  projetos_ativos?: number;
  professor_id?: string;
}

export interface LigaMembro {
  id: string;
  liga_id: string;
  usuario_id: string;
  usuario?: Usuario;
  cargo?: string;
  ingressou_em: string;
}

export interface CreateLigaInput {
  nome: string;
  descricao?: string;
  lider_id: string;
  diretores?: string[];
}

export interface UpdateLigaInput {
  nome?: string;
  descricao?: string;
  lider_id?: string;
  ativo?: boolean;
  diretores?: string[];
  professor_id?: string | null;
}
