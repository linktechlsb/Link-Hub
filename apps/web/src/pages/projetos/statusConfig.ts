/** Rótulo e cor de cada status de projeto — segue o design da Home/Ligas. */
export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "text-foreground/50" },
  em_aprovacao: { label: "Em aprovação", className: "text-amber-600 dark:text-amber-300" },
  aprovado: { label: "Aprovado", className: "text-sky-600 dark:text-sky-300" },
  rejeitado: { label: "Rejeitado", className: "text-red-600 dark:text-red-300" },
  em_andamento: { label: "Em andamento", className: "text-sky-600 dark:text-sky-300" },
  concluido: { label: "Concluído", className: "text-emerald-600 dark:text-emerald-300" },
  cancelado: { label: "Cancelado", className: "text-foreground/40" },
};
