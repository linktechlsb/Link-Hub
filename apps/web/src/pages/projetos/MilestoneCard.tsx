import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import { DashboardCard } from "@/pages/home/components/DashboardCard";

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
  em_andamento: { label: "Em andamento", className: "text-amber-600 dark:text-amber-300" },
  concluido: { label: "Concluído", className: "text-emerald-600 dark:text-emerald-300" },
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
    <DashboardCard className="overflow-hidden">
      {/* Cabeçalho do milestone */}
      <div className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-foreground/[0.02]">
        <button
          onClick={() => setExpandido((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown
            size={14}
            className={`flex-shrink-0 text-foreground/40 transition-transform duration-300 ease-out ${
              expandido ? "rotate-180" : ""
            }`}
          />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {milestone.titulo}
            </span>
            {milestone.descricao && (
              <p className="mt-0.5 truncate text-xs text-foreground/50">{milestone.descricao}</p>
            )}
          </div>
        </button>

        <div className="flex flex-shrink-0 items-center gap-4">
          {total > 0 && (
            <span className="text-xs tabular-nums text-foreground/50">
              {concluidas}/{total}
            </span>
          )}

          {milestone.prazo && (
            <span className="text-xs text-foreground/40">
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
              className={`cursor-pointer border-none bg-transparent text-xs font-medium focus:outline-none ${statusCfg.className}`}
            >
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          ) : (
            <span className={`text-xs font-medium ${statusCfg.className}`}>{statusCfg.label}</span>
          )}

          {podeEditar && (
            <button
              onClick={handleDeletar}
              disabled={deletando}
              className="text-foreground/30 transition-colors hover:text-destructive disabled:opacity-40"
              aria-label="Remover milestone"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(concluidas / total) * 100}%` }}
          />
        </div>
      )}

      {/* Lista de tarefas — expande/colapsa suavemente */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expandido ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`space-y-1 border-t border-border px-5 py-3 transition-opacity duration-300 ${
              expandido ? "opacity-100" : "opacity-0"
            }`}
          >
            {tarefas.length === 0 && (
              <p className="py-2 text-xs text-foreground/40">Nenhuma tarefa ainda.</p>
            )}

            {tarefas.map((tarefa) => {
              const podeMudar = podeEditar || tarefa.responsavel_id === usuarioId;
              const concluida = tarefa.status === "concluida";
              return (
                <div key={tarefa.id} className="group flex items-center gap-3 py-2">
                  <button
                    onClick={() => handleToggleTarefa(tarefa)}
                    disabled={atualizando === tarefa.id || !podeMudar}
                    className={`h-4 w-4 flex-shrink-0 rounded border transition-colors ${
                      concluida
                        ? "border-emerald-500 bg-emerald-500"
                        : tarefa.status === "em_andamento"
                          ? "border-amber-400 bg-amber-400"
                          : "border-foreground/20 hover:border-foreground/50"
                    } disabled:opacity-40`}
                  >
                    {concluida && (
                      <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-0.5">
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

                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-sm ${concluida ? "text-foreground/30 line-through" : "text-foreground"}`}
                    >
                      {tarefa.titulo}
                    </span>
                    {tarefa.responsavel_nome && (
                      <span className="ml-2 text-xs text-foreground/40">
                        {tarefa.responsavel_nome}
                      </span>
                    )}
                  </div>

                  {tarefa.prazo && (
                    <span className="flex-shrink-0 text-xs text-foreground/40">
                      {new Date(tarefa.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "short",
                        },
                      )}
                    </span>
                  )}

                  {podeEditar && (
                    <button
                      onClick={() => handleDeletarTarefa(tarefa.id)}
                      disabled={atualizando === tarefa.id}
                      className="text-foreground/20 opacity-0 transition-all hover:text-destructive group-hover:opacity-100 disabled:opacity-40"
                      aria-label="Remover tarefa"
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
                className="mt-2 flex items-center gap-1.5 py-1 text-xs text-foreground/40 transition-colors hover:text-foreground"
              >
                <Plus size={12} />
                Adicionar tarefa
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
