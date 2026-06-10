import { FolderKanban, SlidersHorizontal, Tag, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Liga = { id: string; nome: string };
type StatusOption = { value: string; label: string };

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

export function ProjetosFilterBar({
  ligas,
  statusOptions,
  filtroLiga,
  setFiltroLiga,
  filtroStatus,
  setFiltroStatus,
}: {
  ligas: Liga[];
  statusOptions: StatusOption[];
  filtroLiga: string;
  setFiltroLiga: (v: string) => void;
  filtroStatus: string;
  setFiltroStatus: (v: string) => void;
}) {
  const temFiltrosAtivos = !!(filtroLiga || filtroStatus);
  const ligaNome = ligas.find((l) => l.id === filtroLiga)?.nome ?? "";
  const statusNome = statusOptions.find((s) => s.value === filtroStatus)?.label ?? "";

  function limparFiltros() {
    setFiltroLiga("");
    setFiltroStatus("");
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtrar
            {temFiltrosAtivos && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <FolderKanban className="h-3.5 w-3.5 text-foreground/50" />
              Liga
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                <DropdownMenuRadioGroup
                  value={filtroLiga}
                  onValueChange={(v) => setFiltroLiga(v === "__all__" ? "" : v)}
                >
                  <DropdownMenuRadioItem value="__all__">Todas as ligas</DropdownMenuRadioItem>
                  {ligas.map((l) => (
                    <DropdownMenuRadioItem key={l.id} value={l.id}>
                      {l.nome}
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
              <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                <DropdownMenuRadioGroup
                  value={filtroStatus}
                  onValueChange={(v) => setFiltroStatus(v === "__all__" ? "" : v)}
                >
                  <DropdownMenuRadioItem value="__all__">Todos os status</DropdownMenuRadioItem>
                  {statusOptions.map((s) => (
                    <DropdownMenuRadioItem key={s.value} value={s.value}>
                      {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {filtroLiga && <FilterChip label="Liga" value={ligaNome} onClear={() => setFiltroLiga("")} />}
      {filtroStatus && (
        <FilterChip label="Status" value={statusNome} onClear={() => setFiltroStatus("")} />
      )}

      {temFiltrosAtivos && (
        <button
          onClick={limparFiltros}
          className="text-xs text-foreground/40 transition-colors hover:text-foreground"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
