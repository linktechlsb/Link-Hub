import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

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

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
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

  // Sheet (criar / editar)
  const [sheetAberto, setSheetAberto] = useState<"criar" | "editar" | null>(null);
  const [eventoEditando, setEventoEditando] = useState<EventoComLiga | null>(null);
  const [form, setForm] = useState<EventoForm>(formVazio(todayStr));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Exclusão
  const [confirmarDeletar, setConfirmarDeletar] = useState<EventoComLiga | null>(null);
  const [deletando, setDeletando] = useState(false);

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
      }
      setSheetAberto(null);
      await recarregarEventos(token);
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

  // Grade do calendário
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
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

  const upcomingEventos = useMemo(
    () =>
      eventos
        .filter((e) => (e.data.split("T")[0] ?? "") >= todayStr)
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

  const precisaSala = ["encontro", "aula", "evento", "hub"].includes(form.categoria);

  const salasDisponiveis = salas;

  const salaSelecionada = salas.find((s) => s.id === form.sala_id);
  const alertaHorarioSala =
    salaSelecionada?.disponivel_a_partir &&
    form.hora_inicio &&
    form.hora_inicio < salaSelecionada.disponivel_a_partir
      ? `A sala ${salaSelecionada.nome} está disponível apenas a partir das ${salaSelecionada.disponivel_a_partir.slice(0, 5)}.`
      : null;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Sheet Criar / Editar */}
      <Sheet
        open={sheetAberto !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSheetAberto(null);
            setErro(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0 bg-white"
        >
          <div className="flex-shrink-0">
            <div className="h-px bg-navy/90" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
                {sheetAberto === "criar" ? "Novo" : "Editar"}
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                {sheetAberto === "criar" ? "Criar Evento" : (eventoEditando?.titulo ?? "Evento")}
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            {/* Liga — apenas ao criar */}
            {sheetAberto === "criar" && (
              <div>
                <label
                  htmlFor="ev-liga"
                  className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
                >
                  Liga
                </label>
                {role === "diretor" && ligasDisponiveis.length === 1 ? (
                  <div className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-navy/[0.03]">
                    {ligasDisponiveis[0]!.nome}
                  </div>
                ) : (
                  <select
                    id="ev-liga"
                    value={form.liga_id}
                    onChange={(e) => setForm((f) => ({ ...f, liga_id: e.target.value }))}
                    className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
                  >
                    <option value="">Selecionar liga...</option>
                    {ligasDisponiveis.map((liga) => (
                      <option key={liga.id} value={liga.id}>
                        {liga.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Categoria */}
            <div>
              <label
                htmlFor="ev-categoria"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Categoria
              </label>
              <select
                id="ev-categoria"
                value={form.categoria}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    categoria: e.target.value as CategoriaEvento,
                    sala_id: "",
                    hora_inicio: "",
                    hora_fim: "",
                  }))
                }
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
              >
                <option value="encontro">Encontro</option>
                <option value="aula">Aula</option>
                <option value="cowork">Cowork</option>
                <option value="evento">Evento</option>
                <option value="hub">Hub</option>
              </select>
            </div>

            {/* Título */}
            <div>
              <label
                htmlFor="ev-titulo"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Título
              </label>
              <input
                id="ev-titulo"
                type="text"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Nome do evento"
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
              />
            </div>

            {/* Data */}
            <div>
              <label
                htmlFor="ev-data"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Data
              </label>
              <input
                id="ev-data"
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
              />
            </div>

            {/* Horário + Sala */}
            {precisaSala && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="ev-inicio"
                      className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
                    >
                      Horário início
                    </label>
                    <input
                      id="ev-inicio"
                      type="time"
                      value={form.hora_inicio}
                      onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                      className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ev-fim"
                      className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
                    >
                      Horário fim
                    </label>
                    <input
                      id="ev-fim"
                      type="time"
                      value={form.hora_fim}
                      onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
                      className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="ev-sala"
                    className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
                  >
                    Sala
                  </label>
                  <select
                    id="ev-sala"
                    value={form.sala_id}
                    onChange={(e) => setForm((f) => ({ ...f, sala_id: e.target.value }))}
                    className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white focus:outline-none focus:border-navy/60"
                  >
                    <option value="">Selecionar sala...</option>
                    {salasDisponiveis.map((sala) => (
                      <option key={sala.id} value={sala.id}>
                        {sala.nome}
                      </option>
                    ))}
                  </select>
                  {alertaHorarioSala && (
                    <p className="font-plex-mono text-[10px] tracking-[0.08em] text-amber-600 mt-2">
                      {alertaHorarioSala}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Aviso resubmissão ao editar evento já aprovado */}
            {sheetAberto === "editar" &&
              eventoEditando?.status_aprovacao === "aprovado" &&
              ["evento", "hub"].includes(form.categoria) && (
                <p className="font-plex-mono text-[10px] tracking-[0.08em] text-navy/50">
                  Esta edição irá resubmeter o evento para aprovação do staff.
                </p>
              )}

            {/* Aviso aprovação */}
            {["evento", "hub"].includes(form.categoria) && (
              <p className="font-plex-mono text-[10px] tracking-[0.08em] text-amber-600">
                Este evento requer aprovação do staff antes de ser publicado.
              </p>
            )}

            {/* Descrição */}
            <div>
              <label
                htmlFor="ev-descricao"
                className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block"
              >
                Descrição (opcional)
              </label>
              <textarea
                id="ev-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes do evento..."
                rows={3}
                className="w-full font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2.5 bg-white placeholder:text-navy/30 focus:outline-none focus:border-navy/60 resize-none"
              />
            </div>

            {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-6">
              <button
                onClick={() => void handleSalvar()}
                disabled={
                  salvando || !form.titulo.trim() || (sheetAberto === "criar" && !form.liga_id)
                }
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando
                  ? "Salvando..."
                  : sheetAberto === "criar"
                    ? "Criar evento"
                    : "Salvar alterações"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Exclusão */}
      {confirmarDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white border border-navy/20 w-full max-w-sm mx-4">
            <div className="px-8 py-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
                Confirmar
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                Excluir evento
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-5">
              <p className="font-plex-sans text-[13px] text-navy/70">
                Tem certeza que deseja excluir{" "}
                <span className="font-medium text-navy">&quot;{confirmarDeletar.titulo}&quot;</span>
                ? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-6 flex gap-3">
              <button
                onClick={() => setConfirmarDeletar(null)}
                disabled={deletando}
                className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-4 py-3 hover:bg-navy hover:text-white transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleDeletarEvento()}
                disabled={deletando}
                className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-red-600 px-4 py-3 hover:bg-red-700 transition-colors disabled:opacity-40"
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
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Agenda
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
            Calendário · Link School of Business
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {podeGerenciar && (
            <button
              onClick={abrirCriar}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-2 hover:bg-navy/90 transition-colors"
            >
              + Criar evento
            </button>
          )}
          <button
            onClick={goToToday}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
          >
            Hoje
          </button>
          {ligas.length > 0 && (
            <select
              value={filterLiga}
              onChange={(e) => {
                setFilterLiga(e.target.value);
                setSelectedDate(null);
              }}
              className="font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-1.5 bg-white focus:outline-none focus:border-navy/60"
            >
              <option value="">Todas as ligas</option>
              {ligas.map((liga) => (
                <option key={liga.id} value={liga.id}>
                  {liga.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calendário */}
        <div className="xl:col-span-2 space-y-4">
          <div>
            {/* Navegação do mês */}
            <div className="h-px bg-navy/90" />
            <div className="flex items-center justify-between py-4">
              <button
                onClick={prevMonth}
                className="p-2 text-navy hover:bg-navy/[0.04] transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-display font-bold text-[18px] tracking-[-0.02em] text-navy select-none">
                {MESES[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 text-navy hover:bg-navy/[0.04] transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-navy/15" />

            {/* Dias da semana */}
            <div className="grid grid-cols-7 border-b border-navy/10 bg-navy/[0.02]">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="py-2.5 text-center font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/50"
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
                        "min-h-[88px] border-b border-navy/10",
                        (i + 1) % 7 !== 0 && "border-r border-navy/10",
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
                      "min-h-[88px] p-2 border-b border-navy/10 text-left transition-all",
                      !isLastInRow && "border-r border-navy/10",
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
                      {day}
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
                                    evento.status_aprovacao === "pendente"
                                      ? "bg-brand-yellow"
                                      : "bg-rose-400",
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
              })}
            </div>
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
              <div className="h-px bg-navy/90" />
              <div className="flex items-start justify-between pt-4 pb-3">
                <div>
                  <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 capitalize">
                    {formatDateLabel(selectedDate)}
                  </p>
                  <p className="font-plex-mono text-[10px] text-navy/40 mt-0.5">
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
                  className="font-plex-mono text-[10px] text-navy/40 hover:text-navy transition-colors mt-0.5"
                >
                  ✕
                </button>
              </div>
              <div className="h-px bg-navy/15" />

              {selectedDayEventos.length === 0 ? (
                <p className="font-plex-sans text-[13px] text-navy/40 pt-4">
                  Nenhum evento neste dia.
                </p>
              ) : (
                <div>
                  {selectedDayEventos.map((evento) => {
                    const color = ligaColorMap[evento.liga_id];
                    const isOpen = selectedEvento?.id === evento.id;
                    const podeGerir = podeGerenciarEvento(evento);
                    return (
                      <div key={evento.id} className="border-b border-navy/10 last:border-0">
                        <button
                          onClick={() => setSelectedEvento(isOpen ? null : evento)}
                          className={cn(
                            "w-full py-3 text-left transition-colors",
                            isOpen ? "bg-navy/[0.03]" : "hover:bg-navy/[0.02]",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-1.5 w-2 h-2 flex-shrink-0"
                              style={{ backgroundColor: color?.dot ?? "#10284E" }}
                            />
                            <div className="min-w-0">
                              <p className="font-plex-sans text-[13px] font-medium text-navy truncate">
                                {evento.titulo}
                              </p>
                              <p className="font-plex-mono text-[10px] text-navy/50 mt-0.5">
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
                                <p className="font-plex-sans text-[12px] text-navy/60 mt-2 leading-relaxed border-t border-navy/10 pt-2">
                                  {evento.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>

                        {podeGerir && (
                          <div className="flex items-center gap-4 pb-3 pl-5">
                            <button
                              onClick={() => abrirEdicao(evento)}
                              className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/50 hover:text-navy transition-colors"
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
            <SectionHeader numero="01" eyebrow="Calendário" titulo="Próximos Eventos" />
            {loading ? (
              <p className="font-plex-sans text-[13px] text-navy/50">Carregando...</p>
            ) : upcomingEventos.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-navy/50">
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
                      className="w-full flex items-center gap-4 py-3 border-b border-navy/10 last:border-0 hover:bg-navy/[0.02] transition-colors text-left"
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
                        <p className="font-plex-sans text-[13px] font-medium text-navy truncate">
                          {evento.titulo}
                        </p>
                        <p className="font-plex-mono text-[10px] text-navy/50 mt-0.5 truncate">
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
