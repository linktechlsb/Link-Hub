export type UserRole = "staff" | "diretor" | "membro" | "estudante" | "professor";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  avatar_url?: string;
  biografia?: string;
  onboarding_concluido_em?: string | null;
  criado_em: string;
  atualizado_em: string;
}
