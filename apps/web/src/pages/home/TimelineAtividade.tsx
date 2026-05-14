import { Calendar } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cn } from "@/lib/utils";

import type { Evento, Liga, RankingLiga } from "@link-leagues/types";

type Metrica = "encontros" | "presencas" | "pontos" | "membros";
type Periodo = "diario" | "semanal" | "mensal";

interface DataPoint {
  label: string;
  value: number;
  fullLabel: string;
}

function getDateRange(periodo: Periodo): { inicio: string; fim: string } {
  const hoje = new Date();
  const fim = hoje.toISOString().slice(0, 10);
  const inicio = new Date(hoje);

  switch (periodo) {
    case "diario":
      inicio.setDate(inicio.getDate() - 13);
      break;
    case "semanal":
      inicio.setDate(inicio.getDate() - 7 * 11);
      break;
    case "mensal":
      inicio.setMonth(inicio.getMonth() - 11);
      break;
  }

  return { inicio: inicio.toISOString().slice(0, 10), fim };
}

function buildPeriodKeys(periodo: Periodo): { key: string; label: string; fullLabel: string }[] {
  const hoje = new Date();
  const keys: { key: string; label: string; fullLabel: string }[] = [];

  switch (periodo) {
    case "diario": {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        keys.push({
          key: iso,
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          fullLabel: d.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          }),
        });
      }
      break;
    }
    case "semanal": {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - i * 7);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const iso = d.toISOString().slice(0, 10);
        const fim = new Date(d);
        fim.setDate(fim.getDate() + 6);
        keys.push({
          key: iso,
          label: `S${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
          fullLabel: `Semana de ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`,
        });
      }
      break;
    }
    case "mensal": {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        keys.push({
          key,
          label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          fullLabel: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        });
      }
      break;
    }
  }

  return keys;
}

function getEventKey(data: string, periodo: Periodo): string {
  if (periodo === "diario") return data.slice(0, 10);
  if (periodo === "mensal") return data.slice(0, 7);
  // semanal: get Monday of the week
  const d = new Date(data);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

interface TimelineAtividadeProps {
  ligaId: string | null;
  isStaff?: boolean;
  ligas?: Liga[];
  ranking?: RankingLiga[];
  onLigaChange?: (id: string) => void;
}

export function TimelineAtividade({
  ligaId,
  isStaff = false,
  ligas = [],
  ranking = [],
  onLigaChange,
}: TimelineAtividadeProps) {
  const [metrica, setMetrica] = useState<Metrica>("encontros");
  const [periodo, setPeriodo] = useState<Periodo>("semanal");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [periodoPainelAberto, setPeriodoPainelAberto] = useState(false);
  const periodoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fecharAoClicarFora(e: MouseEvent) {
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) {
        setPeriodoPainelAberto(false);
      }
    }
    if (periodoPainelAberto) document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, [periodoPainelAberto]);

  const diasParaPeriodo: Record<number, Periodo | undefined> = {
    7: "diario",
    30: "semanal",
    90: "mensal",
  };
  const periodoParaDias: Record<Periodo, number> = { diario: 7, semanal: 30, mensal: 90 };

  const { inicio, fim } = getDateRange(periodo);
  const periodKeys = buildPeriodKeys(periodo);

  const eventosUrl =
    metrica !== "pontos" && ligaId
      ? `/api/eventos?inicio=${inicio}&fim=${fim}&liga_id=${ligaId}`
      : metrica !== "pontos" && !ligaId && isStaff
        ? `/api/eventos?inicio=${inicio}&fim=${fim}`
        : null;

  const presencaUrl =
    metrica === "presencas" && ligaId
      ? `/api/presenca?liga_id=${ligaId}&periodo_inicio=${inicio}&periodo_fim=${fim}`
      : null;

  const { data: eventosData } = useCachedFetch<Evento[]>(
    metrica === "encontros" ? eventosUrl : null,
  );
  const { data: presencaData } =
    useCachedFetch<{ evento?: { data: string }; status: string }[]>(presencaUrl);

  const dataPoints: DataPoint[] = useMemo(() => {
    if (metrica === "pontos") {
      return ranking
        .slice()
        .sort((a, b) => (b.pontuacao ?? 0) - (a.pontuacao ?? 0))
        .slice(0, 8)
        .map((r) => ({
          label: r.nome.split(" ").slice(0, 2).join(" "),
          fullLabel: r.nome,
          value: r.pontuacao ?? 0,
        }));
    }

    if (metrica === "membros") {
      return ligas
        .slice()
        .sort((a, b) => (b.total_membros ?? 0) - (a.total_membros ?? 0))
        .slice(0, 8)
        .map((l) => ({
          label: l.nome.split(" ").slice(0, 2).join(" "),
          fullLabel: l.nome,
          value: l.total_membros ?? 0,
        }));
    }

    const counts = new Map<string, number>();
    periodKeys.forEach((p) => counts.set(p.key, 0));

    if (metrica === "encontros" && eventosData) {
      for (const e of eventosData) {
        const key = getEventKey(e.data, periodo);
        if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    if (metrica === "presencas" && presencaData) {
      for (const p of presencaData) {
        if (p.status !== "presente" || !p.evento?.data) continue;
        const key = getEventKey(p.evento.data, periodo);
        if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return periodKeys.map((p) => ({
      label: p.label,
      fullLabel: p.fullLabel,
      value: counts.get(p.key) ?? 0,
    }));
  }, [metrica, periodo, periodKeys, eventosData, presencaData, ranking]);

  const maxValue = Math.max(...dataPoints.map((d) => d.value), 1);

  const metricaLabel: Record<Metrica, string> = {
    encontros: "Encontros",
    presencas: "Presenças",
    pontos: "Pontuação",
    membros: "Membros",
  };

  return (
    <Card className="shadow-sm h-full">
      <CardContent className="pt-5 pb-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <p className="font-semibold text-sm text-navy">Mapa de Atividade</p>
          <div className="flex items-center gap-2">
            {isStaff && ligas.length > 0 && (
              <Select value={ligaId ?? ""} onValueChange={onLigaChange}>
                <SelectTrigger className="h-7 text-xs w-[140px]">
                  <SelectValue placeholder="Liga" />
                </SelectTrigger>
                <SelectContent>
                  {ligas.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={metrica} onValueChange={(v) => setMetrica(v as Metrica)}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encontros" className="text-xs">
                  Encontros
                </SelectItem>
                <SelectItem value="presencas" className="text-xs">
                  Presenças
                </SelectItem>
                <SelectItem value="pontos" className="text-xs">
                  Pontuação
                </SelectItem>
                <SelectItem value="membros" className="text-xs">
                  Membros
                </SelectItem>
              </SelectContent>
            </Select>
            {metrica !== "pontos" && metrica !== "membros" && (
              <div ref={periodoRef} className="flex items-center gap-0 relative">
                {/* Expanding options panel */}
                <div
                  className={cn(
                    "flex items-center gap-1 overflow-hidden transition-all duration-300 ease-in-out",
                    periodoPainelAberto
                      ? "max-w-[160px] opacity-100 mr-2"
                      : "max-w-0 opacity-0 mr-0",
                  )}
                >
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Últimos
                  </span>
                  {[7, 30, 90].map((dias) => (
                    <button
                      key={dias}
                      onClick={() => {
                        const p = diasParaPeriodo[dias];
                        if (p) setPeriodo(p);
                        setPeriodoPainelAberto(false);
                      }}
                      className={cn(
                        "text-[13px] font-semibold px-1 rounded transition-colors whitespace-nowrap",
                        periodoParaDias[periodo] === dias
                          ? "text-navy"
                          : "text-muted-foreground/50 hover:text-muted-foreground",
                      )}
                    >
                      {dias}
                    </button>
                  ))}
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">dias</span>
                </div>

                {/* Calendar icon button */}
                <button
                  onClick={() => setPeriodoPainelAberto((v) => !v)}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-md border transition-colors",
                    periodoPainelAberto
                      ? "border-navy/40 bg-navy/5 text-navy dark:border-white/30 dark:bg-white/10 dark:text-white"
                      : "border-border bg-transparent text-muted-foreground hover:text-navy hover:border-navy/30 dark:hover:text-white dark:hover:border-white/30",
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-muted-foreground mb-4">
          {metrica === "pontos"
            ? "Pontuação atual das ligas"
            : metrica === "membros"
              ? "Total de membros por liga"
              : `${metricaLabel[metrica]} — últimos ${periodoParaDias[periodo]} dias`}
        </p>

        {/* Chart */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Bars container */}
          <div className="flex-1 flex items-end gap-1 min-h-[140px]" style={{ height: 180 }}>
            {dataPoints.map((point, i) => {
              const heightPct = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
              const isHovered = hoveredIndex === i;
              const hasValue = point.value > 0;

              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-1 relative group"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                      <div className="bg-navy text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                        <p className="font-semibold">
                          {point.value} {metricaLabel[metrica].toLowerCase()}
                        </p>
                        <p className="text-white/70 mt-0.5">{point.fullLabel}</p>
                      </div>
                      <div className="w-2 h-2 bg-navy rotate-45 mx-auto -mt-1" />
                    </div>
                  )}
                  {/* Bar */}
                  <div
                    className={cn(
                      "w-full rounded-t transition-all duration-200",
                      hasValue ? (isHovered ? "bg-navy" : "bg-navy/40") : "bg-foreground/5",
                    )}
                    style={{ height: `${Math.max(heightPct, hasValue ? 4 : 2)}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Labels */}
          <div className="flex items-start gap-1 mt-2">
            {dataPoints.map((point, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 text-center text-[9px] text-muted-foreground truncate transition-colors",
                  hoveredIndex === i && "text-navy font-semibold",
                )}
              >
                {point.label}
              </div>
            ))}
          </div>
        </div>

        {/* Footer stats */}
        {metrica !== "pontos" && metrica !== "membros" && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-sm font-bold text-navy">
                {dataPoints.reduce((acc, d) => acc + d.value, 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Média</p>
              <p className="text-sm font-bold text-navy">
                {dataPoints.length
                  ? (dataPoints.reduce((acc, d) => acc + d.value, 0) / dataPoints.length).toFixed(1)
                  : "0"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Máximo</p>
              <p className="text-sm font-bold text-navy">
                {maxValue === 1 && dataPoints.every((d) => d.value === 0) ? 0 : maxValue}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
