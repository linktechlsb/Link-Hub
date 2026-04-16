import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, X, Plus, Pencil, Trash2 } from "lucide-react";
import type { Liga, Evento, UserRole, Sala, CategoriaEvento } from "@link-leagues/types";
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
  return { liga_id: "", categoria: "encontro", titulo: "", descricao: "", data, sala_id: "", hora_inicio: "", hora_fim: "" };
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

  // Criar evento
  const [showCriarEvento, setShowCriarEvento] = useState(false);
  const [novoEvento, setNovoEvento] = useState<EventoForm>(formVazio(todayStr));
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  // Editar evento
  const [showEditarEvento, setShowEditarEvento] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoComLiga | null>(null);
  const [editarForm, setEditarForm] = useState<EventoForm>(formVazio(todayStr));
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Excluir evento
  const [confirmarDeletar, setConfirmarDeletar] = useState<EventoComLiga | null>(null);
  const [deletando, setDeletando] = useState(false);

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
      const token = session.access_token;

      const [usuarioRes, meRes] = await Promise.all([
        supabase.from("usuarios").select("role").eq("email", session.user.email).single(),
        fetch("/api/usuarios/me", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setRole((usuarioRes.data?.role as UserRole) ?? "membro");
      if (meRes.ok) {
        const me = await meRes.json() as { id: string };
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
    carregar();
  }, [year, month, filterLiga]);

  const podeGerenciar = role === "staff" || role === "diretor";

  useEffect(() => {
    if (!podeGerenciar) return;
    async function carregarSalas() {
      const token = await getToken();
      const res = await fetch("/api/salas", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSalas(await res.json());
    }
    carregarSalas();
  }, [podeGerenciar]);

  // Ligas disponíveis para criar eventos: staff vê todas, diretor vê só a sua
  const ligasDisponiveis = useMemo(() =>
    role === "diretor" && usuarioId
      ? ligas.filter(l => l.lider_id === usuarioId)
      : ligas,
    [role, ligas, usuarioId],
  );

  function podeGerenciarEvento(evento: EventoComLiga): boolean {
    if (role === "staff") return true;
    if (role === "diretor") return ligasDisponiveis.some(l => l.id === evento.liga_id);
    return false;
  }

  async function recarregarEventos(token: string) {
    const inicio = toDateStr(year, month, 1);
    const fim = toDateStr(year, month, getDaysInMonth(year, month));
    const ligaParam = filterLiga ? `&liga_id=${filterLiga}` : "";
    const res = await fetch(
      `/api/eventos?inicio=${inicio}&fim=${fim}${ligaParam}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setEventos(await res.json());
  }

  async function handleCriarEvento(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroSalvar(null);

    const precisaSala = ["encontro", "aula", "evento", "hub"].includes(novoEvento.categoria);

    try {
      const token = await getToken();
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: novoEvento.liga_id,
          titulo: novoEvento.titulo,
          descricao: novoEvento.descricao || undefined,
          data: novoEvento.data,
          categoria: novoEvento.categoria,
          sala_id: precisaSala && novoEvento.sala_id ? novoEvento.sala_id : undefined,
          hora_inicio: precisaSala && novoEvento.hora_inicio ? novoEvento.hora_inicio : undefined,
          hora_fim: precisaSala && novoEvento.hora_fim ? novoEvento.hora_fim : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erro ao criar evento");
      }

      setShowCriarEvento(false);
      setNovoEvento(formVazio(todayStr));
      await recarregarEventos(token);
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSalvando(false);
    }
  }

  function abrirEdicao(evento: EventoComLiga) {
    setEventoEditando(evento);
    setEditarForm({
      liga_id: evento.liga_id,
      categoria: evento.categoria,
      titulo: evento.titulo,
      descricao: evento.descricao ?? "",
      data: evento.data.split("T")[0] ?? evento.data,
      sala_id: evento.sala_id ?? "",
      hora_inicio: evento.hora_inicio ?? "",
      hora_fim: evento.hora_fim ?? "",
    });
    setErroEdicao(null);
    setShowEditarEvento(true);
  }

  async function handleEditarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!eventoEditando) return;
    setSalvandoEdicao(true);
    setErroEdicao(null);

    const precisaSala = ["encontro", "aula", "evento", "hub"].includes(editarForm.categoria);

    try {
      const token = await getToken();
      const res = await fetch(`/api/eventos/${eventoEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          titulo: editarForm.titulo,
          descricao: editarForm.descricao,
          data: editarForm.data,
          categoria: editarForm.categoria,
          sala_id: precisaSala && editarForm.sala_id ? editarForm.sala_id : "",
          hora_inicio: precisaSala && editarForm.hora_inicio ? editarForm.hora_inicio : "",
          hora_fim: precisaSala && editarForm.hora_fim ? editarForm.hora_fim : "",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erro ao editar evento");
      }

      setShowEditarEvento(false);
      setEventoEditando(null);
      setSelectedEvento(null);
      await recarregarEventos(token);
    } catch (err) {
      setErroEdicao(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSalvandoEdicao(false);
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

      setEventos(prev => prev.filter(e => e.id !== confirmarDeletar.id));
      if (selectedEvento?.id === confirmarDeletar.id) setSelectedEvento(null);
      setConfirmarDeletar(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir evento");
    } finally {
      setDeletando(false);
    }
  }

  // Montar grade do calendário
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

            <form onSubmit={handleCriarEvento} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Liga */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Liga</label>
                <select
                  required
                  value={novoEvento.liga_id}
                  onChange={e => setNovoEvento(f => ({ ...f, liga_id: e.target.value }))}
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">Selecionar liga...</option>
                  {ligasDisponiveis.map(liga => (
                    <option key={liga.id} value={liga.id}>{liga.nome}</option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Categoria</label>
                <select
                  required
                  value={novoEvento.categoria}
                  onChange={e => setNovoEvento(f => ({
                    ...f, categoria: e.target.value as CategoriaEvento,
                    sala_id: "", hora_inicio: "", hora_fim: "",
                  }))}
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
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

              {/* Data */}
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

              {/* Sala + Horário */}
              {["encontro", "aula", "evento", "hub"].includes(novoEvento.categoria) && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">Sala</label>
                    <select
                      value={novoEvento.sala_id}
                      onChange={e => setNovoEvento(f => ({ ...f, sala_id: e.target.value }))}
                      className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                    >
                      <option value="">Selecionar sala...</option>
                      {salas.map(sala => (
                        <option key={sala.id} value={sala.id}>{sala.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1">Horário início</label>
                      <input
                        type="time"
                        value={novoEvento.hora_inicio}
                        onChange={e => setNovoEvento(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1">Horário fim</label>
                      <input
                        type="time"
                        value={novoEvento.hora_fim}
                        onChange={e => setNovoEvento(f => ({ ...f, hora_fim: e.target.value }))}
                        className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Aviso de aprovação */}
              {["evento", "hub"].includes(novoEvento.categoria) && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-yellow/15 border border-brand-yellow/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow flex-shrink-0" />
                  <p className="text-xs text-navy/80 font-medium">
                    Este evento requer aprovação do staff antes de ser publicado.
                  </p>
                </div>
              )}

              {/* Descrição */}
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

      {/* Dialog Editar Evento */}
      {showEditarEvento && eventoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray">
              <h2 className="font-display font-bold text-base text-navy">Editar Evento</h2>
              <button
                onClick={() => { setShowEditarEvento(false); setErroEdicao(null); }}
                className="p-1 rounded-lg hover:bg-brand-gray text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditarEvento} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Categoria</label>
                <select
                  required
                  value={editarForm.categoria}
                  onChange={e => setEditarForm(f => ({
                    ...f, categoria: e.target.value as CategoriaEvento,
                    sala_id: "", hora_inicio: "", hora_fim: "",
                  }))}
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
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
                <label className="block text-xs font-semibold text-navy mb-1">Título</label>
                <input
                  required
                  type="text"
                  value={editarForm.titulo}
                  onChange={e => setEditarForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Nome do evento"
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Data</label>
                <input
                  required
                  type="date"
                  value={editarForm.data}
                  onChange={e => setEditarForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              {/* Sala + Horário */}
              {["encontro", "aula", "evento", "hub"].includes(editarForm.categoria) && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">Sala</label>
                    <select
                      value={editarForm.sala_id}
                      onChange={e => setEditarForm(f => ({ ...f, sala_id: e.target.value }))}
                      className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                    >
                      <option value="">Selecionar sala...</option>
                      {salas.map(sala => (
                        <option key={sala.id} value={sala.id}>{sala.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1">Horário início</label>
                      <input
                        type="time"
                        value={editarForm.hora_inicio}
                        onChange={e => setEditarForm(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1">Horário fim</label>
                      <input
                        type="time"
                        value={editarForm.hora_fim}
                        onChange={e => setEditarForm(f => ({ ...f, hora_fim: e.target.value }))}
                        className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Aviso de re-submissão para eventos já aprovados */}
              {eventoEditando.status_aprovacao === "aprovado" &&
                ["evento", "hub"].includes(editarForm.categoria) && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">
                    Esta edição irá resubmeter o evento para aprovação do staff.
                  </p>
                </div>
              )}

              {/* Aviso de aprovação */}
              {["evento", "hub"].includes(editarForm.categoria) && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-yellow/15 border border-brand-yellow/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow flex-shrink-0" />
                  <p className="text-xs text-navy/80 font-medium">
                    Este evento requer aprovação do staff antes de ser publicado.
                  </p>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Descrição (opcional)</label>
                <textarea
                  value={editarForm.descricao}
                  onChange={e => setEditarForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Detalhes do evento..."
                  rows={3}
                  className="w-full text-sm border border-brand-gray rounded-lg px-3 py-2 text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                />
              </div>

              {erroEdicao && (
                <p className="text-xs text-rose-600 font-medium">{erroEdicao}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowEditarEvento(false); setErroEdicao(null); }}
                  className="text-sm px-4 py-2 rounded-lg border border-brand-gray text-navy hover:bg-brand-gray transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="text-sm px-4 py-2 rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors font-medium disabled:opacity-60"
                >
                  {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Confirmar Exclusão */}
      {confirmarDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-5">
              <h2 className="font-display font-bold text-base text-navy mb-1">Excluir evento</h2>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir{" "}
                <span className="font-semibold text-navy">"{confirmarDeletar.titulo}"</span>?
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                onClick={() => setConfirmarDeletar(null)}
                disabled={deletando}
                className="text-sm px-4 py-2 rounded-lg border border-brand-gray text-navy hover:bg-brand-gray transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletarEvento}
                disabled={deletando}
                className="text-sm px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors font-medium disabled:opacity-60"
              >
                {deletando ? "Excluindo..." : "Excluir"}
              </button>
            </div>
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
                              "relative text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium leading-snug",
                              color?.bg ?? "bg-navy",
                              color?.text ?? "text-white",
                            )}
                          >
                            {evento.titulo}
                            {evento.requer_aprovacao &&
                              (evento.status_aprovacao === "pendente" || evento.status_aprovacao === "rejeitado") && (
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
                    const podeGerir = podeGerenciarEvento(evento);
                    return (
                      <div key={evento.id}>
                        <button
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
                              {evento.requer_aprovacao &&
                                (evento.status_aprovacao === "pendente" || evento.status_aprovacao === "rejeitado") && (
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1",
                                  evento.status_aprovacao === "pendente"
                                    ? "bg-brand-yellow/20 text-amber-700"
                                    : "bg-rose-100 text-rose-700",
                                )}>
                                  <span className="w-1 h-1 rounded-full bg-current" />
                                  {evento.status_aprovacao === "pendente" ? "pendente" : "rejeitado"}
                                </span>
                              )}
                              {isOpen && evento.descricao && (
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-brand-gray/60 pt-2">
                                  {evento.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Ações de editar/excluir */}
                        {podeGerir && (
                          <div className="flex items-center gap-1 px-5 pb-2.5 -mt-1">
                            <button
                              onClick={() => abrirEdicao(evento)}
                              className="flex items-center gap-1 text-xs text-link-blue hover:text-navy px-2 py-1 rounded-md hover:bg-brand-gray transition-colors font-medium"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmarDeletar(evento)}
                              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors font-medium"
                            >
                              <Trash2 className="w-3 h-3" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
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
