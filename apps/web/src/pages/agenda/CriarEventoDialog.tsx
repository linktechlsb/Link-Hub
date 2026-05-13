import { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

import type { CategoriaEvento, Liga, Sala, UserRole } from "@link-leagues/types";

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

function formVazio(): EventoForm {
  const today = new Date();
  const data = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
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

const fieldCls =
  "w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded";
const selectCls = "w-full font-plex-sans text-[13px]";

export interface CriarEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ligas: Liga[];
  salas: Sala[];
  role: UserRole | null;
  usuarioId: string | null;
  onEventoCriado?: () => void | Promise<void>;
}

export function CriarEventoDialog({
  open,
  onOpenChange,
  ligas,
  salas,
  role,
  usuarioId,
  onEventoCriado,
}: CriarEventoDialogProps) {
  const [form, setForm] = useState<EventoForm>(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [eventoRecenteCriado, setEventoRecenteCriado] = useState<EventoCriadoData | null>(null);
  const [membrosLiga, setMembrosLiga] = useState<MembroLiga[]>([]);
  const [modoConvidados, setModoConvidados] = useState<"todos" | "selecionar">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const ligasDisponiveis = useMemo(
    () =>
      role === "diretor" && usuarioId
        ? ligas.filter((l) => l.diretores?.some((d) => d.id === usuarioId))
        : ligas,
    [role, ligas, usuarioId],
  );

  useEffect(() => {
    if (!open) return;
    const ligaPreSelecionada =
      role === "diretor" && ligasDisponiveis.length === 1 ? ligasDisponiveis[0]!.id : "";
    setForm({ ...formVazio(), liga_id: ligaPreSelecionada });
    setErro(null);
    setEventoRecenteCriado(null);
    setMembrosLiga([]);
    setModoConvidados("todos");
    setSelecionados(new Set());
  }, [open, role, ligasDisponiveis]);

  useEffect(() => {
    if (!eventoRecenteCriado) return;
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

  async function handleSalvar() {
    if (!form.titulo.trim() || !form.liga_id) return;
    setSalvando(true);
    setErro(null);
    try {
      const token = await getToken();
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
      if (onEventoCriado) await onEventoCriado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar evento");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-0 gap-0 overflow-hidden">
        <div className="h-px bg-foreground/20" />
        <DialogHeader className="px-8 pt-8 pb-6">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
            Novo
          </p>
          <DialogTitle className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
            Criar Evento
          </DialogTitle>
        </DialogHeader>
        <div className="h-px bg-foreground/[0.08]" />

        <div className="px-8 py-6 space-y-8 max-h-[60vh] overflow-y-auto">
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
                  <SelectTrigger className={selectCls}>
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
                    <SelectTrigger className={selectCls}>
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
                  <SelectTrigger className={selectCls}>
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
                  htmlFor="dlg-titulo"
                  className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                >
                  Título
                </label>
                <input
                  id="dlg-titulo"
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Nome do evento"
                  className={fieldCls}
                />
              </div>

              <div>
                <label
                  htmlFor="dlg-data"
                  className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                >
                  Data
                </label>
                <input
                  id="dlg-data"
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className={fieldCls}
                />
              </div>

              {precisaSala && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="dlg-inicio"
                        className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                      >
                        Horário início
                      </label>
                      <input
                        id="dlg-inicio"
                        type="time"
                        value={form.hora_inicio}
                        onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                        className={fieldCls}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="dlg-fim"
                        className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                      >
                        Horário fim
                      </label>
                      <input
                        id="dlg-fim"
                        type="time"
                        value={form.hora_fim}
                        onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
                        className={fieldCls}
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
                      <SelectTrigger className={selectCls}>
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

              {["evento", "hub"].includes(form.categoria) && (
                <p className="font-plex-mono text-[10px] tracking-[0.08em] text-amber-600">
                  Este evento requer aprovação do staff antes de ser publicado.
                </p>
              )}

              <div>
                <label
                  htmlFor="dlg-descricao"
                  className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block"
                >
                  Descrição (opcional)
                </label>
                <textarea
                  id="dlg-descricao"
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

        <div className="h-px bg-foreground/[0.08]" />
        <div className="px-8 py-6 flex flex-col gap-3">
          {eventoRecenteCriado ? (
            <button
              onClick={() => onOpenChange(false)}
              className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={() => void handleSalvar()}
                disabled={salvando || !form.titulo.trim() || !form.liga_id}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Criar evento"}
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
