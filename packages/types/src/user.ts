export type UserRole = "admin" | "lider" | "membro";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  avatar_url?: string;
  criado_em: string;
  atualizado_em: string;
}
