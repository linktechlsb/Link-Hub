import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  CircleDashed,
  CircleUser,
  Clock,
  FolderKanban,
  LayoutGrid,
  List,
  ListChecks,
  Milestone,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tag,
  Trash2,
  Type,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban";
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
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DashboardCard } from "@/pages/home/components/DashboardCard";
import { StatStrip } from "@/pages/ligas/tabs/primitives";

import { CriarTarefaSheet, type TarefaEdicao } from "./CriarTarefaSheet";
import { getTarefaIcon } from "./icones";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

type TarefaAPI = {
  id: string;
  titulo: string;
  descricao?: string;
  status: string;
  icone?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  responsavel_avatar?: string | null;
  responsaveis?: { id: string; nome: string; avatar?: string | null }[];
  prazo?: string;
  criado_em: string;
  milestone_id?: string | null;
  milestone_titulo?: string | null;
  projeto_id: string;
  projeto_titulo: string;
  liga_id: string;
};

type ProjetoOpt = { id: string; titulo: string };
type MinhaLiga = { id: string; nome: string };

const COLUNAS = [
  {
    id: "pendente",
    label: "Pendente",
    dot: "bg-zinc-400",
    chip: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    col: "bg-zinc-50/70 dark:bg-zinc-900/30",
    add: "text-zinc-500/80 hover:bg-zinc-200/50 hover:text-zinc-600 dark:text-zinc-400/70 dark:hover:bg-zinc-800/50",
  },
  {
    id: "em_andamento",
    label: "Em Andamento",
    dot: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    col: "bg-blue-50/60 dark:bg-blue-950/20",
    add: "text-blue-600/70 hover:bg-blue-100/60 hover:text-blue-700 dark:text-blue-300/70 dark:hover:bg-blue-900/30",
  },
  {
    id: "concluida",
    label: "Concluída",
    dot: "bg-green-500",
    chip: "bg-[#D3E1D6] text-green-700 dark:bg-green-900/40 dark:text-green-300",
    col: "bg-[#F6F9F7] dark:bg-green-950/20",
    add: "text-green-600/70 hover:bg-green-100/60 hover:text-green-700 dark:text-green-300/70 dark:hover:bg-green-900/30",
  },
  {
    id: "arquivada",
    label: "Arquivada",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    col: "bg-amber-50/60 dark:bg-amber-950/20",
    add: "text-amber-600/70 hover:bg-amber-100/60 hover:text-amber-700 dark:text-amber-300/70 dark:hover:bg-amber-900/30",
  },
];

const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  pendente: { label: "Pendente", variant: "outline" },
  em_andamento: { label: "Em Andamento", variant: "warning-light" },
  concluida: { label: "Concluída", variant: "success-light" },
  arquivada: { label: "Arquivada", variant: "invert-light" },
};

const STATUS_META: Record<string, { label: string; dot: string; chip: string }> =
  Object.fromEntries(COLUNAS.map((c) => [c.id, { label: c.label, dot: c.dot, chip: c.chip }]));

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    dot: "bg-zinc-400",
    chip: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        meta.chip,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function StatusSelect({
  status,
  onChange,
  disabled,
}: {
  status: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}) {
  if (disabled) return <StatusPill status={status} />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="-mx-1 rounded-md px-1 py-0.5 transition-colors hover:bg-foreground/[0.06] focus:outline-none data-[state=open]:bg-foreground/[0.06]">
          <StatusPill status={status} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {COLUNAS.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => onChange(c.id)} className="gap-2">
            <StatusPill status={c.id} />
            {status === c.id && <Check className="ml-auto h-3.5 w-3.5 text-foreground/50" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ORDENAR_LABELS: Record<string, string> = {
  recentes: "Mais recentes",
  mais_antigas: "Mais antigas",
  prazo_asc: "Prazo ↑",
  prazo_desc: "Prazo ↓",
  atrasadas: "Atrasadas primeiro",
  concluidas: "Concluídas primeiro",
  nao_concluidas: "Não concluídas primeiro",
};

const TH_CLASS = "px-4 py-2.5 text-left text-xs font-normal text-foreground/40";
const ROW_CLASS =
  "border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]";

const TABELA_COLUNAS: { label: string; icon: typeof Type }[] = [
  { label: "Título", icon: Type },
  { label: "Projeto", icon: FolderKanban },
  { label: "Milestone", icon: Milestone },
  { label: "Responsável", icon: CircleUser },
  { label: "Prazo", icon: Calendar },
  { label: "Status", icon: CircleDashed },
];

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

function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
      <span className="text-foreground/40">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      <button
        onClick={onClear}
        className="ml-0.5 text-foreground/40 transition-colors hover:text-foreground"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

type Pessoa = { nome: string; avatar?: string | null };

// Adapta a tarefa (hoje com um único responsável) para uma lista de pessoas.
// Quando a API passar a retornar `responsaveis: Pessoa[]`, basta usá-la aqui.
function getResponsaveis(tarefa: TarefaAPI): Pessoa[] {
  if (tarefa.responsaveis && tarefa.responsaveis.length > 0) {
    return tarefa.responsaveis.map((r) => ({ nome: r.nome, avatar: r.avatar }));
  }
  if (tarefa.responsavel_nome) {
    return [{ nome: tarefa.responsavel_nome, avatar: tarefa.responsavel_avatar }];
  }
  return [];
}

function ResponsaveisAvatars({
  pessoas,
  max = 3,
  className,
}: {
  pessoas: Pessoa[];
  max?: number;
  className?: string;
}) {
  if (pessoas.length === 0) return null;
  const visiveis = pessoas.slice(0, max);
  const resto = pessoas.length - visiveis.length;

  return (
    <AvatarGroup className={className}>
      {visiveis.map((p, i) => (
        <Avatar key={i} className="h-5 w-5">
          {p.avatar ? <AvatarImage src={p.avatar} alt={p.nome} /> : null}
          <AvatarFallback className="bg-foreground/10 text-[9px] font-semibold text-foreground/60">
            {p.nome.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {resto > 0 && (
        <Avatar className="h-5 w-5">
          <AvatarFallback className="bg-foreground/10 text-[9px] font-semibold text-foreground/60">
            +{resto}
          </AvatarFallback>
        </Avatar>
      )}
    </AvatarGroup>
  );
}

function TarefaCardContent({ tarefa }: { tarefa: TarefaAPI }) {
  const atrasado = prazoAtrasado(tarefa.prazo);
  const responsaveis = getResponsaveis(tarefa);
  const primeiroNome = responsaveis.length === 1 ? responsaveis[0]!.nome.split(" ")[0] : "";
  const Icone = getTarefaIcon(tarefa.icone);

  return (
    <div className="rounded-lg border border-border bg-white dark:bg-card p-3 space-y-2.5 hover:shadow-sm transition-shadow select-none">
      {/* Title */}
      <div className="flex items-start gap-2">
        <Icone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-foreground/40" />
        <p className="text-sm font-medium text-foreground leading-snug">{tarefa.titulo}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-foreground/50 max-w-[140px] truncate">
          {tarefa.projeto_titulo}
        </span>
        {tarefa.milestone_titulo && (
          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-foreground/40 max-w-[120px] truncate">
            {tarefa.milestone_titulo}
          </span>
        )}
      </div>

      {/* Footer */}
      {(responsaveis.length > 0 || tarefa.prazo) && (
        <div className="flex items-center justify-between gap-2">
          {responsaveis.length > 0 ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <ResponsaveisAvatars pessoas={responsaveis} />
              {primeiroNome && (
                <span className="text-[11px] text-foreground/50 truncate">{primeiroNome}</span>
              )}
            </div>
          ) : (
            <span />
          )}

          {tarefa.prazo && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 flex-shrink-0 rounded text-[10px] px-1.5 py-0.5",
                atrasado
                  ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                  : "text-foreground/40",
              )}
            >
              {atrasado && <AlertCircle className="h-2.5 w-2.5" />}
              {prazoFormatado(tarefa.prazo)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TarefaMenu({
  onEditar,
  onExcluir,
  className,
}: {
  onEditar: () => void;
  onExcluir: () => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="Ações da tarefa"
          className={cn(
            "rounded p-1 text-foreground/40 transition-colors hover:bg-foreground/10 hover:text-foreground focus:outline-none data-[state=open]:bg-foreground/10 data-[state=open]:text-foreground",
            className,
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={onEditar} className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onExcluir}
          className="gap-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TarefaCard({
  tarefa,
  podeEditar,
  onEditar,
  onExcluir,
}: {
  tarefa: TarefaAPI;
  podeEditar: boolean;
  onEditar: (t: TarefaAPI) => void;
  onExcluir: (t: TarefaAPI) => void;
}) {
  return (
    <KanbanItem value={tarefa.id} className="group relative">
      <KanbanItemHandle className="block w-full text-left">
        <TarefaCardContent tarefa={tarefa} />
      </KanbanItemHandle>
      {podeEditar && (
        <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 data-[open]:opacity-100">
          <TarefaMenu
            onEditar={() => onEditar(tarefa)}
            onExcluir={() => onExcluir(tarefa)}
            className="bg-white/80 dark:bg-card/80 backdrop-blur-sm"
          />
        </div>
      )}
    </KanbanItem>
  );
}

export function TarefasPage() {
  const { role } = useUser();
  const [visao, setVisao] = useState<"kanban" | "tabela">("kanban");
  const [sheetAberto, setSheetAberto] = useState(false);
  const [tarefaEdicao, setTarefaEdicao] = useState<TarefaEdicao | null>(null);
  const [tarefaExcluir, setTarefaExcluir] = useState<TarefaAPI | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [ordenar, setOrdenar] = useState("recentes");
  const [buscaMembro, setBuscaMembro] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

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

  const tarefas = useMemo(() => {
    let lista = tarefasBase.map((t) =>
      statusOverrides[t.id] && statusOverrides[t.id] !== t.status
        ? { ...t, status: statusOverrides[t.id]! }
        : t,
    );

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
  }, [tarefasBase, filtroProjeto, filtroStatus, buscaMembro, ordenar, statusOverrides]);

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

  const persistStatus = useCallback(
    async (id: string, status: string) => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/tarefas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Erro ao atualizar status.");
        refetchTarefas(); // reverte para o estado do servidor em caso de falha
      }
    },
    [refetchTarefas],
  );

  const mudarStatus = useCallback(
    (id: string, status: string) => {
      setStatusOverrides((prev) => ({ ...prev, [id]: status }));
      persistStatus(id, status);
    },
    [persistStatus],
  );

  const abrirNova = useCallback(() => {
    setTarefaEdicao(null);
    setSheetAberto(true);
  }, []);

  const abrirEdicao = useCallback((t: TarefaAPI) => {
    const ids =
      t.responsaveis && t.responsaveis.length > 0
        ? t.responsaveis.map((r) => r.id)
        : t.responsavel_id
          ? [t.responsavel_id]
          : [];
    setTarefaEdicao({
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      projeto_id: t.projeto_id,
      milestone_id: t.milestone_id ?? "",
      responsaveis: ids,
      prazo: t.prazo,
      icone: t.icone,
    });
    setSheetAberto(true);
  }, []);

  const excluirTarefa = useCallback(async () => {
    if (!tarefaExcluir) return;
    setExcluindo(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/tarefas/${tarefaExcluir.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Tarefa excluída.");
      setTarefaExcluir(null);
      refetchTarefas();
    } catch {
      toast.error("Erro ao excluir tarefa.");
    } finally {
      setExcluindo(false);
    }
  }, [tarefaExcluir, refetchTarefas]);

  const handleKanbanChange = useCallback(
    (novasColunas: Record<string, TarefaAPI[]>) => {
      // Atualiza o estado local de forma síncrona para o dnd-kit rastrear a coluna
      // de destino corretamente; a persistência acontece em segundo plano.
      for (const [colId, items] of Object.entries(novasColunas)) {
        for (const item of items) {
          if (item.status !== colId) {
            item.status = colId; // evita re-disparo nos ticks seguintes do drag
            persistStatus(item.id, colId);
          }
        }
      }
      setColunas(novasColunas);
    },
    [persistStatus],
  );

  const podeEditar = role === "staff" || role === "diretor";

  const temFiltrosAtivos = !!(filtroProjeto || filtroStatus || buscaMembro);
  const ordenarNaoPadrao = ordenar !== "recentes";

  function limparFiltros() {
    setFiltroProjeto("");
    setFiltroStatus("");
    setBuscaMembro("");
    setOrdenar("recentes");
  }

  const projetoNome = projetos.find((p) => p.id === filtroProjeto)?.titulo ?? "";
  const statusNome = STATUS_BADGE[filtroStatus]?.label ?? "";

  const kpis = [
    { icon: ListChecks, label: "Total", value: String(tarefasBase.length) },
    {
      icon: Clock,
      label: "Pendentes",
      value: String(tarefasBase.filter((t) => t.status === "pendente").length),
    },
    {
      icon: Zap,
      label: "Em andamento",
      value: String(tarefasBase.filter((t) => t.status === "em_andamento").length),
    },
    {
      icon: CheckCircle2,
      label: "Concluídas",
      value: String(tarefasBase.filter((t) => t.status === "concluida").length),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="mt-1 text-sm text-foreground/50">Visão geral de todas as tarefas</p>
        </div>
        {podeEditar && (
          <button
            onClick={abrirNova}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-transparent dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova tarefa
          </button>
        )}
      </div>

      <div className="space-y-8">
        <StatStrip items={kpis} />

        <div className="space-y-4">
          {/* Barra de controles */}
          <div className="flex items-center justify-end gap-4">
            <div className="relative flex overflow-hidden rounded border border-border">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/2 bg-foreground transition-transform duration-200 ease-out"
                style={{
                  transform: visao === "kanban" ? "translateX(0%)" : "translateX(100%)",
                }}
              />
              <button
                onClick={() => setVisao("kanban")}
                className={cn(
                  "relative z-10 p-2 transition-colors",
                  visao === "kanban"
                    ? "text-background"
                    : "text-foreground/40 hover:text-foreground",
                )}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setVisao("tabela")}
                className={cn(
                  "relative z-10 p-2 transition-colors",
                  visao === "tabela"
                    ? "text-background"
                    : "text-foreground/40 hover:text-foreground",
                )}
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtrar
                  {(temFiltrosAtivos || ordenarNaoPadrao) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <FolderKanban className="h-3.5 w-3.5 text-foreground/50" />
                    Projeto
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                      <DropdownMenuRadioGroup
                        value={filtroProjeto}
                        onValueChange={(v) => setFiltroProjeto(v === "__all__" ? "" : v)}
                      >
                        <DropdownMenuRadioItem value="__all__">
                          Todos os projetos
                        </DropdownMenuRadioItem>
                        {projetos.map((p) => (
                          <DropdownMenuRadioItem key={p.id} value={p.id}>
                            {p.titulo}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Tag className="h-3.5 w-3.5 text-foreground/50" />
                    Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={filtroStatus}
                        onValueChange={(v) => setFiltroStatus(v === "__all__" ? "" : v)}
                      >
                        <DropdownMenuRadioItem value="__all__">Todos</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="pendente">Pendente</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="em_andamento">
                          Em andamento
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="concluida">Concluída</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="arquivada">Arquivada</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5 text-foreground/50" />
                    Ordenar
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={ordenar} onValueChange={setOrdenar}>
                        {Object.entries(ORDENAR_LABELS).map(([value, label]) => (
                          <DropdownMenuRadioItem key={value} value={value}>
                            {label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Busca membro */}
            <div className="relative">
              <input
                type="text"
                value={buscaMembro}
                onChange={(e) => setBuscaMembro(e.target.value)}
                placeholder="Buscar membro..."
                className="rounded-full border border-border bg-transparent px-3 py-1.5 text-xs text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none w-36 transition-all focus:w-44"
              />
              {buscaMembro && (
                <button
                  onClick={() => setBuscaMembro("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {filtroProjeto && (
              <FilterChip
                label="Projeto"
                value={projetoNome}
                onClear={() => setFiltroProjeto("")}
              />
            )}
            {filtroStatus && (
              <FilterChip label="Status" value={statusNome} onClear={() => setFiltroStatus("")} />
            )}
            {ordenarNaoPadrao && (
              <FilterChip
                label="Ordem"
                value={ORDENAR_LABELS[ordenar] ?? ordenar}
                onClear={() => setOrdenar("recentes")}
              />
            )}

            {(temFiltrosAtivos || ordenarNaoPadrao) && (
              <button
                onClick={limparFiltros}
                className="text-xs text-foreground/40 transition-colors hover:text-foreground"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Visão Kanban */}
          {visao === "kanban" && (
            <Kanban value={colunas} onValueChange={handleKanbanChange} getItemValue={(t) => t.id}>
              <KanbanBoard className="grid grid-cols-4 gap-3 items-start">
                {COLUNAS.map((col) => {
                  const items = colunas[col.id] ?? [];
                  return (
                    <KanbanColumn
                      key={col.id}
                      value={col.id}
                      className={cn("flex flex-col rounded-xl p-2 gap-1.5", col.col)}
                    >
                      {/* Column header */}
                      <div className="flex items-center justify-between px-1 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                              col.chip,
                            )}
                          >
                            <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                            {col.label}
                          </span>
                          <span className="text-xs text-foreground/40">{items.length}</span>
                        </div>
                        {podeEditar && (
                          <button
                            onClick={abrirNova}
                            className="rounded p-0.5 text-foreground/30 transition-colors hover:bg-background hover:text-foreground/70"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Cards */}
                      <KanbanColumnContent
                        value={col.id}
                        className="flex flex-col gap-2 min-h-[80px]"
                      >
                        {items.map((tarefa) => (
                          <TarefaCard
                            key={tarefa.id}
                            tarefa={tarefa}
                            podeEditar={podeEditar}
                            onEditar={abrirEdicao}
                            onExcluir={setTarefaExcluir}
                          />
                        ))}
                      </KanbanColumnContent>

                      {/* Add button footer */}
                      {podeEditar && (
                        <button
                          onClick={abrirNova}
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                            col.add,
                          )}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nova tarefa
                        </button>
                      )}
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
                  return <TarefaCardContent tarefa={tarefa} />;
                }}
              </KanbanOverlay>
            </Kanban>
          )}

          {/* Visão Tabela */}
          {visao === "tabela" &&
            (tarefas.length === 0 ? (
              <p className="text-sm text-foreground/50">Nenhuma tarefa encontrada.</p>
            ) : (
              <DashboardCard className="overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {TABELA_COLUNAS.map(({ label, icon: Icon }) => (
                        <th key={label} className={TH_CLASS}>
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-foreground/30" />
                            {label}
                          </span>
                        </th>
                      ))}
                      {podeEditar && <th className={cn(TH_CLASS, "w-10")} />}
                    </tr>
                  </thead>
                  <tbody>
                    {tarefas.map((t) => {
                      const atrasado = prazoAtrasado(t.prazo);
                      const responsaveis = getResponsaveis(t);
                      const Icone = getTarefaIcon(t.icone);
                      return (
                        <tr key={t.id} className={cn(ROW_CLASS, "group")}>
                          <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Icone className="h-3.5 w-3.5 flex-shrink-0 text-foreground/40" />
                              {t.titulo}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-foreground/60">
                            {t.projeto_titulo}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-foreground/60">
                            {t.milestone_titulo ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-foreground/60">
                            {responsaveis.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5">
                                <ResponsaveisAvatars pessoas={responsaveis} />
                                {responsaveis.length === 1 && responsaveis[0]!.nome}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-sm ${atrasado ? "text-red-500" : "text-foreground/60"}`}
                          >
                            {t.prazo ? prazoFormatado(t.prazo) : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusSelect
                              status={t.status}
                              onChange={(s) => mudarStatus(t.id, s)}
                              disabled={!podeEditar}
                            />
                          </td>
                          {podeEditar && (
                            <td className="px-2 py-2.5">
                              <div className="opacity-0 transition-opacity group-hover:opacity-100">
                                <TarefaMenu
                                  onEditar={() => abrirEdicao(t)}
                                  onExcluir={() => setTarefaExcluir(t)}
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DashboardCard>
            ))}
        </div>
      </div>

      <CriarTarefaSheet
        open={sheetAberto}
        onOpenChange={setSheetAberto}
        onSalvo={refetchTarefas}
        ligaId={minhaLiga?.id}
        tarefa={tarefaEdicao}
      />

      <AlertDialog
        open={!!tarefaExcluir}
        onOpenChange={(v) => {
          if (!v) setTarefaExcluir(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa <span className="font-medium text-foreground">{tarefaExcluir?.titulo}</span>{" "}
              será excluída permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void excluirTarefa();
              }}
              disabled={excluindo}
              className="bg-red-600 text-white hover:bg-red-600/90 focus:ring-red-600"
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
