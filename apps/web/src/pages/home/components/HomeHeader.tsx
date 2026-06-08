import { BookOpen, Crown, GraduationCap, ShieldCheck, User, type LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import type { UserRole } from "@link-leagues/types";

/** Rótulo e ícone do badge por papel. */
const ROLE_CONFIG: Record<UserRole, { label: string; icon: LucideIcon }> = {
  staff: { label: "Staff", icon: ShieldCheck },
  diretor: { label: "Diretor", icon: Crown },
  professor: { label: "Professor", icon: GraduationCap },
  membro: { label: "Membro", icon: User },
  estudante: { label: "Estudante", icon: BookOpen },
};

interface HomeHeaderProps {
  nome: string;
  role: UserRole | null;
  loading?: boolean;
}

/**
 * Cabeçalho da Home: saudação "Olá, {Nome}" com badge de papel,
 * e subtítulo logo abaixo.
 */
export function HomeHeader({ nome, role, loading = false }: HomeHeaderProps) {
  if (loading) {
    return (
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-7 w-48 bg-white/5" />
        <Skeleton className="h-3 w-32 bg-white/5" />
      </div>
    );
  }

  const roleConfig = role ? ROLE_CONFIG[role] : null;

  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mb-8 flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-white">Olá, {nome || "Usuário"}</h1>
        {roleConfig && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#282828] px-2.5 py-1 text-xs font-semibold text-white/80">
            <roleConfig.icon className="h-3.5 w-3.5" />
            {roleConfig.label}
          </span>
        )}
      </div>
      <p className="text-sm capitalize text-white/50">{dataFormatada}</p>
    </div>
  );
}
