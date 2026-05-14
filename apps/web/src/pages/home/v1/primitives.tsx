import { AlertTriangle, CalendarX, ChevronRight, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export interface KpiItem {
  label: string;
  valor: string;
  unidade?: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon?: ReactNode;
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
  numero?: string;
  eyebrow?: string;
  titulo: string;
  acao?: ReactNode;
  tituloClassName?: string;
}

export function SectionHeader({ titulo, acao, tituloClassName }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p
        className={
          tituloClassName ??
          "text-xs font-bold text-link-blue dark:text-white uppercase tracking-wider"
        }
      >
        {titulo}
      </p>
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

export function KpiRow({ items, cols }: KpiRowProps) {
  const resolvedCols = cols ?? (items.length <= 2 ? 2 : items.length === 3 ? 3 : 4);
  const gridClass =
    resolvedCols === 2
      ? "grid-cols-2"
      : resolvedCols === 3
        ? "grid-cols-1 md:grid-cols-3"
        : "grid-cols-2 md:grid-cols-4";

  return (
    <div className={`grid ${gridClass} gap-3`}>
      {items.map((m) => {
        const trendClass =
          m.trendType === "up"
            ? "text-green-500 bg-green-500/10 border-green-500/20"
            : m.trendType === "down"
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : "text-amber-400 bg-amber-500/10 border-amber-500/20";

        return (
          <Card key={m.label} className="shadow-sm">
            <CardContent className="pt-5 pb-4">
              {m.icon && (
                <div className="h-8 w-8 rounded-lg bg-background border border-[#191919] flex items-center justify-center mb-3">
                  {m.icon}
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="text-3xl font-bold text-foreground leading-none">
                  {m.valor}
                  {m.unidade && (
                    <span className="text-base font-medium text-muted-foreground ml-1">
                      {m.unidade}
                    </span>
                  )}
                </div>
                {m.trend && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] shrink-0 mt-0.5", trendClass)}
                  >
                    {m.trend}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-2">
                {m.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface RankingListProps {
  items: RankingV1Item[];
}

export function RankingList({ items }: RankingListProps) {
  const max = Math.max(...items.map((i) => i.score), 1);
  return (
    <Card className="shadow-sm overflow-hidden">
      <ul>
        {items.map((item, i) => {
          const pct = Math.round((item.score / max) * 100);
          const baixa = pct < 33;
          const media = pct < 66;
          const barClass = baixa
            ? "[&>div]:bg-red-500"
            : media
              ? "[&>div]:bg-amber-500"
              : "[&>div]:bg-green-500";
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#191919] last:border-b-0"
            >
              <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">
                {i + 1}º
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold truncate",
                      item.destaque ? "text-foreground" : "text-foreground/70",
                    )}
                  >
                    {item.nome}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.destaque && (
                      <Badge variant="outline" className="text-[10px] border-foreground/20">
                        Minha
                      </Badge>
                    )}
                    <span className="text-sm font-bold text-foreground">{item.score}</span>
                  </div>
                </div>
                <Progress value={pct} className={cn("h-1.5", barClass)} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

interface AlertListProps {
  items: AlertV1Item[];
  onClick?: (id: string) => void;
}

export function AlertList({ items, onClick }: AlertListProps) {
  return (
    <Card className="shadow-sm overflow-hidden">
      <ul>
        {items.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onClick?.(a.id)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-start gap-3",
                "border-b border-[#191919] last:border-b-0",
                "border-l-2",
                a.tipo === "urgente" ? "border-l-red-500" : "border-l-amber-500",
                "hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-1 focus:ring-foreground/20",
              )}
            >
              {a.tipo === "urgente" ? (
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{a.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.descricao}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface EditorialTableProps {
  columns: string[];
  rows: ReactNode[][];
}

export function EditorialTable({ columns, rows }: EditorialTableProps) {
  return (
    <Card className="shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c}
                className="text-xs uppercase tracking-wide text-muted-foreground font-semibold"
              >
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((cell, j) => (
                <TableCell key={j} className="text-sm text-foreground">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
