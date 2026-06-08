import type { CategoriaEvento } from "@link-leagues/types";

/** Cor + rótulo por tipo de evento, usado nos pontinhos e na legenda do calendário. */
export const CATEGORIA_EVENTO: Record<CategoriaEvento, { label: string; cor: string }> = {
  encontro: { label: "Encontro", cor: "#3B82F6" }, // azul
  aula: { label: "Aula", cor: "#8B5CF6" }, // violeta
  cowork: { label: "Cowork", cor: "#14B8A6" }, // teal
  evento: { label: "Evento", cor: "#F59E0B" }, // âmbar
  hub: { label: "Hub", cor: "#F43F5E" }, // rosa
};

/** Cor de uma categoria, com fallback neutro. */
export function corCategoria(categoria: CategoriaEvento): string {
  return CATEGORIA_EVENTO[categoria]?.cor ?? "#9CA3AF";
}

// ── Helpers de data (padrão da AgendaPage) ──────────────────────────────────

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Extrai HH:MM de um campo de hora ("14:00:00") ou de um ISO; "" se não houver. */
export function formatHora(valor?: string | null): string {
  if (!valor) return "";
  // Campo "time" do Postgres vem como "HH:MM:SS"
  if (/^\d{2}:\d{2}/.test(valor)) return valor.slice(0, 5);
  const d = new Date(valor);
  if (isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  if (h === 0 && min === 0) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
