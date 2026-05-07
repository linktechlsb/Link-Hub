import type { ReactNode } from "react";

export interface KpiItem {
  label: string;
  valor: string;
  unidade?: string;
  trend?: string;
}

export interface RankingV1Item {
  id: string;
  nome: string;
  score: number;
  destaque?: boolean;
}

export interface AlertV1Item {
  id: string;
  titulo: string;
  descricao: string;
  tipo?: "atencao" | "urgente";
}

interface SectionHeaderProps {
  numero: string;
  eyebrow: string;
  titulo: string;
  acao?: ReactNode;
}

export function SectionHeader({ numero, eyebrow, titulo, acao }: SectionHeaderProps) {
  return (
    <div className="pt-5 mb-4 flex items-end justify-between">
      <div>
        <div className="flex items-baseline gap-4">
          <span className="font-plex-mono text-[11px] tracking-[0.18em] text-foreground/40">
            {numero}
          </span>
          <span className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
            {eyebrow}
          </span>
        </div>
        <h2 className="font-plex-sans font-bold text-foreground text-[22px] tracking-[-0.025em] mt-2">
          {titulo}
        </h2>
      </div>
      {acao}
    </div>
  );
}

interface KpiRowProps {
  items: KpiItem[];
  cols?: 2 | 3 | 4;
  borderBottom?: boolean;
  centered?: boolean;
}

export function KpiRow({ items, cols, borderBottom = true, centered = false }: KpiRowProps) {
  const resolvedCols = cols ?? (items.length <= 2 ? 2 : items.length === 3 ? 3 : 4);
  const gridClass =
    resolvedCols === 2
      ? "grid-cols-2"
      : resolvedCols === 3
        ? "grid-cols-1 md:grid-cols-3"
        : "grid-cols-2 md:grid-cols-4";
  return (
    <div className={`grid ${gridClass} gap-0 border border-[#191919] rounded-lg overflow-hidden`}>
      {items.map((m, i) => (
        <div
          key={m.label}
          className={`py-5 px-4 ${centered ? "text-center" : ""} ${i < items.length - 1 ? "border-r border-[#191919]" : ""}`}
        >
          <div className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-foreground/50">
            {m.label}
          </div>
          <div className="font-plex-sans font-bold text-[32px] leading-none text-foreground tracking-[-0.02em] mt-2">
            {m.valor}
            {m.unidade && (
              <span className="font-plex-sans text-[16px] font-medium text-foreground/50 ml-1">
                {m.unidade}
              </span>
            )}
          </div>
          {m.trend && (
            <div className="font-plex-mono text-[9px] uppercase tracking-[0.14em] text-foreground/40 mt-2">
              {m.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface RankingListProps {
  items: RankingV1Item[];
}

export function RankingList({ items }: RankingListProps) {
  const max = Math.max(...items.map((i) => i.score));
  return (
    <ol className="border border-[#191919] rounded-lg overflow-hidden">
      {items.map((item, i) => {
        const pct = Math.round((item.score / max) * 100);
        return (
          <li
            key={item.id}
            className="border-b border-[#191919] last:border-b-0 py-4 px-4 grid grid-cols-[2rem_1fr_auto] items-center gap-4"
          >
            <span className="font-plex-mono text-[11px] tracking-[0.14em] text-foreground/50">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-plex-sans text-[14px] ${
                    item.destaque ? "font-bold text-foreground" : "font-medium text-foreground/70"
                  }`}
                >
                  {item.nome}
                </span>
                {item.destaque && (
                  <span className="font-plex-mono text-[8px] uppercase tracking-[0.2em] text-foreground border border-foreground/30 px-1.5 py-0.5">
                    Minha
                  </span>
                )}
              </div>
              <div className="h-px bg-foreground/10 mt-2 relative">
                <div
                  className={`absolute left-0 top-0 h-px ${item.destaque ? "bg-foreground" : "bg-foreground/40"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="font-plex-sans font-bold text-[18px] text-foreground tracking-[-0.02em]">
              {item.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface AlertListProps {
  items: AlertV1Item[];
  onClick?: (id: string) => void;
}

export function AlertList({ items, onClick }: AlertListProps) {
  return (
    <ul className="border border-[#191919] rounded-lg overflow-hidden">
      {items.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onClick?.(a.id)}
            className="w-full text-left border-b border-[#191919] last:border-b-0 py-4 pl-4 pr-4 border-l-2 border-l-foreground/25 hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground/20"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="font-plex-mono text-[9px] uppercase tracking-[0.2em] text-foreground/50">
                  {a.tipo === "urgente" ? "Urgente" : "Atenção"}
                </div>
                <div className="font-plex-sans font-semibold text-[14px] text-foreground mt-1">
                  {a.titulo}
                </div>
                <div className="font-plex-sans text-[12px] text-foreground/60 mt-0.5">
                  {a.descricao}
                </div>
              </div>
              <span className="font-plex-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50">
                →
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

interface EditorialTableProps {
  columns: string[];
  rows: ReactNode[][];
}

export function EditorialTable({ columns, rows }: EditorialTableProps) {
  return (
    <div className="border border-[#191919] rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#191919]">
            {columns.map((c) => (
              <th
                key={c}
                className="text-left py-3 px-4 font-plex-mono text-[9px] uppercase tracking-[0.18em] text-foreground/50 font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#191919] last:border-b-0">
              {r.map((cell, j) => (
                <td key={j} className="py-4 px-4 font-plex-sans text-[13px] text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
