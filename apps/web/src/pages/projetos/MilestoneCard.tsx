import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/lib/supabase";

type StatusTarefa = "pendente" | "em_andamento" | "concluida";
type StatusMilestone = "pendente" | "em_andamento" | "concluido";

type Tarefa = {
  id: string;
  titulo: string;
  descricao?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  status: StatusTarefa;
  prazo?: string;
};

type Milestone = {
  id: string;
  titulo: string;
  descricao?: string;
  prazo?: string;
  status: StatusMilestone;
  tarefas: Tarefa[];
};

type MembroSimples = { id: string; nome: string };

type Props = {
  milestone: Milestone;
  membros: MembroSimples[];
  podeEditar: boolean;
  usuarioId?: string;
  onAdicionarTarefa: (milestoneId: string) => void;
  onAtualizado: () => void;
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_MILESTONE: Record<StatusMilestone, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "text-foreground/40" },
  em_andamento: { label: "Em andamento", className: "text-amber-600" },
  concluido: { label: "Concluído", className: "text-green-600" },
};

const STATUS_TAREFA_CYCLE: StatusTarefa[] = ["pendente", "em_andamento", "concluida"];

function proximoStatus(atual: StatusTarefa): StatusTarefa {
  const idx = STATUS_TAREFA_CYCLE.indexOf(atual);
  return STATUS_TAREFA_CYCLE[(idx + 1) % STATUS_TAREFA_CYCLE.length] ?? "pendente";
}

export function MilestoneCard({
  milestone,
  membros: _membros,
  podeEditar,
  usuarioId,
  onAdicionarTarefa,
  onAtualizado,
}: Props) {
  const [expandido, setExpandido] = useState(true);
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [deletando, setDeletando] = useState(false);

  const tarefas = milestone.tarefas ?? [];
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;
  const total = tarefas.length;

  const statusCfg = STATUS_MILESTONE[milestone.status] ?? {
    label: milestone.status,
    className: "text-foreground/50",
  };

  async function handleToggleTarefa(tarefa: Tarefa) {
    const podeMudar = podeEditar || tarefa.responsavel_id === usuarioId;
    if (!podeMudar) return;
    setAtualizando(tarefa.id);
    try {
      const token = await getToken();
      await fetch(`/api/milestones/${milestone.id}/tarefas/${tarefa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: proximoStatus(tarefa.status) }),
      });
      onAtualizado();
    } finally {
      setAtualizando(null);
    }
  }

  async function handleAlterarStatusMilestone(novoStatus: StatusMilestone) {
    if (!podeEditar) return;
    try {
      const token = await getToken();
      await fetch(`/api/milestones/${milestone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: novoStatus }),
      });
      onAtualizado();
    } catch {
      /* silencioso */
    }
  }

  async function handleDeletar() {
    if (!podeEditar) return;
    setDeletando(true);
    try {
      const token = await getToken();
      await fetch(`/api/milestones/${milestone.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onAtualizado();
    } finally {
      setDeletando(false);
    }
  }

  async function handleDeletarTarefa(tarefaId: string) {
    if (!podeEditar) return;
    setAtualizando(tarefaId);
    try {
      const token = await getToken();
      await fetch(`/api/milestones/${milestone.id}/tarefas/${tarefaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onAtualizado();
    } finally {
      setAtualizando(null);
    }
  }

  return (
    <div className="border border-foreground/[0.08] rounded-lg overflow-hidden">
      {/* Cabeçalho do milestone */}
      <div className="flex items-center gap-3 px-5 py-4 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors">
        <button
          onClick={() => setExpandido((v) => !v)}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          <span className="text-foreground/30 flex-shrink-0">
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-plex-sans text-[14px] font-semibold text-foreground truncate block">
              {milestone.titulo}
            </span>
            {milestone.descricao && (
              <p className="font-plex-sans text-[12px] text-foreground/50 mt-0.5 truncate">
                {milestone.descricao}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-4 flex-shrink-0">
          {total > 0 && (
            <span className="font-plex-mono text-[11px] text-foreground/50">
              {concluidas}/{total}
            </span>
          )}

          {milestone.prazo && (
            <span className="font-plex-mono text-[11px] text-foreground/40">
              {new Date(milestone.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}

          {podeEditar ? (
            <select
              value={milestone.status}
              onChange={(e) => handleAlterarStatusMilestone(e.target.value as StatusMilestone)}
              className={`font-plex-mono text-[11px] bg-transparent border-none focus:outline-none cursor-pointer ${statusCfg.className}`}
            >
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          ) : (
            <span className={`font-plex-mono text-[11px] ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          )}

          {podeEditar && (
            <button
              onClick={handleDeletar}
              disabled={deletando}
              className="text-foreground/20 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="h-0.5 bg-foreground/[0.06]">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(concluidas / total) * 100}%` }}
          />
        </div>
      )}

      {/* Lista de tarefas */}
      {expandido && (
        <div className="px-5 py-3 space-y-1">
          {tarefas.length === 0 && (
            <p className="font-plex-sans text-[12px] text-foreground/30 py-2">
              Nenhuma tarefa ainda.
            </p>
          )}

          {tarefas.map((tarefa) => {
            const podeMudar = podeEditar || tarefa.responsavel_id === usuarioId;
            const concluida = tarefa.status === "concluida";
            return (
              <div key={tarefa.id} className="flex items-center gap-3 py-2 group">
                <button
                  onClick={() => handleToggleTarefa(tarefa)}
                  disabled={atualizando === tarefa.id || !podeMudar}
                  className={`w-4 h-4 rounded flex-shrink-0 border transition-colors ${
                    concluida
                      ? "bg-green-500 border-green-500"
                      : tarefa.status === "em_andamento"
                        ? "bg-amber-400 border-amber-400"
                        : "border-foreground/20 hover:border-foreground/50"
                  } disabled:opacity-40`}
                >
                  {concluida && (
                    <svg viewBox="0 0 12 12" fill="none" className="w-full h-full p-0.5">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <span
                    className={`font-plex-sans text-[13px] ${concluida ? "line-through text-foreground/30" : "text-foreground"}`}
                  >
                    {tarefa.titulo}
                  </span>
                  {tarefa.responsavel_nome && (
                    <span className="font-plex-mono text-[10px] text-foreground/40 ml-2">
                      {tarefa.responsavel_nome}
                    </span>
                  )}
                </div>

                {tarefa.prazo && (
                  <span className="font-plex-mono text-[11px] text-foreground/30 flex-shrink-0">
                    {new Date(tarefa.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                )}

                {podeEditar && (
                  <button
                    onClick={() => handleDeletarTarefa(tarefa.id)}
                    disabled={atualizando === tarefa.id}
                    className="opacity-0 group-hover:opacity-100 text-foreground/20 hover:text-red-500 transition-all disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {podeEditar && (
            <button
              onClick={() => onAdicionarTarefa(milestone.id)}
              className="flex items-center gap-2 mt-2 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/30 hover:text-foreground transition-colors py-1"
            >
              <Plus size={12} />
              Adicionar tarefa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
