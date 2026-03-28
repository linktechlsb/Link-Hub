export type UserRole = "admin" | "lider" | "membro" | "estudante";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  avatar_url?: string;
  criado_em: string;
  atualizado_em: string;
}
