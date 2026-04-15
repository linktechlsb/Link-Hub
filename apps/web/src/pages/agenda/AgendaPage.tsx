import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, X, Plus } from "lucide-react";
import type { Liga, Evento, UserRole } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface EventoComLiga extends Evento {
  liga?: Liga;
}

const LEAGUE_PALETTE: { bg: string; text: string; dot: string }[] = [
  { bg: "bg-navy",       text: "text-white", dot: "#10284E" },
  { bg: "bg-link-blue",  text: "text-white", dot: "#546484" },
  { bg: "bg-blue-600",   text: "text-white", dot: "#2563EB" },
  { bg: "bg-violet-600", text: "text-white", dot: "#7C3AED" },
  { bg: "bg-teal-600",   text: "text-white", dot: "#0D9488" },
  { bg: "bg-rose-600",   text: "text-white", dot: "#E11D48" },
  { bg: "bg-amber-500",  text: "text-white", dot: "#F59E0B" },
  { bg: "bg-emerald-600",text: "text-white", dot: "#059669" },
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function formatDateLabel(dateStr: string) {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  if (h === 0 && min === 0) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

interface NovoEventoForm {
  liga_id: string;
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
}

export function AgendaPage() {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [eventos, setEventos] = useState<EventoComLiga[]>([]);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvento, setSelectedEvento] = useState<EventoComLiga | null>(null);
  const [filterLiga, setFilterLiga] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [showCriarEvento, setShowCriarEvento] = useState(false);
  const [novoEvento, setNovoEvento] = useState<NovoEventoForm>({
    liga_id: "", titulo: "", descricao: "", data: todayStr, hora: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const ligaColorMap = useMemo(() => {
    const map: Record<string, typeof LEAGUE_PALETTE[0]> = {};
    ligas.forEach((liga, i) => {
      map[liga.id] = LEAGUE_PALETTE[i % LEAGUE_PALETTE.length]!;
    });
    return map;
  }, [ligas]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("role")
        .eq("email", session.user.email)
        .single();
      setRole((usuario?.role as UserRole) ?? "membro");
    });
  }, []);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const inicio = toDateStr(year, month, 1);
        const fim = toDateStr(year, month, getDaysInMonth(year, month));
        const ligaParam = filterLiga ? `&liga_id=${filterLiga}` : "";

        const [ligasRes, eventosRes] = await Promise.all([
          fetch("/api/ligas", { headers }),
          fetch(`/api/eventos?inicio=${inicio}&fim=${fim}${ligaParam}`, { headers }),
        ]);

        if (ligasRes.ok) setLigas(await ligasRes.json());
        if (eventosRes.ok) setEventos(await eventosRes.json());
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [year, month, filterLiga]);

  const podeGerenciar = role === "admin" || role === "diretor";

  async function handleCriarEvento(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroSalvar(null);
    try {
      const token = await getToken();
      const dataISO = novoEvento.hora
        ? `${novoEvento.data}T${novoEvento.hora}:00`
        : novoEvento.data;

      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          liga_id: novoEvento.liga_id,
          titulo: novoEvento.titulo,
          descricao: novoEvento.descricao || undefined,
          data: dataISO,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao criar evento");
      }

      setShowCriarEvento(false);
      setNovoEvento({ liga_id: "", titulo: "", descricao: "", data: todayStr, hora: "" });
      // Recarregar eventos do mês atual
      const inicio = toDateStr(year, month, 1);
      const fim = toDateStr(year, month, getDaysInMonth(year, month));
      const ligaParam = filterLiga ? `&liga_id=${filterLiga}` : "";
      const eventosRes = await fetch(
        `/api/eventos?inicio=${inicio}&fim=${fim}${ligaParam}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (eventosRes.ok) setEventos(await eventosRes.json());
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSalvando(false);
    }
  }

  // Montar grade do calendário
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Completar última linha com nulos para grid uniforme
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const eventosPorDia = useMemo(() => {
    const map: Record<string, EventoComLiga[]> = {};
    for (const evento of eventos) {
      const key = evento.data.split("T")[0]!;
      if (!map[key]) map[key] = [];
      map[key]!.push(evento);
    }
    return map;
  }, [eventos]);

  const selectedDayEventos = selectedDate ? (eventosPorDia[selectedDate] ?? []) : [];

  const upcomingEventos = useMemo(() =>
    eventos
      .filter(e => (e.data.split("T")[0] ?? "") >= todayStr)
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 6),
    [eventos, todayStr],
  );

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
    setSelectedEvento(null);
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
    setSelectedEvento(null);
  }
  function goToToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayStr);
    setSelectedEvento(null);
  }

  return (
    <div className="p-8">
      {/* Dialog Criar Evento */}
      {showCriarEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray">
              <h2 className="font-display font-bold text-base text-navy">Criar Evento</h2>
              <button
                onClick={() => { setShowCriarEvento(false); setErroSalvar(null); }}
                className="p-1 rounded-lg hover:bg-brand-gray text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarEvento} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Liga</label>
                <select
                  required
                  value={novoEvento.liga_id}
                  onChange={e => setNovoEvento(f => ({ ...f, liga_id: e.target.value }))}
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">Selecionar liga...</option>
                  {ligas.map(liga => (
                    <option key={liga.id} value={liga.id}>{liga.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Título</label>
                <input
                  required
                  type="text"
                  value={novoEvento.titulo}
                  onChange={e => setNovoEvento(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Nome do evento"
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Data</label>
                  <input
                    required
                    type="date"
                    value={novoEvento.data}
                    onChange={e => setNovoEvento(f => ({ ...f, data: e.target.value }))}
                    className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Horário (opcional)</label>
                  <input
                    type="time"
                    value={novoEvento.hora}
                    onChange={e => setNovoEvento(f => ({ ...f, hora: e.target.value }))}
                    className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Descrição (opcional)</label>
                <textarea
                  value={novoEvento.descricao}
                  onChange={e => setNovoEvento(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Detalhes do evento..."
                  rows={3}
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                />
              </div>

              {erroSalvar && (
                <p className="text-xs text-rose-600 font-medium">{erroSalvar}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCriarEvento(false); setErroSalvar(null); }}
                  className="text-sm px-4 py-2 rounded-lg border border-brand-gray text-navy hover:bg-brand-gray transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="text-sm px-4 py-2 rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors font-medium disabled:opacity-60"
                >
                  {salvando ? "Salvando..." : "Criar evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calendário de eventos e encontros das ligas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {podeGerenciar && (
            <button
              onClick={() => setShowCriarEvento(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Criar evento
            </button>
          )}
          <button
            onClick={goToToday}
            className="text-sm px-3 py-1.5 rounded-lg border border-brand-gray text-navy hover:bg-brand-gray transition-colors font-medium"
          >
            Hoje
          </button>
          {ligas.length > 0 && (
            <select
              value={filterLiga}
              onChange={e => { setFilterLiga(e.target.value); setSelectedDate(null); }}
              className="text-sm border border-brand-gray rounded-lg px-3 py-1.5 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 font-medium"
            >
              <option value="">Todas as ligas</option>
              {ligas.map(liga => (
                <option key={liga.id} value={liga.id}>{liga.nome}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna principal — calendário */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-brand-gray shadow-sm overflow-hidden">
            {/* Navegação do mês */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-brand-gray transition-colors text-navy"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-display font-bold text-lg text-navy select-none">
                {MESES[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-brand-gray transition-colors text-navy"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 border-b border-brand-gray bg-navy/[0.02]">
              {DIAS_SEMANA.map(dia => (
                <div
                  key={dia}
                  className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Grade de dias */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className={cn(
                        "min-h-[88px] border-b border-brand-gray/50 bg-gray-50/60",
                        (i + 1) % 7 !== 0 && "border-r",
                      )}
                    />
                  );
                }

                const dateStr = toDateStr(year, month, day);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayEvents = eventosPorDia[dateStr] ?? [];
                const isLastInRow = (i + 1) % 7 === 0;

                return (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDate(isSelected ? null : dateStr);
                      setSelectedEvento(null);
                    }}
                    className={cn(
                      "min-h-[88px] p-2 border-b border-brand-gray/50 text-left transition-all",
                      !isLastInRow && "border-r",
                      isSelected ? "bg-navy/[0.04]" : "hover:bg-brand-gray/40",
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1 select-none",
                      isToday && "bg-navy text-white font-bold",
                      !isToday && isSelected && "bg-link-blue/20 text-navy font-semibold",
                      !isToday && !isSelected && "text-navy font-medium",
                    )}>
                      {day}
                    </span>

                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(evento => {
                        const color = ligaColorMap[evento.liga_id];
                        return (
                          <div
                            key={evento.id}
                            title={evento.titulo}
                            className={cn(
                              "text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium leading-snug",
                              color?.bg ?? "bg-navy",
                              color?.text ?? "text-white",
                            )}
                          >
                            {evento.titulo}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <p className="text-[10px] text-muted-foreground px-1 font-medium">
                          +{dayEvents.length - 2} mais
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legenda de ligas */}
          {ligas.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
              {ligas.map(liga => {
                const color = ligaColorMap[liga.id];
                return (
                  <button
                    key={liga.id}
                    onClick={() => setFilterLiga(filterLiga === liga.id ? "" : liga.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-opacity",
                      filterLiga && filterLiga !== liga.id ? "opacity-40" : "opacity-100",
                    )}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color?.dot ?? "#10284E" }}
                    />
                    <span className="text-muted-foreground hover:text-navy">{liga.nome}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">
          {/* Eventos do dia selecionado */}
          {selectedDate && (
            <div className="bg-white rounded-2xl border border-brand-gray shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-gray flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-sm text-navy capitalize">
                    {formatDateLabel(selectedDate)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedDayEventos.length === 0
                      ? "Nenhum evento"
                      : `${selectedDayEventos.length} evento${selectedDayEventos.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedDate(null); setSelectedEvento(null); }}
                  className="mt-0.5 p-1 rounded-lg hover:bg-brand-gray text-muted-foreground transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-brand-gray/60">
                {selectedDayEventos.length === 0 ? (
                  <div className="px-5 py-10 flex flex-col items-center gap-2">
                    <Calendar className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
                  </div>
                ) : (
                  selectedDayEventos.map(evento => {
                    const color = ligaColorMap[evento.liga_id];
                    const isOpen = selectedEvento?.id === evento.id;
                    return (
                      <button
                        key={evento.id}
                        onClick={() => setSelectedEvento(isOpen ? null : evento)}
                        className={cn(
                          "w-full px-5 py-3.5 text-left transition-colors",
                          isOpen ? "bg-navy/[0.04]" : "hover:bg-brand-gray/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color?.dot ?? "#10284E" }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy truncate">
                              {evento.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {evento.liga?.nome ?? "Liga"}
                              {formatTime(evento.data) && (
                                <span className="ml-2 font-medium text-link-blue">
                                  {formatTime(evento.data)}
                                </span>
                              )}
                            </p>
                            {isOpen && evento.descricao && (
                              <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-brand-gray/60 pt-2">
                                {evento.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="bg-white rounded-2xl border border-brand-gray shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-gray">
              <h3 className="font-display font-bold text-sm text-navy">Próximos Eventos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">A partir de hoje neste mês</p>
            </div>

            <div className="divide-y divide-brand-gray/60">
              {loading ? (
                <div className="px-5 py-10 flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : upcomingEventos.length === 0 ? (
                <div className="px-5 py-10 flex flex-col items-center gap-2">
                  <Calendar className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhum evento próximo neste mês.
                  </p>
                </div>
              ) : (
                upcomingEventos.map(evento => {
                  const color = ligaColorMap[evento.liga_id];
                  const rawDate = evento.data.includes("T") ? evento.data : `${evento.data}T00:00:00`;
                  const d = new Date(rawDate);
                  const diaNum = d.getUTCDate();
                  const mesAbrev = d
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .replace(".", "")
                    .toUpperCase();

                  return (
                    <button
                      key={evento.id}
                      onClick={() => {
                        const dateKey = evento.data.split("T")[0]!;
                        setSelectedDate(dateKey);
                        setSelectedEvento(evento);
                        // Navegar para o mês do evento se necessário
                        const eventMonth = d.getUTCMonth();
                        const eventYear = d.getUTCFullYear();
                        if (eventMonth !== month || eventYear !== year) {
                          setViewDate(new Date(eventYear, eventMonth, 1));
                        }
                      }}
                      className="w-full px-5 py-3 flex items-center gap-4 hover:bg-brand-gray/30 transition-colors text-left"
                    >
                      <div className={cn(
                        "flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center",
                        color?.bg ?? "bg-navy",
                      )}>
                        <span className="text-white text-sm font-bold leading-none">{diaNum}</span>
                        <span className="text-white/70 text-[9px] leading-none mt-0.5 font-semibold tracking-wide">
                          {mesAbrev}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{evento.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {evento.liga?.nome ?? "Liga"}
                          {formatTime(evento.data) && ` · ${formatTime(evento.data)}`}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
