export type UserRole = "admin" | "lider" | "membro" | "estudante" | "professor";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  avatar_url?: string;
  biografia?: string;
  criado_em: string;
  atualizado_em: string;
}
