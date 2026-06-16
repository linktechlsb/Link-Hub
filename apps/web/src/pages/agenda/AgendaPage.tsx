import { CalendarDays, Clock, MapPin, Plus, SlidersHorizontal, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { formatHora } from "@/pages/home/components/eventCategorias";
import { HomeCalendarPanel } from "@/pages/home/components/HomeCalendarPanel";
import { StatStrip } from "@/pages/ligas/tabs/primitives";

import { CriarEventoDialog } from "./CriarEventoDialog";

import type { CategoriaEvento, Evento, Liga, Sala, UserRole } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

type EventoComLiga = Evento;

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

const sheetTriggerCls = "w-full font-plex-sans text-[13px]";

export function AgendaPage() {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [searchParams, setSearchParams] = useSearchParams();

  const [eventos, setEventos] = useState<EventoComLiga[]>([]);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [filterLiga, setFilterLiga] = useState<string>("");
  const [calendarKey, setCalendarKey] = useState(0);

  const [dialogCriarAberto, setDialogCriarAberto] = useState(false);
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
        const inicio = todayStr;
        const fimDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);
        const fim = toDateStr(fimDate.getFullYear(), fimDate.getMonth(), fimDate.getDate());
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
  }, [filterLiga]);

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
    if (searchParams.get("criar") === "true") {
      setDialogCriarAberto(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  function podeGerenciarEvento(evento: Evento): boolean {
    if (role === "staff") return true;
    // Diretor só altera Aula, Cowork e Encontro da própria liga.
    if (role === "diretor")
      return (
        ["aula", "cowork", "encontro"].includes(evento.categoria) &&
        ligasDisponiveis.some((l) => l.id === evento.liga_id)
      );
    return false;
  }

  async function recarregarEventos(token: string) {
    const inicio = todayStr;
    const fimDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    const fim = toDateStr(fimDate.getFullYear(), fimDate.getMonth(), fimDate.getDate());
    const ligaParam = filterLiga ? `&liga_id=${filterLiga}` : "";
    const res = await fetch(`/api/eventos?inicio=${inicio}&fim=${fim}${ligaParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setEventos(await res.json());
    setCalendarKey((k) => k + 1);
  }

  function abrirCriar() {
    const ligaPreSelecionada =
      role === "diretor" && ligasDisponiveis.length === 1 ? ligasDisponiveis[0]!.id : "";
    setForm({ ...formVazio(todayStr), liga_id: ligaPreSelecionada });
    setErro(null);
    setSheetAberto("criar");
  }

  function abrirEdicao(evento: Evento) {
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
      setConfirmarDeletar(null);
      setCalendarKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir evento");
    } finally {
      setDeletando(false);
    }
  }

  const precisaSala = ["encontro", "aula", "evento", "hub"].includes(form.categoria);
  const salaSelecionada = salas.find((s) => s.id === form.sala_id);
  const alertaHorarioSala =
    salaSelecionada?.disponivel_a_partir &&
    form.hora_inicio &&
    form.hora_inicio < salaSelecionada.disponivel_a_partir
      ? `A sala ${salaSelecionada.nome} está disponível apenas a partir das ${salaSelecionada.disponivel_a_partir.slice(0, 5)}.`
      : null;

  const formSalaVal = form.sala_id || "__none";
  const formLigaVal = form.liga_id || "__none";

  const thisMonthStr = toDateStr(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStr = toDateStr(today.getFullYear(), today.getMonth() + 1, 1);
  const eventosEsteMes = eventos.filter((e) => {
    const d = e.data.split("T")[0] ?? "";
    return d >= thisMonthStr && d < nextMonthStr;
  });

  const kpis = [
    { icon: CalendarDays, label: "Próximos eventos", value: String(eventos.length) },
    { icon: Clock, label: "Este mês", value: String(eventosEsteMes.length) },
    { icon: Users, label: "Ligas", value: String(ligas.length) },
    {
      icon: MapPin,
      label: "Eventos/Hub este mês",
      value: String(
        eventosEsteMes.filter((e) => e.categoria === "evento" || e.categoria === "hub").length,
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* CriarEventoDialog — acionado pelo atalho da home */}
      <CriarEventoDialog
        open={dialogCriarAberto}
        onOpenChange={setDialogCriarAberto}
        ligas={ligas}
        salas={salas}
        role={role}
        usuarioId={usuarioId}
        onEventoCriado={async () => {
          const t = await getToken();
          await recarregarEventos(t);
        }}
      />

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
                    className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy-600 px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed dark:bg-[#777777] dark:text-neutral-900"
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

      {/* AlertDialog Confirmar Exclusão */}
      <AlertDialog
        open={!!confirmarDeletar}
        onOpenChange={(open) => {
          if (!open) setConfirmarDeletar(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
              Confirmar
            </p>
            <AlertDialogTitle className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
              Excluir evento
            </AlertDialogTitle>
            <AlertDialogDescription className="font-plex-sans text-[13px] text-foreground/70">
              Tem certeza que deseja excluir{" "}
              <span className="font-medium text-foreground">
                &quot;{confirmarDeletar?.titulo}&quot;
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deletando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase border-foreground/40 rounded-full py-3 h-auto hover:bg-foreground hover:text-background transition-colors"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeletarEvento()}
              disabled={deletando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase bg-red-600 text-white rounded-full py-3 h-auto hover:bg-red-700 transition-colors"
            >
              {deletando ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Calendário</h1>
          <p className="mt-1 text-sm text-foreground/50">Eventos e encontros das ligas</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {ligas.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {filterLiga ? ligas.find((l) => l.id === filterLiga)?.nome : "Todas as ligas"}
                  {filterLiga && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuRadioGroup
                  value={filterLiga || "__all"}
                  onValueChange={(v) => setFilterLiga(v === "__all" ? "" : v)}
                >
                  <DropdownMenuRadioItem value="__all">Todas as ligas</DropdownMenuRadioItem>
                  {ligas.map((l) => (
                    <DropdownMenuRadioItem key={l.id} value={l.id}>
                      {l.nome}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {podeGerenciar && (
            <button
              onClick={abrirCriar}
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-transparent dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo evento
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <StatStrip items={kpis} />

        <div className="grid grid-cols-2 gap-4">
          {/* Calendário da Home */}
          <HomeCalendarPanel
            key={calendarKey}
            onEditarEvento={abrirEdicao}
            onDeletarEvento={(evento) => setConfirmarDeletar(evento)}
            podeEditarEvento={podeGerenciarEvento}
          />

          {/* Próximos eventos */}
          <DashboardCard className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-xs text-foreground/40">Próximos Eventos</h3>
              {!loading && (
                <span className="text-[10px] text-foreground/30">
                  {eventos.length} evento{eventos.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : eventos.length === 0 ? (
                <p className="p-5 text-sm text-foreground/50">Nenhum evento próximo.</p>
              ) : (
                <div>
                  {eventos.map((evento) => {
                    const rawDate = evento.data.includes("T")
                      ? evento.data
                      : `${evento.data}T00:00:00`;
                    const d = new Date(rawDate);
                    const diaNum = d.getUTCDate();
                    const mesAbrev = d
                      .toLocaleDateString("pt-BR", { month: "short" })
                      .replace(".", "")
                      .toUpperCase();
                    const podeGerir = podeGerenciarEvento(evento);
                    const hora = formatHora(evento.hora_inicio);

                    return (
                      <div
                        key={evento.id}
                        className="group flex items-center gap-3 border-b border-border px-5 py-3 last:border-0 hover:bg-foreground/[0.02] transition-colors"
                      >
                        <div className="flex-shrink-0 w-10 h-10 flex flex-col items-center justify-center rounded bg-foreground/[0.06] text-foreground">
                          <span className="text-sm font-bold leading-none font-display">
                            {diaNum}
                          </span>
                          <span className="text-[9px] leading-none mt-0.5 opacity-50 tracking-wide">
                            {mesAbrev}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {evento.titulo}
                          </p>
                          <p className="text-xs text-foreground/50 mt-0.5 truncate">
                            {[
                              evento.liga?.nome,
                              ...(evento.ligas_participantes?.map((l) => l.nome) ?? []),
                            ]
                              .filter(Boolean)
                              .join(" + ") || "Liga"}
                            {hora && ` · ${hora}`}
                          </p>
                          {evento.requer_aprovacao &&
                            (evento.status_aprovacao === "pendente" ||
                              evento.status_aprovacao === "rejeitado") && (
                              <span
                                className={cn(
                                  "inline-block text-[9px] font-plex-mono uppercase tracking-[0.12em] mt-0.5",
                                  evento.status_aprovacao === "pendente"
                                    ? "text-amber-600"
                                    : "text-red-600",
                                )}
                              >
                                {evento.status_aprovacao}
                              </span>
                            )}
                        </div>
                        {podeGerir && (
                          <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => abrirEdicao(evento)}
                              className="text-xs text-foreground/50 hover:text-foreground transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmarDeletar(evento)}
                              className="text-xs text-red-500 hover:text-red-700 transition-colors"
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
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
