import { LayoutGrid, List } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/reui/badge";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanOverlay,
} from "@/components/reui/kanban";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import { CriarTarefaSheet } from "./CriarTarefaSheet";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

type TarefaAPI = {
  id: string;
  titulo: string;
  descricao?: string;
  status: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  prazo?: string;
  criado_em: string;
  milestone_id: string;
  milestone_titulo: string;
  projeto_id: string;
  projeto_titulo: string;
  liga_id: string;
};

type ProjetoOpt = { id: string; titulo: string };
type MinhaLiga = { id: string; nome: string };

const COLUNAS = [
  { id: "pendente", label: "Pendente" },
  { id: "em_andamento", label: "Em Andamento" },
  { id: "concluida", label: "Concluída" },
  { id: "arquivada", label: "Arquivada" },
];

const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  pendente: { label: "Pendente", variant: "outline" },
  em_andamento: { label: "Em Andamento", variant: "warning-light" },
  concluida: { label: "Concluída", variant: "success-light" },
  arquivada: { label: "Arquivada", variant: "invert-light" },
};

function prazoFormatado(prazo: string) {
  return new Date(prazo.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function prazoAtrasado(prazo?: string) {
  if (!prazo) return false;
  return new Date(prazo.slice(0, 10) + "T23:59:59") < new Date();
}

function TarefaCard({ tarefa }: { tarefa: TarefaAPI }) {
  const atrasado = prazoAtrasado(tarefa.prazo);
  return (
    <div className="bg-white border border-foreground/[0.08] rounded-lg p-3.5 space-y-2.5 select-none">
      <p className="font-plex-sans text-[13px] font-medium text-foreground leading-snug">
        {tarefa.titulo}
      </p>
      <p className="font-plex-mono text-[10px] text-foreground/40 truncate">
        {tarefa.projeto_titulo} › {tarefa.milestone_titulo}
      </p>
      <div className="flex items-center justify-between gap-2">
        {tarefa.responsavel_nome ? (
          <span className="font-plex-sans text-[11px] text-foreground/60 truncate">
            {tarefa.responsavel_nome}
          </span>
        ) : (
          <span />
        )}
        {tarefa.prazo && (
          <span
            className={`font-plex-mono text-[10px] flex-shrink-0 ${atrasado ? "text-red-500" : "text-foreground/40"}`}
          >
            {prazoFormatado(tarefa.prazo)}
          </span>
        )}
      </div>
    </div>
  );
}

export function TarefasPage() {
  const { role } = useUser();
  const [visao, setVisao] = useState<"kanban" | "tabela">("kanban");
  const [sheetAberto, setSheetAberto] = useState(false);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [ordenar, setOrdenar] = useState("recentes");
  const [buscaMembro, setBuscaMembro] = useState("");

  const { data: tarefasRaw, refetch: refetchTarefas } = useCachedFetch<TarefaAPI[]>("/api/tarefas");
  const { data: minhaLiga } = useCachedFetch<MinhaLiga>(
    role && role !== "staff" ? "/api/ligas/minha" : null,
  );

  const projetosUrl = useMemo(() => {
    if (!role) return null;
    if (role === "staff") return "/api/projetos";
    return minhaLiga?.id ? `/api/projetos?liga_id=${minhaLiga.id}` : null;
  }, [role, minhaLiga?.id]);
  const { data: projetosRaw } = useCachedFetch<ProjetoOpt[]>(projetosUrl);

  const projetos = projetosRaw ?? [];
  const tarefasBase = tarefasRaw ?? [];

  // Filtros e ordenação
  const tarefas = useMemo(() => {
    let lista = tarefasBase;

    if (filtroProjeto) lista = lista.filter((t) => t.projeto_id === filtroProjeto);
    if (filtroStatus) lista = lista.filter((t) => t.status === filtroStatus);
    if (buscaMembro)
      lista = lista.filter((t) =>
        t.responsavel_nome?.toLowerCase().includes(buscaMembro.toLowerCase()),
      );

    switch (ordenar) {
      case "mais_antigas":
        lista = [...lista].sort(
          (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
        );
        break;
      case "prazo_asc":
        lista = [...lista].sort((a, b) => {
          if (!a.prazo) return 1;
          if (!b.prazo) return -1;
          return a.prazo.localeCompare(b.prazo);
        });
        break;
      case "prazo_desc":
        lista = [...lista].sort((a, b) => {
          if (!a.prazo) return 1;
          if (!b.prazo) return -1;
          return b.prazo.localeCompare(a.prazo);
        });
        break;
      case "atrasadas":
        lista = [...lista].sort((a, b) => {
          const aAtrasada = prazoAtrasado(a.prazo) ? 0 : 1;
          const bAtrasada = prazoAtrasado(b.prazo) ? 0 : 1;
          return aAtrasada - bAtrasada;
        });
        break;
      case "concluidas":
        lista = [...lista].sort((a) => (a.status === "concluida" ? -1 : 1));
        break;
      case "nao_concluidas":
        lista = [...lista].sort((a) => (a.status !== "concluida" ? -1 : 1));
        break;
      default:
        lista = [...lista].sort(
          (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
        );
    }

    return lista;
  }, [tarefasBase, filtroProjeto, filtroStatus, buscaMembro, ordenar]);

  // Estado do kanban organizado por coluna
  const [colunas, setColunas] = useState<Record<string, TarefaAPI[]>>({
    pendente: [],
    em_andamento: [],
    concluida: [],
    arquivada: [],
  });

  useEffect(() => {
    setColunas({
      pendente: tarefas.filter((t) => t.status === "pendente"),
      em_andamento: tarefas.filter((t) => t.status === "em_andamento"),
      concluida: tarefas.filter((t) => t.status === "concluida"),
      arquivada: tarefas.filter((t) => t.status === "arquivada"),
    });
  }, [tarefas]);

  const handleKanbanChange = useCallback(
    async (novasColunas: Record<string, TarefaAPI[]>) => {
      // Detecta qual tarefa mudou de coluna
      for (const [colId, items] of Object.entries(novasColunas)) {
        for (const item of items) {
          if (item.status !== colId) {
            // Atualiza no servidor
            try {
              const token = await getToken();
              await fetch(`/api/tarefas/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: colId }),
              });
              refetchTarefas();
            } catch {
              toast.error("Erro ao atualizar status.");
            }
          }
        }
      }
      setColunas(novasColunas);
    },
    [refetchTarefas],
  );

  const podeEditar = role === "staff" || role === "diretor";

  const kpis = [
    { label: "Total", valor: String(tarefasBase.length) },
    {
      label: "Pendentes",
      valor: String(tarefasBase.filter((t) => t.status === "pendente").length),
    },
    {
      label: "Em andamento",
      valor: String(tarefasBase.filter((t) => t.status === "em_andamento").length),
    },
    {
      label: "Concluídas",
      valor: String(tarefasBase.filter((t) => t.status === "concluida").length),
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">Tarefas</h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Módulo
        </p>
      </div>

      <div className="space-y-12">
        <KpiRow items={kpis} />

        <div>
          <SectionHeader
            titulo="Todas as Tarefas"
            acao={
              <div className="flex items-center gap-3">
                <div className="flex border border-navy/20 overflow-hidden rounded">
                  <button
                    onClick={() => setVisao("kanban")}
                    className={`p-2 transition-colors ${visao === "kanban" ? "bg-navy text-white" : "text-navy/50 hover:text-navy hover:bg-navy/5"}`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setVisao("tabela")}
                    className={`p-2 transition-colors ${visao === "tabela" ? "bg-navy text-white" : "text-navy/50 hover:text-navy hover:bg-navy/5"}`}
                  >
                    <List size={15} />
                  </button>
                </div>

                {podeEditar && (
                  <button
                    onClick={() => setSheetAberto(true)}
                    className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground hover:text-background transition-colors"
                  >
                    + Nova Tarefa
                  </button>
                )}
              </div>
            }
          />

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <Select
              value={filtroProjeto}
              onValueChange={(v) => setFiltroProjeto(v === "all" ? "" : v)}
            >
              <SelectTrigger className="font-plex-sans text-[13px] w-auto min-w-[160px]">
                <SelectValue placeholder="Todos os projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-plex-sans text-[13px]">
                  Todos os projetos
                </SelectItem>
                {projetos.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="font-plex-sans text-[13px]">
                    {p.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ordenar} onValueChange={setOrdenar}>
              <SelectTrigger className="font-plex-sans text-[13px] w-auto min-w-[140px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes" className="font-plex-sans text-[13px]">
                  Mais recentes
                </SelectItem>
                <SelectItem value="mais_antigas" className="font-plex-sans text-[13px]">
                  Mais antigas
                </SelectItem>
                <SelectItem value="prazo_asc" className="font-plex-sans text-[13px]">
                  Prazo ↑
                </SelectItem>
                <SelectItem value="prazo_desc" className="font-plex-sans text-[13px]">
                  Prazo ↓
                </SelectItem>
                <SelectItem value="atrasadas" className="font-plex-sans text-[13px]">
                  Atrasadas primeiro
                </SelectItem>
                <SelectItem value="concluidas" className="font-plex-sans text-[13px]">
                  Concluídas primeiro
                </SelectItem>
                <SelectItem value="nao_concluidas" className="font-plex-sans text-[13px]">
                  Não concluídas primeiro
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filtroStatus}
              onValueChange={(v) => setFiltroStatus(v === "all" ? "" : v)}
            >
              <SelectTrigger className="font-plex-sans text-[13px] w-auto min-w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-plex-sans text-[13px]">
                  Todos os status
                </SelectItem>
                <SelectItem value="pendente" className="font-plex-sans text-[13px]">
                  Pendente
                </SelectItem>
                <SelectItem value="em_andamento" className="font-plex-sans text-[13px]">
                  Em andamento
                </SelectItem>
                <SelectItem value="concluida" className="font-plex-sans text-[13px]">
                  Concluída
                </SelectItem>
                <SelectItem value="arquivada" className="font-plex-sans text-[13px]">
                  Arquivada
                </SelectItem>
              </SelectContent>
            </Select>

            <input
              type="text"
              value={buscaMembro}
              onChange={(e) => setBuscaMembro(e.target.value)}
              placeholder="Filtrar por membro..."
              className="font-plex-sans text-[13px] text-navy border border-navy/20 px-3 py-2 bg-white focus:outline-none focus:border-navy/60 w-44"
            />
          </div>

          {/* Visão Kanban */}
          {visao === "kanban" && (
            <Kanban value={colunas} onValueChange={handleKanbanChange} getItemValue={(t) => t.id}>
              <KanbanBoard className="grid grid-cols-4 gap-4 items-start">
                {COLUNAS.map(({ id, label }) => {
                  const items = colunas[id] ?? [];
                  return (
                    <KanbanColumn key={id} value={id} className="flex flex-col">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <span className="font-plex-sans text-[13px] font-semibold text-navy">
                            {label}
                          </span>
                          <span className="font-plex-mono text-[10px] text-foreground/40 border border-foreground/10 rounded px-1.5 py-0.5">
                            {items.length}
                          </span>
                        </div>
                      </div>

                      <KanbanColumnContent value={id} className="flex flex-col gap-2 min-h-[120px]">
                        {items.map((tarefa) => (
                          <KanbanItem key={tarefa.id} value={tarefa.id}>
                            <TarefaCard tarefa={tarefa} />
                          </KanbanItem>
                        ))}
                      </KanbanColumnContent>
                    </KanbanColumn>
                  );
                })}
              </KanbanBoard>

              <KanbanOverlay>
                {({ value }) => {
                  const tarefa = Object.values(colunas)
                    .flat()
                    .find((t) => t.id === value);
                  if (!tarefa) return null;
                  return <TarefaCard tarefa={tarefa} />;
                }}
              </KanbanOverlay>
            </Kanban>
          )}

          {/* Visão Tabela */}
          {visao === "tabela" &&
            (tarefas.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-foreground/50">
                Nenhuma tarefa encontrada.
              </p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-foreground/[0.08]">
                    {["Título", "Projeto", "Milestone", "Responsável", "Prazo", "Status"].map(
                      (col) => (
                        <th
                          key={col}
                          className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tarefas.map((t, idx) => {
                    const s = STATUS_BADGE[t.status] ?? { label: t.status, variant: "outline" };
                    const atrasado = prazoAtrasado(t.prazo);
                    const isLast = idx === tarefas.length - 1;
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-foreground/[0.03] transition-colors ${!isLast ? "border-b border-foreground/[0.06]" : ""}`}
                      >
                        <td className="py-4 px-4 font-plex-sans text-[13px] font-semibold text-foreground">
                          {t.titulo}
                        </td>
                        <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                          {t.projeto_titulo}
                        </td>
                        <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                          {t.milestone_titulo}
                        </td>
                        <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60">
                          {t.responsavel_nome ?? "—"}
                        </td>
                        <td
                          className={`py-4 px-4 font-plex-mono text-[13px] ${atrasado ? "text-red-500" : "text-foreground/60"}`}
                        >
                          {t.prazo ? prazoFormatado(t.prazo) : "—"}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={s.variant as Parameters<typeof Badge>[0]["variant"]}
                            className="font-plex-mono text-[10px]"
                          >
                            {s.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
        </div>
      </div>

      <CriarTarefaSheet
        open={sheetAberto}
        onOpenChange={setSheetAberto}
        onSalvo={refetchTarefas}
        ligaId={minhaLiga?.id}
      />
    </div>
  );
}
