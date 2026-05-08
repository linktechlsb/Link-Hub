import { ChevronLeft, ChevronRight } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type DayButton } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/pages/home/v1/primitives";

import type { Liga, Evento, UserRole, Sala, CategoriaEvento } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface EventoComLiga extends Evento {
  liga?: Liga;
}

const LEAGUE_PALETTE: { bg: string; text: string; dot: string }[] = [
  { bg: "bg-navy", text: "text-white", dot: "#10284E" },
  { bg: "bg-link-blue", text: "text-white", dot: "#546484" },
  { bg: "bg-blue-600", text: "text-white", dot: "#2563EB" },
  { bg: "bg-violet-600", text: "text-white", dot: "#7C3AED" },
  { bg: "bg-teal-600", text: "text-white", dot: "#0D9488" },
  { bg: "bg-rose-600", text: "text-white", dot: "#E11D48" },
  { bg: "bg-amber-500", text: "text-white", dot: "#F59E0B" },
  { bg: "bg-emerald-600", text: "text-white", dot: "#059669" },
];

const MESES = [
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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function dateToStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDateLabel(dateStr: string) {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  if (h === 0 && min === 0) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

interface EventoForm {
  liga_id: string;
  categoria: CategoriaEvento;
  titulo: string;
  descricao: string;
  data: string;
  sala_id: string;
  hora_inicio: string;
  hora_fim: string;
}

function formVazio(data: string): EventoForm {
  return {
    liga_id: "",
    categoria: "encontro",
    titulo: "",
    descricao: "",
    data,
    sala_id: "",
    hora_inicio: "",
    hora_fim: "",
  };
}

interface EventoCriadoData {
  titulo: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  ligaNome: string;
  categoria: string;
  liga_id: string;
}

interface MembroLiga {
  usuario_id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
}

function buildGoogleCalendarUrl(
  titulo: string,
  data: string,
  horaInicio: string,
  horaFim: string,
  ligaNome: string,
  categoria: string,
  convidadosEmails: string[] = [],
): string {
  const dateOnly = data.split("T")[0]!.replace(/-/g, "");
  const startTime = horaInicio ? horaInicio.replace(":", "") + "00" : "000000";
  const endTime = horaFim ? horaFim.replace(":", "") + "00" : "235900";
  const text = encodeURIComponent(titulo);
  const details = encodeURIComponent(`${ligaNome} - ${categoria}`);
  const addParam =
    convidadosEmails.length > 0 ? `&add=${encodeURIComponent(convidadosEmails.join(","))}` : "";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dateOnly}T${startTime}/${dateOnly}T${endTime}&details=${details}&location=Link+School+of+Business${addParam}`;
}

function GoogleCalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"
        fill="#4285F4"
      />
      <path d="M7 10h5v5H7z" fill="#34A853" />
      <path d="M12 10h5v2h-5z" fill="#FBBC05" />
      <path d="M12 13h5v2h-5z" fill="#EA4335" />
    </svg>
  );
}

// ── Calendar context ───────────────────────────────────────────────────────────
const AgendaCalendarContext = createContext<{
  eventosPorDia: Record<string, EventoComLiga[]>;
  ligaColorMap: Record<string, (typeof LEAGUE_PALETTE)[0]>;
}>({ eventosPorDia: {}, ligaColorMap: {} });

function AgendaDayButton({
  day,
  modifiers,
  className: _ignored,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const { eventosPorDia, ligaColorMap } = useContext(AgendaCalendarContext);
  const isOutside = modifiers.outside ?? false;

  if (isOutside) {
    return <button {...props} disabled className="w-full min-h-[88px]" aria-hidden />;
  }

  const dateStr = dateToStr(day.date);
  const isToday = modifiers.today ?? false;
  const isSelected = modifiers.selected ?? false;
  const dayEvents = eventosPorDia[dateStr] ?? [];

  return (
    <button
      {...props}
      className={cn(
        "w-full min-h-[88px] p-2 text-left transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-navy/30",
        isSelected ? "bg-navy/[0.04]" : "hover:bg-navy/[0.02]",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center w-7 h-7 text-sm mb-1 select-none font-plex-mono",
          isToday && "rounded-full bg-navy text-white font-bold",
          !isToday && isSelected && "text-navy font-bold",
          !isToday && !isSelected && "text-navy/70 font-medium",
        )}
      >
        {day.date.getDate()}
      </span>
      <div className="space-y-0.5">
        {dayEvents.slice(0, 2).map((evento) => {
          const color = ligaColorMap[evento.liga_id];
          return (
            <div
              key={evento.id}
              title={evento.titulo}
              className={cn(
                "relative text-[11px] px-1.5 py-0.5 truncate font-medium leading-snug",
                color?.bg ?? "bg-navy",
                color?.text ?? "text-white",
              )}
            >
              {evento.titulo}
              {evento.requer_aprovacao &&
                (evento.status_aprovacao === "pendente" ||
                  evento.status_aprovacao === "rejeitado") && (
                  <span
                    className={cn(
                      "absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-white/40",
                      evento.status_aprovacao === "pendente" ? "bg-brand-yellow" : "bg-rose-400",
                    )}
                  />
                )}
            </div>
          );
        })}
        {dayEvents.length > 2 && (
          <p className="text-[10px] text-navy/40 px-1 font-plex-mono">
            +{dayEvents.length - 2} mais
          </p>
        )}
      </div>
    </button>
  );
}

// ── Select helpers ─────────────────────────────────────────────────────────────
const triggerCls = "font-plex-sans text-[13px] w-auto";
const sheetTriggerCls = "w-full font-plex-sans text-[13px]";

// ── Page ───────────────────────────────────────────────────────────────────────
export function AgendaPage() {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [eventos, setEventos] = useState<EventoComLiga[]>([]);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvento, setSelectedEvento] = useState<EventoComLiga | null>(null);
  const [filterLiga, setFilterLiga] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  const [sheetAberto, setSheetAberto] = useState<"criar" | "editar" | null>(null);
  const [eventoEditando, setEventoEditando] = useState<EventoComLiga | null>(null);
  const [form, setForm] = useState<EventoForm>(formVazio(todayStr));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [confirmarDeletar, setConfirmarDeletar] = useState<EventoComLiga | null>(null);
  const [deletando, setDeletando] = useState(false);
  const [eventoRecenteCriado, setEventoRecenteCriado] = useState<EventoCriadoData | null>(null);
  const [membrosLiga, setMembrosLiga] = useState<MembroLiga[]>([]);
  const [modoConvidados, setModoConvidados] = useState<"todos" | "selecionar">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const ligaColorMap = useMemo(() => {
    const map: Record<string, (typeof LEAGUE_PALETTE)[0]> = {};
    ligas.forEach((liga, i) => {
      map[liga.id] = LEAGUE_PALETTE[i % LEAGUE_PALETTE.length]!;
    });
    return map;
  }, [ligas]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) return;
      const token = session.access_token;
      const [usuarioRes, meRes] = await Promise.all([
        supabase.from("usuarios").select("role").eq("email", session.user.email).single(),
        fetch("/api/usuarios/me", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setRole((usuarioRes.data?.role as UserRole) ?? "membro");
      if (meRes.ok) {
        const me = (await meRes.json()) as { id: string };
        setUsuarioId(me.id);
      }
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
    void carregar();
  }, [year, month, filterLiga]);

  const podeGerenciar = role === "staff" || role === "diretor";

  useEffect(() => {
    if (!podeGerenciar) return;
    async function carregarSalas() {
      const token = await getToken();
      const res = await fetch("/api/salas", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSalas(await res.json());
    }
    void carregarSalas();
  }, [podeGerenciar]);

  useEffect(() => {
    if (!eventoRecenteCriado) {
      setMembrosLiga([]);
      setModoConvidados("todos");
      setSelecionados(new Set());
      return;
    }
    async function carregarMembros(ligaId: string) {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{
        usuario_id: string;
        nome: string;
        email: string;
        avatar_url?: string | null;
      }>;
      setMembrosLiga(
        data
          .filter((m) => m.usuario_id !== usuarioId && m.email)
          .map((m) => ({
            usuario_id: m.usuario_id,
            nome: m.nome,
            email: m.email,
            avatar_url: m.avatar_url,
          })),
      );
    }
    void carregarMembros(eventoRecenteCriado.liga_id);
  }, [eventoRecenteCriado, usuarioId]);

  const ligasDisponiveis = useMemo(
    () =>
      role === "diretor" && usuarioId
        ? ligas.filter((l) => l.diretores?.some((d) => d.id === usuarioId))
        : ligas,
    [role, ligas, usuarioId],
  );

  function podeGerenciarEvento(evento: EventoComLiga): boolean {
    if (role === "staff") return true;
    if (role === "diretor") return ligasDisponiveis.some((l) => l.id === evento.liga_id);
    return false;
  }

  async function recarregarEventos(token: string) {
    const inicio = toDateStr(year, month, 1);
    const fim = toDateStr(year, month, getDaysInMonth(year, month));
    const ligaParam = filterLiga ? `&liga_id=${filterLiga}` : "";
    const res = await fetch(`/api/eventos?inicio=${inicio}&fim=${fim}${ligaParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setEventos(await res.json());
  }

  function abrirCriar() {
    const ligaPreSelecionada =
      role === "diretor" && ligasDisponiveis.length === 1 ? ligasDisponiveis[0]!.id : "";
    setForm({ ...formVazio(todayStr), liga_id: ligaPreSelecionada });
    setErro(null);
    setSheetAberto("criar");
  }

  function abrirEdicao(evento: EventoComLiga) {
    setEventoEditando(evento);
    setForm({
      liga_id: evento.liga_id,
      categoria: evento.categoria,
      titulo: evento.titulo,
      descricao: evento.descricao ?? "",
      data: evento.data.split("T")[0] ?? evento.data,
      sala_id: evento.sala_id ?? "",
      hora_inicio: evento.hora_inicio ?? "",
      hora_fim: evento.hora_fim ?? "",
    });
    setErro(null);
    setSheetAberto("editar");
  }

  async function handleSalvar() {
    if (!form.titulo.trim() || (sheetAberto === "criar" && !form.liga_id)) return;
    setSalvando(true);
    setErro(null);
    const precisaSala = ["encontro", "aula", "evento", "hub"].includes(form.categoria);
    try {
      const token = await getToken();
      if (sheetAberto === "criar") {
        const res = await fetch("/api/eventos", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            liga_id: form.liga_id,
            titulo: form.titulo,
            descricao: form.descricao || undefined,
            data: form.data,
            categoria: form.categoria,
            sala_id: precisaSala && form.sala_id ? form.sala_id : undefined,
            hora_inicio: precisaSala && form.hora_inicio ? form.hora_inicio : undefined,
            hora_fim: precisaSala && form.hora_fim ? form.hora_fim : undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Erro ao criar evento");
        }
        const ligaNome = ligas.find((l) => l.id === form.liga_id)?.nome ?? "";
        setEventoRecenteCriado({
          titulo: form.titulo,
          data: form.data,
          hora_inicio: precisaSala ? form.hora_inicio : "",
          hora_fim: precisaSala ? form.hora_fim : "",
          ligaNome,
          categoria: form.categoria,
          liga_id: form.liga_id,
        });
        await recarregarEventos(token);
      } else if (eventoEditando) {
        const res = await fetch(`/api/eventos/${eventoEditando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            titulo: form.titulo,
            descricao: form.descricao,
            data: form.data,
            categoria: form.categoria,
            sala_id: precisaSala && form.sala_id ? form.sala_id : "",
            hora_inicio: precisaSala && form.hora_inicio ? form.hora_inicio : "",
            hora_fim: precisaSala && form.hora_fim ? form.hora_fim : "",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Erro ao editar evento");
        }
        setSelectedEvento(null);
        setSheetAberto(null);
        await recarregarEventos(token);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSalvando(false);
    }
  }

  async function handleDeletarEvento() {
    if (!confirmarDeletar) return;
    setDeletando(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/eventos/${confirmarDeletar.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erro ao excluir evento");
      }
      setEventos((prev) => prev.filter((e) => e.id !== confirmarDeletar.id));
      if (selectedEvento?.id === confirmarDeletar.id) setSelectedEvento(null);
      setConfirmarDeletar(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir evento");
    } finally {
      setDeletando(false);
    }
  }

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

  const upcomingEventos = useMemo(
    () =>
      eventos
        .filter((e) => (e.data.split("T")[0] ?? "") >= todayStr)
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(0, 6),
    [eventos, todayStr],
  );

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return undefined;
    const parts = selectedDate.split("-").map(Number);
    return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
  }, [selectedDate]);

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

  const precisaSala = ["encontro", "aula", "evento", "hub"].includes(form.categoria);
  const salaSelecionada = salas.find((s) => s.id === form.sala_id);
  const alertaHorarioSala =
    salaSelecionada?.disponivel_a_partir &&
    form.hora_inicio &&
    form.hora_inicio < salaSelecionada.disponivel_a_partir
      ? `A sala ${salaSelecionada.nome} está disponível apenas a partir das ${salaSelecionada.disponivel_a_partir.slice(0, 5)}.`
      : null;

  // Sentinel values para Select (evita value="" vazio no Radix)
  const filterLigaVal = filterLiga || "__all";
  const formSalaVal = form.sala_id || "__none";
  const formLigaVal = form.liga_id || "__none";

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Sheet Criar / Editar */}
      <Sheet
        open={sheetAberto !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSheetAberto(null);
            setErro(null);
            setEventoRecenteCriado(null);
          }
        }}
      >
        <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                {sheetAberto === "criar" ? "Novo" : "Editar"}
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                {sheetAberto === "criar" ? "Criar Evento" : (eventoEditando?.titulo ?? "Evento")}
              </h2>
            </div>
            <div className="h-px bg-foreground/[0.08]" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            {eventoRecenteCriado ? (
              <div className="flex flex-col items-center gap-6 py-8">
                <p className="font-plex-sans text-[14px] font-medium text-foreground text-center">
                  Evento criado com sucesso!
                </p>
                <div className="w-full">
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                    Convidar membros
                  </label>
                  <Select
                    value={modoConvidados}
                    onValueChange={(v) => {
                      setModoConvidados(v as "todos" | "selecionar");
                      if (v === "todos") setSelecionados(new Set());
                    }}
                  >
                    <SelectTrigger className={sheetTriggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="font-plex-sans text-[13px]">
                        Todos os membros
                      </SelectItem>
                      <SelectItem value="selecionar" className="font-plex-sans text-[13px]">
                        Selecionar membros
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {modoConvidados === "selecionar" && (
                    <div className="mt-3 border border-border bg-muted/30 max-h-56 overflow-y-auto rounded">
                      {membrosLiga.length === 0 ? (
                        <p className="font-plex-sans text-[13px] text-foreground/50 px-3 py-3">
                          Nenhum membro disponível.
                        </p>
                      ) : (
                        membrosLiga.map((m) => {
                          const checked = selecionados.has(m.usuario_id);
                          return (
                            <label
                              key={m.usuario_id}
                              className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-b-0 cursor-pointer hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelecionados((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(m.usuario_id)) next.delete(m.usuario_id);
                                    else next.add(m.usuario_id);
                                    return next;
                                  })
                                }
                                className="accent-navy"
                              />
                              <div className="flex flex-col text-left flex-1 min-w-0">
                                <span className="font-plex-sans text-[13px] text-foreground truncate">
                                  {m.nome}
                                </span>
                                <span className="font-plex-mono text-[10px] text-foreground/50 truncate">
                                  {m.email}
                                </span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                  {modoConvidados === "selecionar" && membrosLiga.length > 0 && (
                    <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50 mt-2">
                      {selecionados.size} selecionado{selecionados.size === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    const emails =
                      modoConvidados === "todos"
                        ? membrosLiga.map((m) => m.email)
                        : membrosLiga
                            .filter((m) => selecionados.has(m.usuario_id))
                            .map((m) => m.email);
                    window.open(
                      buildGoogleCalendarUrl(
                        eventoRecenteCriado.titulo,
                        eventoRecenteCriado.data,
                        eventoRecenteCriado.hora_inicio,
                        eventoRecenteCriado.hora_fim,
                        eventoRecenteCriado.ligaNome,
                        eventoRecenteCriado.categoria,
                        emails,
                      ),
                      "_blank",
                    );
                  }}
                  className="border border-border rounded-full px-4 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors text-sm text-foreground cursor-pointer"
                >
                  <GoogleCalendarIcon />
                  Adicionar ao Google Calendar
                </button>
              </div>
            ) : (
              <>
                {sheetAberto === "criar" && (
                  <div>
                    <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                      Liga
                    </label>
                    {role === "diretor" && ligasDisponiveis.length === 1 ? (
                      <div className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 rounded">
                        {ligasDisponiveis[0]!.nome}
                      </div>
                    ) : (
                      <Select
                        value={formLigaVal}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, liga_id: v === "__none" ? "" : v }))
                        }
                      >
                        <SelectTrigger className={sheetTriggerCls}>
                          <SelectValue placeholder="Selecionar liga..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ligasDisponiveis.map((liga) => (
                            <SelectItem
                              key={liga.id}
                              value={liga.id}
                              className="font-plex-sans text-[13px]"
                            >
                              {liga.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                    Categoria
                  </label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        categoria: v as CategoriaEvento,
                        sala_id: "",
                        hora_inicio: "",
                        hora_fim: "",
                      }))
                    }
                  >
                    <SelectTrigger className={sheetTriggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="encontro" className="font-plex-sans text-[13px]">
                        Encontro
                      </SelectItem>
                      <SelectItem value="aula" className="font-plex-sans text-[13px]">
                        Aula
                      </SelectItem>
                      <SelectItem value="cowork" className="font-plex-sans text-[13px]">
                        Cowork
                      </SelectItem>
                      <SelectItem value="evento" className="font-plex-sans text-[13px]">
                        Evento
                      </SelectItem>
                      <SelectItem value="hub" className="font-plex-sans text-[13px]">
                        Hub
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="ev-titulo"
                    className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                  >
                    Título
                  </label>
                  <input
                    id="ev-titulo"
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Nome do evento"
                    className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ev-data"
                    className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                  >
                    Data
                  </label>
                  <input
                    id="ev-data"
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                    className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
                  />
                </div>

                {precisaSala && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="ev-inicio"
                          className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                        >
                          Horário início
                        </label>
                        <input
                          id="ev-inicio"
                          type="time"
                          value={form.hora_inicio}
                          onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                          className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="ev-fim"
                          className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                        >
                          Horário fim
                        </label>
                        <input
                          id="ev-fim"
                          type="time"
                          value={form.hora_fim}
                          onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
                          className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                        Sala
                      </label>
                      <Select
                        value={formSalaVal}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, sala_id: v === "__none" ? "" : v }))
                        }
                      >
                        <SelectTrigger className={sheetTriggerCls}>
                          <SelectValue placeholder="Selecionar sala..." />
                        </SelectTrigger>
                        <SelectContent>
                          {salas.map((sala) => (
                            <SelectItem
                              key={sala.id}
                              value={sala.id}
                              className="font-plex-sans text-[13px]"
                            >
                              {sala.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {alertaHorarioSala && (
                        <p className="font-plex-mono text-[10px] tracking-[0.08em] text-amber-600 mt-2">
                          {alertaHorarioSala}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {sheetAberto === "editar" &&
                  eventoEditando?.status_aprovacao === "aprovado" &&
                  ["evento", "hub"].includes(form.categoria) && (
                    <p className="font-plex-mono text-[10px] tracking-[0.08em] text-foreground/50">
                      Esta edição irá resubmeter o evento para aprovação do staff.
                    </p>
                  )}
                {["evento", "hub"].includes(form.categoria) && (
                  <p className="font-plex-mono text-[10px] tracking-[0.08em] text-amber-600">
                    Este evento requer aprovação do staff antes de ser publicado.
                  </p>
                )}

                <div>
                  <label
                    htmlFor="ev-descricao"
                    className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                  >
                    Descrição (opcional)
                  </label>
                  <textarea
                    id="ev-descricao"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Detalhes do evento..."
                    rows={3}
                    className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 resize-none rounded"
                  />
                </div>

                {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
              </>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/[0.08]" />
            <div className="px-8 py-6 flex flex-col gap-3">
              {eventoRecenteCriado ? (
                <button
                  onClick={() => {
                    setSheetAberto(null);
                    setEventoRecenteCriado(null);
                  }}
                  className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
                >
                  Fechar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => void handleSalvar()}
                    disabled={
                      salvando || !form.titulo.trim() || (sheetAberto === "criar" && !form.liga_id)
                    }
                    className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {salvando
                      ? "Salvando..."
                      : sheetAberto === "criar"
                        ? "Criar evento"
                        : "Salvar alterações"}
                  </button>
                  <button
                    onClick={() => {
                      setSheetAberto(null);
                      setErro(null);
                    }}
                    className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Exclusão */}
      {confirmarDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-foreground/20 w-full max-w-sm mx-4 rounded-lg overflow-hidden">
            <div className="px-8 py-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
                Confirmar
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                Excluir evento
              </h2>
            </div>
            <div className="h-px bg-foreground/15" />
            <div className="px-8 py-5">
              <p className="font-plex-sans text-[13px] text-foreground/70">
                Tem certeza que deseja excluir{" "}
                <span className="font-medium text-foreground">
                  &quot;{confirmarDeletar.titulo}&quot;
                </span>
                ? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="h-px bg-foreground/15" />
            <div className="px-8 py-6 flex gap-3">
              <button
                onClick={() => setConfirmarDeletar(null)}
                disabled={deletando}
                className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-4 py-3 rounded-full hover:bg-foreground hover:text-background transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleDeletarEvento()}
                disabled={deletando}
                className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-red-600 px-4 py-3 rounded-full hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {deletando ? "..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground">
            Agenda
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50 mt-1">
            Calendário · Link School of Business
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {podeGerenciar && (
            <button
              onClick={abrirCriar}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground hover:text-background transition-colors"
            >
              + Criar evento
            </button>
          )}
          <button
            onClick={goToToday}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground hover:text-background transition-colors"
          >
            Hoje
          </button>
          {ligas.length > 0 && (
            <Select
              value={filterLigaVal}
              onValueChange={(v) => {
                setFilterLiga(v === "__all" ? "" : v);
                setSelectedDate(null);
              }}
            >
              <SelectTrigger className={cn(triggerCls, "min-w-[160px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all" className="font-plex-sans text-[13px]">
                  Todas as ligas
                </SelectItem>
                {ligas.map((liga) => (
                  <SelectItem key={liga.id} value={liga.id} className="font-plex-sans text-[13px]">
                    {liga.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calendário */}
        <div className="xl:col-span-2 space-y-4">
          <div>
            {/* Navegação do mês */}
            <div className="h-px bg-foreground/90" />
            <div className="flex items-center justify-between py-4">
              <button
                onClick={prevMonth}
                className="p-2 text-foreground hover:bg-foreground/[0.04] rounded-full transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-display font-bold text-[18px] tracking-[-0.02em] text-foreground select-none">
                {MESES[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 text-foreground hover:bg-foreground/[0.04] rounded-full transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-foreground/15" />

            {/* Calendar shadcn */}
            <AgendaCalendarContext.Provider value={{ eventosPorDia, ligaColorMap }}>
              <Calendar
                mode="single"
                selected={selectedDateObj}
                onSelect={(date) => {
                  if (date) {
                    const s = dateToStr(date);
                    setSelectedDate(s === selectedDate ? null : s);
                  } else {
                    setSelectedDate(null);
                  }
                  setSelectedEvento(null);
                }}
                month={viewDate}
                onMonthChange={(date) => {
                  setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
                  setSelectedDate(null);
                  setSelectedEvento(null);
                }}
                showOutsideDays
                className="w-full p-0 bg-transparent"
                classNames={{
                  root: "w-full",
                  months: "w-full",
                  month: "w-full flex flex-col gap-0",
                  month_caption: "hidden",
                  nav: "hidden",
                  table: "w-full",
                  weekdays: "grid grid-cols-7 border-b border-navy/10 bg-navy/[0.02]",
                  weekday:
                    "py-2.5 text-center font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/50",
                  week: "grid grid-cols-7",
                  day: "group/day border-b border-r border-navy/10 [&:nth-child(7n)]:border-r-0",
                  today: "",
                  selected: "",
                  outside: "",
                  disabled: "",
                  hidden: "invisible",
                }}
                components={{ DayButton: AgendaDayButton }}
                formatters={{
                  formatWeekdayName: (weekday) => {
                    const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                    return names[weekday.getDay()] ?? "";
                  },
                }}
              />
            </AgendaCalendarContext.Provider>
          </div>

          {/* Legenda */}
          {ligas.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {ligas.map((liga) => {
                const color = ligaColorMap[liga.id];
                return (
                  <button
                    key={liga.id}
                    onClick={() => setFilterLiga(filterLiga === liga.id ? "" : liga.id)}
                    className={cn(
                      "flex items-center gap-2 font-plex-mono text-[10px] uppercase tracking-[0.12em] transition-opacity",
                      filterLiga && filterLiga !== liga.id ? "opacity-30" : "opacity-100",
                    )}
                  >
                    <span
                      className="w-2 h-2 flex-shrink-0"
                      style={{ backgroundColor: color?.dot ?? "#10284E" }}
                    />
                    <span className="text-navy/60 hover:text-navy transition-colors">
                      {liga.nome}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-8">
          {/* Eventos do dia selecionado */}
          {selectedDate && (
            <div>
              <div className="h-px bg-foreground/90" />
              <div className="flex items-start justify-between pt-4 pb-3">
                <div>
                  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50 capitalize">
                    {formatDateLabel(selectedDate)}
                  </p>
                  <p className="font-plex-mono text-[10px] text-foreground/40 mt-0.5">
                    {selectedDayEventos.length === 0
                      ? "Nenhum evento"
                      : `${selectedDayEventos.length} evento${selectedDayEventos.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedEvento(null);
                  }}
                  className="font-plex-mono text-[10px] text-foreground/40 hover:text-foreground transition-colors mt-0.5"
                >
                  ✕
                </button>
              </div>
              <div className="h-px bg-foreground/15" />

              {selectedDayEventos.length === 0 ? (
                <p className="font-plex-sans text-[13px] text-foreground/40 pt-4">
                  Nenhum evento neste dia.
                </p>
              ) : (
                <div>
                  {selectedDayEventos.map((evento) => {
                    const color = ligaColorMap[evento.liga_id];
                    const isOpen = selectedEvento?.id === evento.id;
                    const podeGerir = podeGerenciarEvento(evento);
                    return (
                      <div key={evento.id} className="border-b border-foreground/10 last:border-0">
                        <button
                          onClick={() => setSelectedEvento(isOpen ? null : evento)}
                          className={cn(
                            "w-full py-3 text-left transition-colors",
                            isOpen ? "bg-foreground/[0.03]" : "hover:bg-foreground/[0.02]",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-1.5 w-2 h-2 flex-shrink-0"
                              style={{ backgroundColor: color?.dot ?? "#10284E" }}
                            />
                            <div className="min-w-0">
                              <p className="font-plex-sans text-[13px] font-medium text-foreground truncate">
                                {evento.titulo}
                              </p>
                              <p className="font-plex-mono text-[10px] text-foreground/50 mt-0.5">
                                {evento.liga?.nome ?? "Liga"}
                                {formatTime(evento.data) && (
                                  <span className="ml-2">{formatTime(evento.data)}</span>
                                )}
                              </p>
                              {evento.requer_aprovacao &&
                                (evento.status_aprovacao === "pendente" ||
                                  evento.status_aprovacao === "rejeitado") && (
                                  <span
                                    className={cn(
                                      "inline-block font-plex-mono text-[9px] uppercase tracking-[0.12em] mt-1",
                                      evento.status_aprovacao === "pendente"
                                        ? "text-amber-600"
                                        : "text-red-600",
                                    )}
                                  >
                                    {evento.status_aprovacao}
                                  </span>
                                )}
                              {isOpen && evento.descricao && (
                                <p className="font-plex-sans text-[12px] text-foreground/60 mt-2 leading-relaxed border-t border-foreground/10 pt-2">
                                  {evento.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>

                        {isOpen && podeGerir && (
                          <div className="pl-5 pb-2">
                            <button
                              onClick={() =>
                                window.open(
                                  buildGoogleCalendarUrl(
                                    evento.titulo,
                                    evento.data.split("T")[0] ?? evento.data,
                                    evento.hora_inicio ?? "",
                                    evento.hora_fim ?? "",
                                    evento.liga?.nome ?? "",
                                    evento.categoria,
                                  ),
                                  "_blank",
                                )
                              }
                              className="border border-foreground/20 rounded-full px-4 py-2 flex items-center gap-2 hover:shadow-sm transition-shadow text-sm text-foreground cursor-pointer"
                            >
                              <GoogleCalendarIcon />
                              Adicionar ao Google Calendar
                            </button>
                          </div>
                        )}

                        {podeGerir && (
                          <div className="flex items-center gap-4 pb-3 pl-5">
                            <button
                              onClick={() => abrirEdicao(evento)}
                              className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmarDeletar(evento)}
                              className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-500 hover:text-red-700 transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Próximos eventos */}
          <div>
            <SectionHeader
              numero="01"
              eyebrow="Calendário"
              titulo="Próximos Eventos"
              tituloClassName="text-xs font-bold text-link-blue dark:text-white uppercase tracking-wider"
            />
            {loading ? (
              <p className="font-plex-sans text-[13px] text-foreground/50">Carregando...</p>
            ) : upcomingEventos.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-foreground/50">
                Nenhum evento próximo neste mês.
              </p>
            ) : (
              <div>
                {upcomingEventos.map((evento) => {
                  const color = ligaColorMap[evento.liga_id];
                  const rawDate = evento.data.includes("T")
                    ? evento.data
                    : `${evento.data}T00:00:00`;
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
                        const eventMonth = d.getUTCMonth();
                        const eventYear = d.getUTCFullYear();
                        if (eventMonth !== month || eventYear !== year) {
                          setViewDate(new Date(eventYear, eventMonth, 1));
                        }
                      }}
                      className="w-full flex items-center gap-4 py-3 border-b border-foreground/10 last:border-0 hover:bg-foreground/[0.02] transition-colors text-left"
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-10 h-10 flex flex-col items-center justify-center",
                          color?.bg ?? "bg-navy",
                        )}
                      >
                        <span className="text-white text-sm font-bold leading-none font-plex-mono">
                          {diaNum}
                        </span>
                        <span className="text-white/70 text-[9px] leading-none mt-0.5 font-plex-mono tracking-wide">
                          {mesAbrev}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-plex-sans text-[13px] font-medium text-foreground truncate">
                          {evento.titulo}
                        </p>
                        <p className="font-plex-mono text-[10px] text-foreground/50 mt-0.5 truncate">
                          {evento.liga?.nome ?? "Liga"}
                          {formatTime(evento.data) && ` · ${formatTime(evento.data)}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
