import { ChevronDown, Loader2, Plus, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const [modoModal, setModoModal] = useState<"adicionar" | "editar" | null>(null);
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
    setModoModal("adicionar");
    setEventoSelecionadoId(eventosDeHoje[0]!.id);
    setStatusPorMembro({});
  }

  function abrirEditar() {
    if (eventosPassados.length === 0) {
      toast.info("Nenhum evento passado disponível.");
      return;
    }
    const maisRecente = [...eventosPassados].sort((a, b) => b.data.localeCompare(a.data))[0]!;
    setModoModal("editar");
    setEventoSelecionadoId(maisRecente.id);
  }

  useEffect(() => {
    if (!eventoSelecionadoId || !modoModal) return;
    const inicial: Record<string, { status: StatusPresenca; justificativa: string }> = {};
    for (const m of membros) {
      const existente = matriz.get(m.usuario_id)?.get(eventoSelecionadoId);
      inicial[m.usuario_id] = {
        status: (existente?.status ?? "ausente") as StatusPresenca,
        justificativa: existente?.justificativa ?? "",
      };
    }
    setStatusPorMembro(inicial);
  }, [eventoSelecionadoId, modoModal, membros, matriz]);

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
      setModoModal(null);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-muted-foreground">Carregando presença…</p>;

  return (
    <div className="space-y-4">
      {/* Cabeçalho + dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
            Controle de Presença
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {membros.length} membros · {eventosVisiveis.length} evento(s) exibido(s)
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="bg-navy hover:bg-navy/90">
              Registrar
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={abrirAdicionar}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar presença
            </DropdownMenuItem>
            <DropdownMenuItem onClick={abrirEditar}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar presença
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Matriz membros × eventos */}
      <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
        {eventosVisiveis.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Nenhum evento cadastrado. Crie eventos na página de Agenda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-gray/50 border-b border-brand-gray">
                  <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-4 py-2 sticky left-0 bg-brand-gray/50 z-10">
                    Membro
                  </th>
                  {eventosVisiveis.map((e) => (
                    <th
                      key={e.id}
                      className="text-center text-xs font-bold text-link-blue uppercase tracking-wider px-2 py-2 whitespace-nowrap"
                      title={e.titulo}
                    >
                      <div className="flex flex-col">
                        <span className="truncate max-w-[120px]">{e.titulo}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
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
                      className="px-4 py-4 text-sm text-muted-foreground text-center"
                    >
                      Nenhum membro cadastrado.
                    </td>
                  </tr>
                ) : (
                  membros.map((m) => (
                    <tr key={m.usuario_id} className="border-b border-brand-gray last:border-0">
                      <td className="px-4 py-2 text-sm font-medium text-navy whitespace-nowrap sticky left-0 bg-white">
                        {m.nome}
                      </td>
                      {eventosVisiveis.map((e) => {
                        const reg = matriz.get(m.usuario_id)?.get(e.id);
                        const status = reg?.status ?? null;
                        return (
                          <td key={e.id} className="px-2 py-2 text-center">
                            {status ? (
                              <span
                                className={cn(
                                  "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full",
                                  STATUS_CONFIG[status].className,
                                )}
                              >
                                {STATUS_CONFIG[status].label[0]}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
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

      {/* Modal de registro */}
      <Dialog
        open={modoModal !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setModoModal(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modoModal === "adicionar" ? "Adicionar presença" : "Editar presença"}
            </DialogTitle>
            <DialogDescription>
              {modoModal === "adicionar"
                ? "Selecione o evento de hoje e marque a presença de cada membro."
                : "Selecione um evento passado para ajustar a presença de cada membro."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-navy mb-1 block">Evento</label>
              <Select
                value={eventoSelecionadoId ?? ""}
                onValueChange={(v) => setEventoSelecionadoId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(modoModal === "adicionar" ? eventosDeHoje : eventosPassados).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.titulo} · {formatarData(e.data)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eventoSelecionadoId && membros.length > 0 && (
              <div className="border border-brand-gray rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-brand-gray/50 border-b border-brand-gray">
                      <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-3 py-2">
                        Membro
                      </th>
                      <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-3 py-2 w-44">
                        Status
                      </th>
                      <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-3 py-2">
                        Justificativa
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {membros.map((m) => {
                      const atual = statusPorMembro[m.usuario_id] ?? {
                        status: "ausente" as StatusPresenca,
                        justificativa: "",
                      };
                      return (
                        <tr key={m.usuario_id} className="border-b border-brand-gray last:border-0">
                          <td className="px-3 py-2 text-sm font-medium text-navy">{m.nome}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={atual.status}
                              onValueChange={(v) =>
                                setStatusPorMembro((prev) => ({
                                  ...prev,
                                  [m.usuario_id]: {
                                    status: v as StatusPresenca,
                                    justificativa: prev[m.usuario_id]?.justificativa ?? "",
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="presente">Presente</SelectItem>
                                <SelectItem value="ausente">Ausente</SelectItem>
                                <SelectItem value="justificado">Justificado</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              disabled={atual.status !== "justificado"}
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
                              placeholder={
                                atual.status === "justificado"
                                  ? "Motivo"
                                  : "— (apenas p/ justificado)"
                              }
                              className="w-full border border-brand-gray rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy/20 disabled:bg-gray-50 disabled:text-muted-foreground"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModoModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void salvar()}
              disabled={salvando || !eventoSelecionadoId || membros.length === 0}
              className="bg-navy hover:bg-navy/90"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar presença"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
