import {
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpRight, FilterX, ListFilter } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/reui/badge";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Filters, type Filter, type FilterFieldConfig } from "@/components/reui/filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { DashboardCard } from "./DashboardCard";

import type { HomeData } from "../v1/useHomeData";

/** Linha de tarefa retornada por GET /api/tarefas. */
interface TarefaRow {
  id: string;
  titulo: string;
  status: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  responsavel_avatar?: string;
  responsavel_role?: string;
  prazo?: string;
}

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  professor: "Professor",
  membro: "Membro",
  estudante: "Estudante",
};

const STATUS_INFO: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-amber-500/10 text-amber-600 dark:text-amber-300" }, // amarelo
  em_andamento: {
    label: "Em andamento",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  }, // roxo
  concluida: {
    label: "Concluída",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  }, // verde
  arquivada: { label: "Arquivada", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" }, // cinza
};

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function formatPrazo(prazo?: string): string {
  if (!prazo) return "—";
  const d = new Date(prazo.includes("T") ? prazo : `${prazo}T00:00:00`);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Mantém apenas filtros com valores reais. */
function filtrosAtivos(filters: Filter[]): Filter[] {
  return filters.filter(
    (f) =>
      f.values &&
      f.values.length > 0 &&
      !f.values.every((v) => typeof v === "string" && v.trim() === ""),
  );
}

/** Aplica os filtros do reui à lista (síncrono). */
function aplicarFiltros(data: TarefaRow[], filters: Filter[]): TarefaRow[] {
  let out = data;
  for (const { field, operator, values } of filtrosAtivos(filters)) {
    out = out.filter((item) => {
      const v = item[field as keyof TarefaRow];
      switch (operator) {
        case "is":
          return values.includes(v);
        case "is_not":
          return !values.includes(v);
        case "contains":
          return values.some((x) =>
            String(v ?? "")
              .toLowerCase()
              .includes(String(x).toLowerCase()),
          );
        case "not_contains":
          return !values.some((x) =>
            String(v ?? "")
              .toLowerCase()
              .includes(String(x).toLowerCase()),
          );
        default:
          return true;
      }
    });
  }
  return out;
}

export function HomeTasksPanel({ data }: { data: HomeData }) {
  const { role, usuarioId } = data;
  const ehPessoal = role === "membro" || role === "estudante";

  const [tarefas, setTarefas] = useState<TarefaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if (!role) return;
    let cancelado = false;
    async function carregar() {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        if (!cancelado) setLoading(false);
        return;
      }
      const res = await fetch(`/api/tarefas`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok && !cancelado) setTarefas(await res.json());
      if (!cancelado) setLoading(false);
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, [role]);

  const concluirTarefa = useCallback(async (id: string) => {
    setTarefas((prev) => prev.filter((t) => t.id !== id));
    const token = await getToken();
    if (!token) return;
    await fetch(`/api/tarefas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "concluida" }),
    });
  }, []);

  // Escopo por papel + filtros do reui
  const baseData = useMemo(
    () =>
      ehPessoal
        ? tarefas.filter((t) => t.responsavel_id === usuarioId && t.status !== "concluida")
        : tarefas.filter((t) => t.status !== "arquivada"),
    [tarefas, ehPessoal, usuarioId],
  );
  const filteredData = useMemo(() => aplicarFiltros(baseData, filters), [baseData, filters]);

  // Campos de filtro
  const fields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: "responsavel_role",
        label: "Cargo",
        type: "select",
        searchable: false,
        className: "w-40",
        options: [
          { value: "diretor", label: "Diretor" },
          { value: "professor", label: "Professor" },
          { value: "membro", label: "Membro" },
          { value: "estudante", label: "Estudante" },
          { value: "staff", label: "Staff" },
        ],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        searchable: false,
        className: "w-40",
        options: [
          { value: "pendente", label: "Pendente" },
          { value: "em_andamento", label: "Em andamento" },
          { value: "concluida", label: "Concluída" },
        ],
      },
    ],
    [],
  );

  const columns = useMemo<ColumnDef<TarefaRow>[]>(() => {
    const cols: ColumnDef<TarefaRow>[] = [];

    if (ehPessoal) {
      cols.push({
        id: "done",
        header: () => null,
        cell: ({ row }) => (
          <Checkbox
            onCheckedChange={() => void concluirTarefa(row.original.id)}
            aria-label={`Concluir ${row.original.titulo}`}
            className="data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-400 data-[state=checked]:text-background"
          />
        ),
        size: 44,
        enableSorting: false,
        meta: { skeleton: <Skeleton className="size-4 rounded-sm" /> },
      });
    }

    cols.push(
      {
        accessorKey: "titulo",
        id: "titulo",
        header: ({ column }) => (
          <DataGridColumnHeader title="Título" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">{row.original.titulo}</span>
        ),
        size: 180,
        enableSorting: true,
        enableHiding: false,
        meta: { skeleton: <Skeleton className="h-4 w-40" /> },
      },
      {
        accessorKey: "responsavel_nome",
        id: "responsavel_nome",
        header: ({ column }) => (
          <DataGridColumnHeader title="Responsável" column={column} className="text-xs" />
        ),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <UserAvatar nome={r.responsavel_nome} src={r.responsavel_avatar} className="size-7" />
              <div className="space-y-px">
                <div className="text-xs font-medium text-foreground">
                  {r.responsavel_nome ?? "Não atribuída"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {r.responsavel_role
                    ? (ROLE_LABEL[r.responsavel_role] ?? r.responsavel_role)
                    : "—"}
                </div>
              </div>
            </div>
          );
        },
        size: 220,
        enableSorting: true,
        enableHiding: false,
        meta: {
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          ),
        },
      },
      {
        accessorKey: "status",
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} className="text-xs" />
        ),
        cell: ({ row }) => {
          const s = STATUS_INFO[row.original.status] ?? STATUS_INFO["pendente"]!;
          return (
            <Badge
              variant="outline"
              size="sm"
              className={cn("border-transparent text-[10px]", s.className)}
            >
              {s.label}
            </Badge>
          );
        },
        size: 130,
        enableSorting: true,
        meta: { skeleton: <Skeleton className="h-5 w-20 rounded-full" /> },
      },
      {
        accessorKey: "prazo",
        id: "prazo",
        header: ({ column }) => (
          <DataGridColumnHeader title="Prazo" column={column} className="text-xs" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{formatPrazo(row.original.prazo)}</span>
        ),
        size: 100,
        enableSorting: true,
        meta: { skeleton: <Skeleton className="h-4 w-12" /> },
      },
    );

    return cols;
  }, [ehPessoal, concluirTarefa]);

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  useEffect(() => {
    setColumnOrder(columns.map((c) => c.id as string));
  }, [columns]);

  const table = useReactTable({
    columns,
    data: filteredData,
    getRowId: (row) => row.id,
    state: { sorting, columnOrder },
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DashboardCard className="flex h-[26rem] flex-col gap-3 p-5">
      {/* Header: título + botão de filtro (canto superior direito) */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-xs text-foreground/40">{ehPessoal ? "Minhas tarefas" : "Tarefas"}</h3>
        <div className="flex items-center gap-2">
          {filtrosAtivos(filters).length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setFilters([])}>
              <FilterX className="size-3.5" />
              Limpar
            </Button>
          )}
          <Filters
            filters={filters}
            fields={fields}
            onChange={setFilters}
            size="sm"
            showSearchInput={false}
            trigger={
              <Button variant="outline" size="icon-sm" aria-label="Filtros">
                <ListFilter className="size-3.5" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Data grid */}
      <DataGrid
        table={table}
        isLoading={loading}
        loadingMode="skeleton"
        recordCount={filteredData.length}
        emptyMessage={ehPessoal ? "Nenhuma tarefa pendente." : "Nenhuma tarefa."}
        tableLayout={{ dense: true }}
      >
        <DataGridContainer className="min-h-0 flex-1 border-border">
          <div className="h-full overflow-auto">
            <DataGridTable />
          </div>
        </DataGridContainer>
      </DataGrid>

      {/* Rodapé: "Ver todas" no canto inferior direito */}
      <div className="flex shrink-0 justify-end pt-1">
        <Link
          to="/tarefas"
          className="flex items-center gap-1 text-[11px] text-foreground/40 transition-colors hover:text-foreground"
        >
          Ver todas <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </DashboardCard>
  );
}
