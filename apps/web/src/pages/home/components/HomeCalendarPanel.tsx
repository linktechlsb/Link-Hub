import { ChevronLeft, ChevronRight } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type DayButton } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./DashboardCard";
import {
  CATEGORIA_EVENTO,
  corCategoria,
  dateToStr,
  formatHora,
  getDaysInMonth,
  MESES,
  toDateStr,
} from "./eventCategorias";

import type { CategoriaEvento, Evento } from "@link-leagues/types";

interface EventoComLiga extends Evento {
  liga?: { id: string; nome: string; sigla?: string };
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ── Context p/ o DayButton acessar os eventos do dia ────────────────────────
const CalendarContext = createContext<{ eventosPorDia: Record<string, EventoComLiga[]> }>({
  eventosPorDia: {},
});

function HomeDayButton({ day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const { eventosPorDia } = useContext(CalendarContext);
  const [open, setOpen] = useState(false);

  if (modifiers.outside) {
    return <button {...props} disabled className="h-9 w-full" aria-hidden />;
  }

  const dateStr = dateToStr(day.date);
  const eventos = eventosPorDia[dateStr] ?? [];
  const isToday = modifiers.today ?? false;
  const temEventos = eventos.length > 0;

  // Cores únicas das categorias presentes no dia (máx. 3 pontinhos)
  const cores = Array.from(new Set(eventos.map((e) => corCategoria(e.categoria)))).slice(0, 3);

  const cell = (
    <button
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        if (temEventos) setOpen(true);
      }}
      className={cn(
        "relative flex h-9 w-full flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors focus:outline-none",
        temEventos ? "cursor-pointer hover:bg-foreground/[0.08]" : "cursor-default",
        isToday ? "font-bold text-foreground" : "text-foreground/60",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full leading-none",
          isToday && "bg-brand-yellow text-[#1C1C1C]",
        )}
      >
        {day.date.getDate()}
      </span>
      {cores.length > 0 && (
        <span className="flex items-center gap-0.5">
          {cores.map((cor, i) => (
            <span
              key={i}
              className="h-1 w-1 animate-pulse rounded-full"
              style={{ backgroundColor: cor }}
            />
          ))}
        </span>
      )}
    </button>
  );

  if (!temEventos) return cell;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>{cell}</PopoverTrigger>
      <PopoverContent
        align="center"
        className="z-50 w-64 border-border bg-popover/95 p-0 text-popover-foreground backdrop-blur-md"
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold capitalize text-foreground">
            {day.date.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <p className="text-[10px] text-foreground/40">
            {eventos.length} evento{eventos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {eventos.map((evento) => {
            const horaIni = formatHora(evento.hora_inicio) || formatHora(evento.data);
            const horaFim = formatHora(evento.hora_fim);
            const horario = horaIni ? (horaFim ? `${horaIni} – ${horaFim}` : horaIni) : null;
            return (
              <div
                key={evento.id}
                className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-0"
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: corCategoria(evento.categoria) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{evento.titulo}</p>
                  <p className="truncate text-[10px] text-foreground/50">
                    {evento.liga?.nome ?? "Liga"}
                    {horario && <span className="ml-1.5 text-foreground/40">· {horario}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HomeCalendarPanel() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [eventos, setEventos] = useState<EventoComLiga[]>([]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      const token = await getToken();
      if (!token) return;
      const inicio = toDateStr(year, month, 1);
      const fim = toDateStr(year, month, getDaysInMonth(year, month));
      const res = await fetch(`/api/eventos?inicio=${inicio}&fim=${fim}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && !cancelado) setEventos(await res.json());
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, [year, month]);

  const eventosPorDia = useMemo(() => {
    const map: Record<string, EventoComLiga[]> = {};
    for (const evento of eventos) {
      const key = evento.data.split("T")[0]!;
      (map[key] ??= []).push(evento);
    }
    return map;
  }, [eventos]);

  return (
    <DashboardCard className="flex flex-col gap-4 p-5">
      {/* Header: título + navegação do mês */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-foreground/40">Calendário</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="rounded-md p-1 text-foreground/50 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[7.5rem] text-center text-xs font-medium text-foreground/70">
            {MESES[month]} {year}
          </span>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="rounded-md p-1 text-foreground/50 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendário */}
      <CalendarContext.Provider value={{ eventosPorDia }}>
        <Calendar
          mode="single"
          month={viewDate}
          onMonthChange={(d) => setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))}
          showOutsideDays
          className="w-full bg-transparent p-0"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full flex flex-col gap-2",
            month_caption: "hidden",
            nav: "hidden",
            weekdays: "grid grid-cols-7",
            weekday:
              "text-center text-[10px] font-medium uppercase tracking-wide text-foreground/30 pb-1",
            week: "grid grid-cols-7",
            day: "p-0",
            today: "",
            selected: "",
            outside: "",
            disabled: "",
            hidden: "invisible",
          }}
          components={{ DayButton: HomeDayButton }}
          formatters={{ formatWeekdayName: (weekday) => WEEKDAYS[weekday.getDay()] ?? "" }}
        />
      </CalendarContext.Provider>

      {/* Legenda de categorias */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border pt-3">
        {(Object.keys(CATEGORIA_EVENTO) as CategoriaEvento[]).map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CATEGORIA_EVENTO[cat].cor }}
            />
            <span className="text-[10px] text-foreground/40">{CATEGORIA_EVENTO[cat].label}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
