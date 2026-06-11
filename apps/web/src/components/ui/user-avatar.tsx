import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Iniciais padrão: primeiras letras dos dois primeiros nomes, em maiúsculo. */
export function iniciaisDeNome(nome?: string | null): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (
    partes
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

interface UserAvatarProps {
  /** Nome usado para as iniciais (fallback) e alt. */
  nome?: string | null;
  /** URL da imagem de perfil. */
  src?: string | null;
  /** Classes do Avatar (tamanho/forma). */
  className?: string;
  /** Classes extras do fallback (ex.: tamanho da fonte). */
  fallbackClassName?: string;
}

/**
 * Avatar de perfil padronizado: imagem com fallback de iniciais consistente
 * (bg-muted + text-foreground, theme-aware) em todo o app.
 */
export function UserAvatar({ nome, src, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarImage src={src ?? undefined} alt={nome ?? ""} />
      <AvatarFallback
        className={cn("bg-muted text-[0.8em] font-medium text-foreground/70", fallbackClassName)}
      >
        {iniciaisDeNome(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
