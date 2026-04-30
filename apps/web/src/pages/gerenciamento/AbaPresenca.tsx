import { Loader2, Plus, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import type { StatusPresenca } from "@link-leagues/types";

interface Membro {
  id: string;
  usuario_id: string;
  nome: string;
  email: string;
}

interface EventoResumo {
  id: string;
  titulo: string;
  data: string;
}

interface PresencaLinha {
  id: string;
  evento_id: string;
  evento_titulo: string;
  evento_data: string;
  usuario_id: string;
  usuario_nome: string;
  status: StatusPresenca | null;
  justificativa: string | null;
}

interface Props {
  ligaId: string | null;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function formatarData(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_CONFIG: Record<StatusPresenca, { label: string; className: string }> = {
  presente: { label: "Presente", className: "bg-green-100 text-green-700" },
  ausente: { label: "Ausente", className: "bg-red-100 text-red-700" },
  justificado: { label: "Justificado", className: "bg-yellow-100 text-yellow-700" },
};

export function AbaPresenca({ ligaId }: Props) {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [eventos, setEventos] = useState<EventoResumo[]>([]);
  const [registros, setRegistros] = useState<PresencaLinha[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modoSheet, setModoSheet] = useState<"adicionar" | "editar" | null>(null);
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState<string | null>(null);
  const [statusPorMembro, setStatusPorMembro] = useState<
    Record<string, { status: StatusPresenca; justificativa: string }>
  >({});
  const [salvando, setSalvando] = useState(false);

  const eventosDeHoje = useMemo(
    () => eventos.filter((e) => e.data.slice(0, 10) === hojeISO()),
    [eventos],
  );
  const eventosPassados = useMemo(
    () => eventos.filter((e) => e.data.slice(0, 10) < hojeISO()),
    [eventos],
  );

  useEffect(() => {
    if (!ligaId) {
      setCarregando(false);
      return;
    }
    async function carregar() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [membrosRes, eventosRes, presencaRes] = await Promise.all([
          fetch(`/api/ligas/${ligaId}/membros`, { headers }),
          fetch(`/api/eventos?liga_id=${ligaId}`, { headers }),
          fetch(`/api/ligas/${ligaId}/presenca`, { headers }),
        ]);

        if (membrosRes.ok) {
          const data = (await membrosRes.json()) as Array<{
            id: string;
            usuario_id: string;
            nome: string;
            email: string;
          }>;
          setMembros(
            data.map((m) => ({
              id: m.id,
              usuario_id: m.usuario_id,
              nome: m.nome,
              email: m.email,
            })),
          );
        }
        if (eventosRes.ok) {
          const data = (await eventosRes.json()) as Array<{
            id: string;
            titulo: string;
            data: string;
          }>;
          setEventos(data.map((e) => ({ id: e.id, titulo: e.titulo, data: e.data })));
        }
        if (presencaRes.ok) {
          const data = (await presencaRes.json()) as PresencaLinha[];
          setRegistros(data);
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, [ligaId]);

  const matriz = useMemo(() => {
    const mapa = new Map<string, Map<string, PresencaLinha>>();
    for (const r of registros) {
      if (!r.usuario_id) continue;
      if (!mapa.has(r.usuario_id)) mapa.set(r.usuario_id, new Map());
      mapa.get(r.usuario_id)!.set(r.evento_id, r);
    }
    return mapa;
  }, [registros]);

  const eventosVisiveis = useMemo(
    () => [...eventos].sort((a, b) => a.data.localeCompare(b.data)).slice(-10),
    [eventos],
  );

  function abrirAdicionar() {
    if (eventosDeHoje.length === 0) {
      toast.info("Nenhum evento cadastrado para hoje.");
      return;
    }
    setModoSheet("adicionar");
    setEventoSelecionadoId(eventosDeHoje[0]!.id);
    setStatusPorMembro({});
  }

  function abrirEditar() {
    if (eventosPassados.length === 0) {
      toast.info("Nenhum evento passado disponível.");
      return;
    }
    const maisRecente = [...eventosPassados].sort((a, b) => b.data.localeCompare(a.data))[0]!;
    setModoSheet("editar");
    setEventoSelecionadoId(maisRecente.id);
  }

  useEffect(() => {
    if (!eventoSelecionadoId || !modoSheet) return;
    const inicial: Record<string, { status: StatusPresenca; justificativa: string }> = {};
    for (const m of membros) {
      const existente = matriz.get(m.usuario_id)?.get(eventoSelecionadoId);
      inicial[m.usuario_id] = {
        status: (existente?.status ?? "ausente") as StatusPresenca,
        justificativa: existente?.justificativa ?? "",
      };
    }
    setStatusPorMembro(inicial);
  }, [eventoSelecionadoId, modoSheet, membros, matriz]);

  async function salvar() {
    if (!eventoSelecionadoId) return;
    setSalvando(true);
    try {
      const token = await getToken();
      const payload = {
        evento_id: eventoSelecionadoId,
        registros: membros.map((m) => ({
          usuario_id: m.usuario_id,
          status: statusPorMembro[m.usuario_id]?.status ?? "ausente",
          justificativa: statusPorMembro[m.usuario_id]?.justificativa || undefined,
        })),
      };
      const res = await fetch("/api/presenca/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao salvar presença.");
        return;
      }
      const presencaRes = await fetch(`/api/ligas/${ligaId}/presenca`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (presencaRes.ok) setRegistros(await presencaRes.json());
      toast.success("Presença registrada.");
      setModoSheet(null);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando)
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando presença…</p>;

  return (
    <div className="space-y-6">
      {/* Cabeçalho + ações */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
            Controle de Presença
          </p>
          <p className="font-plex-sans text-[12px] text-navy/50 mt-0.5">
            {membros.length} membros · {eventosVisiveis.length} evento(s) exibido(s)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={abrirAdicionar}
            className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar presença
          </button>
          <span className="text-navy/20">|</span>
          <button
            onClick={abrirEditar}
            className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar presença
          </button>
        </div>
      </div>

      {/* Matriz membros × eventos */}
      <div className="border border-navy/15 overflow-hidden">
        {eventosVisiveis.length === 0 ? (
          <div className="p-6">
            <p className="font-plex-sans text-[13px] text-navy/50">
              Nenhum evento cadastrado. Crie eventos na página de Agenda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-navy/[0.02] border-b border-navy/15">
                  <th className="text-left font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 px-4 py-3 sticky left-0 bg-navy/[0.02] z-10">
                    Membro
                  </th>
                  {eventosVisiveis.map((e) => (
                    <th
                      key={e.id}
                      className="text-center font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 px-2 py-3 whitespace-nowrap"
                      title={e.titulo}
                    >
                      <div className="flex flex-col">
                        <span className="truncate max-w-[120px]">{e.titulo}</span>
                        <span className="font-plex-sans text-[10px] text-navy/40 font-normal mt-0.5">
                          {formatarData(e.data)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membros.length === 0 ? (
                  <tr>
                    <td
                      colSpan={eventosVisiveis.length + 1}
                      className="px-4 py-4 font-plex-sans text-[13px] text-navy/50 text-center"
                    >
                      Nenhum membro cadastrado.
                    </td>
                  </tr>
                ) : (
                  membros.map((m) => (
                    <tr key={m.usuario_id} className="border-b border-navy/10 last:border-0">
                      <td className="px-4 py-2.5 font-plex-sans text-[13px] font-medium text-navy whitespace-nowrap sticky left-0 bg-white">
                        {m.nome}
                      </td>
                      {eventosVisiveis.map((e) => {
                        const reg = matriz.get(m.usuario_id)?.get(e.id);
                        const status = reg?.status ?? null;
                        return (
                          <td key={e.id} className="px-2 py-2.5 text-center">
                            {status ? (
                              <span
                                className={cn(
                                  "inline-block font-plex-mono text-[9px] uppercase tracking-[0.10em] px-1.5 py-0.5",
                                  STATUS_CONFIG[status].className,
                                )}
                              >
                                {STATUS_CONFIG[status].label[0]}
                              </span>
                            ) : (
                              <span className="font-plex-sans text-[12px] text-navy/30">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sheet de registro */}
      <Sheet
        open={modoSheet !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setModoSheet(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-[480px] sm:w-[560px] flex flex-col gap-0 p-0 bg-white"
        >
          <div className="flex-shrink-0">
            <div className="h-px bg-navy/90" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50">
                {modoSheet === "adicionar" ? "Adicionar" : "Editar"}
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mt-1">
                {modoSheet === "adicionar" ? "Registrar presença" : "Editar presença"}
              </h2>
            </div>
            <div className="h-px bg-navy/15" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
                Evento
              </label>
              <select
                value={eventoSelecionadoId ?? ""}
                onChange={(e) => setEventoSelecionadoId(e.target.value)}
                className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60"
              >
                {(modoSheet === "adicionar" ? eventosDeHoje : eventosPassados).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo} · {formatarData(e.data)}
                  </option>
                ))}
              </select>
            </div>

            {eventoSelecionadoId && membros.length > 0 && (
              <div>
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
                  Membros
                </p>
                <div className="border-t border-navy/15">
                  {membros.map((m) => {
                    const atual = statusPorMembro[m.usuario_id] ?? {
                      status: "ausente" as StatusPresenca,
                      justificativa: "",
                    };
                    return (
                      <div key={m.usuario_id} className="border-b border-navy/10 py-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-plex-sans font-medium text-[13px] text-navy flex-1">
                            {m.nome}
                          </p>
                          <select
                            value={atual.status}
                            onChange={(e) =>
                              setStatusPorMembro((prev) => ({
                                ...prev,
                                [m.usuario_id]: {
                                  status: e.target.value as StatusPresenca,
                                  justificativa: prev[m.usuario_id]?.justificativa ?? "",
                                },
                              }))
                            }
                            className="border border-navy/20 px-2 py-1.5 bg-white font-plex-sans text-[12px] text-navy focus:outline-none focus:border-navy/60"
                          >
                            <option value="presente">Presente</option>
                            <option value="ausente">Ausente</option>
                            <option value="justificado">Justificado</option>
                          </select>
                        </div>
                        {atual.status === "justificado" && (
                          <input
                            type="text"
                            value={atual.justificativa}
                            onChange={(e) =>
                              setStatusPorMembro((prev) => ({
                                ...prev,
                                [m.usuario_id]: {
                                  status: prev[m.usuario_id]?.status ?? "ausente",
                                  justificativa: e.target.value,
                                },
                              }))
                            }
                            placeholder="Motivo da justificativa"
                            className="w-full border border-navy/20 px-3 py-2 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-navy/15" />
            <div className="px-8 py-6 flex gap-3">
              <button
                onClick={() => void salvar()}
                disabled={salvando || !eventoSelecionadoId || membros.length === 0}
                className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Salvar presença"
                )}
              </button>
              <button
                onClick={() => setModoSheet(null)}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy px-4 py-3 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
