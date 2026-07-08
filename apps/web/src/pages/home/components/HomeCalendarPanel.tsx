import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type DayButton } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
const CalendarContext = createContext<{
  eventosPorDia: Record<string, EventoComLiga[]>;
  onEditarEvento?: (evento: Evento) => void;
  onDeletarEvento?: (evento: Evento) => void;
  podeEditarEvento?: (evento: Evento) => boolean;
}>({
  eventosPorDia: {},
});

function HomeDayButton({ day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const { eventosPorDia, onEditarEvento, onDeletarEvento, podeEditarEvento } =
    useContext(CalendarContext);
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
        "relative flex h-9 w-full flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        temEventos ? "cursor-pointer hover:bg-foreground/[0.08]" : "cursor-default",
        isToday ? "font-bold text-foreground" : "text-foreground/70",
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
          <span className="sr-only">
            {eventos.length} evento{eventos.length !== 1 ? "s" : ""} neste dia
          </span>
          {cores.map((cor, i) => (
            <span
              key={i}
              aria-hidden
              className="h-1 w-1 rounded-full"
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
          <p className="text-[11px] text-foreground/60">
            {eventos.length} evento{eventos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {eventos.map((evento) => {
            const horaIni = formatHora(evento.hora_inicio) || formatHora(evento.data);
            const horaFim = formatHora(evento.hora_fim);
            const horario = horaIni ? (horaFim ? `${horaIni} – ${horaFim}` : horaIni) : null;
            const editavel = (podeEditarEvento?.(evento) ?? false) && !!onEditarEvento;
            const deletavel = (podeEditarEvento?.(evento) ?? false) && !!onDeletarEvento;
            const temAcoes = editavel || deletavel;
            return (
              <div
                key={evento.id}
                className="group/ev flex items-start gap-2 border-b border-border px-3 py-2 last:border-0"
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: corCategoria(evento.categoria) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{evento.titulo}</p>
                  <p className="truncate text-[11px] text-foreground/60">
                    {[evento.liga?.nome, ...(evento.ligas_participantes?.map((l) => l.nome) ?? [])]
                      .filter(Boolean)
                      .join(" + ") || "Liga"}
                    {horario && <span className="ml-1.5 text-foreground/60">· {horario}</span>}
                  </p>
                </div>
                {temAcoes && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 rounded p-1 text-foreground/50 opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground focus:opacity-100 group-hover/ev:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Ações para ${evento.titulo}`}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      {editavel && (
                        <DropdownMenuItem
                          onClick={() => {
                            setOpen(false);
                            onEditarEvento!(evento);
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      {deletavel && (
                        <DropdownMenuItem
                          onClick={() => {
                            setOpen(false);
                            onDeletarEvento!(evento);
                          }}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Deletar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface HomeCalendarPanelProps {
  onEditarEvento?: (evento: Evento) => void;
  onDeletarEvento?: (evento: Evento) => void;
  podeEditarEvento?: (evento: Evento) => boolean;
}

export function HomeCalendarPanel({
  onEditarEvento,
  onDeletarEvento,
  podeEditarEvento,
}: HomeCalendarPanelProps = {}) {
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
    <DashboardCard className="flex h-[26rem] flex-col gap-4 p-5">
      {/* Header: título + navegação do mês */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground/70">Calendário</h3>
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
      <CalendarContext.Provider
        value={{ eventosPorDia, onEditarEvento, onDeletarEvento, podeEditarEvento }}
      >
        <Calendar
          mode="single"
          month={viewDate}
          onMonthChange={(d) => setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))}
          showOutsideDays
          fixedWeeks
          className="w-full bg-transparent p-0"
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full flex flex-col gap-2",
            month_caption: "hidden",
            nav: "hidden",
            weekdays: "grid grid-cols-7",
            weekday:
              "text-center text-[10px] font-medium uppercase tracking-wide text-foreground/50 pb-1",
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
            <span className="text-[11px] text-foreground/60">{CATEGORIA_EVENTO[cat].label}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
