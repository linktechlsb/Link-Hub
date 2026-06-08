import { ArrowLeft, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { TabSection } from "@/pages/ligas/tabs/primitives";

import { CriarMilestoneDialog } from "./CriarMilestoneDialog";
import { CriarTarefaDialog } from "./CriarTarefaDialog";
import { MilestoneCard } from "./MilestoneCard";
import { ProjetoDetailSkeleton } from "./ProjetoSkeletons";
import { STATUS_CONFIG } from "./statusConfig";

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
    return <ProjetoDetailSkeleton />;
  }

  if (!projeto) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <p className="text-sm text-foreground/50">Projeto não encontrado.</p>
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
    <div className="mx-auto max-w-5xl px-8 py-10">
      {/* Navegação de volta */}
      <button
        onClick={() => navigate("/projetos")}
        className="mb-8 flex items-center gap-2 text-sm text-foreground/50 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Projetos
      </button>

      {/* Cabeçalho do projeto */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground/50">{projeto.liga?.nome ?? "—"}</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
              {projeto.titulo}
            </h1>
            {projeto.descricao && (
              <p className="mt-2 max-w-2xl text-sm text-foreground/60">{projeto.descricao}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <span className={`text-xs font-medium ${statusCfg.className}`}>{statusCfg.label}</span>
            {projeto.prazo && (
              <p className="mt-1 text-xs text-foreground/40">
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
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(tarefasConcluidas / totalTarefas) * 100}%` }}
              />
            </div>
            <span className="flex-shrink-0 text-xs tabular-nums text-foreground/50">
              {tarefasConcluidas}/{totalTarefas} tarefas
            </span>
          </div>
        )}
      </div>

      {/* Seção de milestones */}
      <TabSection
        titulo="Milestones"
        acao={
          podeEditar ? (
            <button
              onClick={() => setDialogMilestone(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo milestone
            </button>
          ) : null
        }
      >
        {milestones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-foreground/50">Nenhum milestone criado ainda.</p>
            {podeEditar && (
              <button
                onClick={() => setDialogMilestone(true)}
                className="mt-4 text-xs text-foreground/50 transition-colors hover:text-foreground"
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
      </TabSection>

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
