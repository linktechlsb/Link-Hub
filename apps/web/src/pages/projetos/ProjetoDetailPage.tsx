import { ArrowLeft, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import { CriarMilestoneDialog } from "./CriarMilestoneDialog";
import { CriarTarefaDialog } from "./CriarTarefaDialog";
import { MilestoneCard } from "./MilestoneCard";

type StatusMilestone = "pendente" | "em_andamento" | "concluido";
type StatusTarefa = "pendente" | "em_andamento" | "concluida";

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
  ordem: number;
  tarefas: Tarefa[];
};

type ProjetoAPI = {
  id: string;
  titulo: string;
  descricao?: string;
  status: string;
  prazo?: string;
  liga?: { id: string; nome: string };
  liga_id: string;
  responsavel_nome?: string;
};

type MembroAPI = { id: string; usuario_id: string; nome: string };

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "text-foreground/40" },
  em_aprovacao: { label: "Em aprovação", className: "text-amber-600" },
  aprovado: { label: "Aprovado", className: "text-blue-600" },
  rejeitado: { label: "Rejeitado", className: "text-red-600" },
  em_andamento: { label: "Em andamento", className: "text-blue-600" },
  concluido: { label: "Concluído", className: "text-green-600" },
  cancelado: { label: "Cancelado", className: "text-foreground/30" },
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function ProjetoDetailPage() {
  const { projetoId } = useParams<{ projetoId: string }>();
  const navigate = useNavigate();
  const { role, usuarioId } = useUser();

  const [projeto, setProjeto] = useState<ProjetoAPI | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [membros, setMembros] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [dialogMilestone, setDialogMilestone] = useState(false);
  const [tarefaMilestoneId, setTarefaMilestoneId] = useState<string | null>(null);

  const podeEditar = role === "staff" || role === "diretor";

  const carregarMilestones = useCallback(async () => {
    if (!projetoId) return;
    const token = await getToken();
    const res = await fetch(`/api/milestones?projeto_id=${projetoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as Milestone[];
      setMilestones(Array.isArray(data) ? data : []);
    }
  }, [projetoId]);

  useEffect(() => {
    if (!projetoId) return;

    async function carregar() {
      setCarregando(true);
      const token = await getToken();

      const [resProj, resMilestones] = await Promise.all([
        fetch("/api/projetos", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/milestones?projeto_id=${projetoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resProj.ok) {
        const todos = (await resProj.json()) as ProjetoAPI[];
        const encontrado = todos.find((p) => p.id === projetoId) ?? null;
        setProjeto(encontrado);

        if (encontrado?.liga_id) {
          const resMembros = await fetch(`/api/ligas/${encontrado.liga_id}/membros`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resMembros.ok) {
            const membrosData = (await resMembros.json()) as MembroAPI[];
            setMembros(membrosData.map((m) => ({ id: m.usuario_id, nome: m.nome })));
          }
        }
      }

      if (resMilestones.ok) {
        const data = (await resMilestones.json()) as Milestone[];
        setMilestones(Array.isArray(data) ? data : []);
      }

      setCarregando(false);
    }

    void carregar();
  }, [projetoId]);

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-10">
        <p className="font-plex-sans text-[13px] text-foreground/50">Carregando...</p>
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-10">
        <p className="font-plex-sans text-[13px] text-foreground/50">Projeto não encontrado.</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[projeto.status] ?? {
    label: projeto.status,
    className: "text-foreground/50",
  };
  const totalTarefas = milestones.reduce((acc, m) => acc + (m.tarefas?.length ?? 0), 0);
  const tarefasConcluidas = milestones.reduce(
    (acc, m) => acc + (m.tarefas?.filter((t) => t.status === "concluida").length ?? 0),
    0,
  );

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Navegação de volta */}
      <button
        onClick={() => navigate("/projetos")}
        className="flex items-center gap-2 font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft size={12} />
        Projetos
      </button>

      {/* Cabeçalho do projeto */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1">
              {projeto.liga?.nome ?? "—"}
            </p>
            <h1 className="font-display font-bold text-[26px] tracking-[-0.02em] text-navy">
              {projeto.titulo}
            </h1>
            {projeto.descricao && (
              <p className="font-plex-sans text-[14px] text-foreground/60 mt-2 max-w-2xl">
                {projeto.descricao}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <span className={`font-plex-mono text-[12px] font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
            {projeto.prazo && (
              <p className="font-plex-mono text-[11px] text-foreground/40 mt-1">
                Prazo:{" "}
                {new Date(projeto.prazo.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Progresso geral */}
        {totalTarefas > 0 && (
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(tarefasConcluidas / totalTarefas) * 100}%` }}
              />
            </div>
            <span className="font-plex-mono text-[11px] text-foreground/50 flex-shrink-0">
              {tarefasConcluidas}/{totalTarefas} tarefas
            </span>
          </div>
        )}
      </div>

      {/* Seção de milestones */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/30 mb-1">
              02
            </p>
            <h2 className="font-plex-sans text-[13px] font-bold uppercase tracking-wider text-link-blue dark:text-white">
              Milestones
            </h2>
          </div>
          {podeEditar && (
            <button
              onClick={() => setDialogMilestone(true)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors flex items-center gap-2"
            >
              <Plus size={12} />
              Novo Milestone
            </button>
          )}
        </div>

        {milestones.length === 0 ? (
          <div className="border border-dashed border-foreground/[0.12] rounded-lg p-10 text-center">
            <p className="font-plex-sans text-[13px] text-foreground/40">
              Nenhum milestone criado ainda.
            </p>
            {podeEditar && (
              <button
                onClick={() => setDialogMilestone(true)}
                className="mt-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50 hover:text-foreground transition-colors"
              >
                + Criar primeiro milestone
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                membros={membros}
                podeEditar={podeEditar}
                usuarioId={usuarioId ?? undefined}
                onAdicionarTarefa={(milestoneId) => setTarefaMilestoneId(milestoneId)}
                onAtualizado={carregarMilestones}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {projetoId && (
        <CriarMilestoneDialog
          open={dialogMilestone}
          projetoId={projetoId}
          onClose={() => setDialogMilestone(false)}
          onCriado={carregarMilestones}
        />
      )}

      {tarefaMilestoneId && (
        <CriarTarefaDialog
          open={tarefaMilestoneId !== null}
          milestoneId={tarefaMilestoneId}
          membros={membros}
          onClose={() => setTarefaMilestoneId(null)}
          onCriada={carregarMilestones}
        />
      )}
    </div>
  );
}
