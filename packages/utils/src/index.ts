/** Formata data ISO para exibição em pt-BR */
export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", ...opts }).format(new Date(iso));
}

/** Formata data e hora ISO para exibição em pt-BR */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** Retorna as iniciais de um nome (até 2 letras) */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Traduz StatusProjeto para label em pt-BR */
export function labelStatusProjeto(status: string): string {
  const labels: Record<string, string> = {
    rascunho: "Rascunho",
    em_aprovacao: "Em Aprovação",
    aprovado: "Aprovado",
    rejeitado: "Rejeitado",
    em_andamento: "Em Andamento",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };
  return labels[status] ?? status;
}

/** Traduz StatusPresenca para label em pt-BR */
export function labelStatusPresenca(status: string): string {
  const labels: Record<string, string> = {
    presente: "Presente",
    ausente: "Ausente",
    justificado: "Justificado",
  };
  return labels[status] ?? status;
}
