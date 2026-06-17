import { ChevronsUpDown, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface LigaOption {
  id: string;
  nome: string;
}

interface MultiSelectLigasProps {
  ligas: LigaOption[];
  /** IDs das ligas co-participantes selecionadas. */
  selecionadas: string[];
  onChange: (ids: string[]) => void;
  /** Liga principal — removida das opções para não se selecionar a si mesma. */
  excluirId?: string;
  placeholder?: string;
}

/**
 * Seletor de múltiplas ligas (participação em conjunto). Mostra as ligas
 * selecionadas como chips e abre um popover com checkboxes das demais.
 */
export function MultiSelectLigas({
  ligas,
  selecionadas,
  onChange,
  excluirId,
  placeholder = "Selecionar ligas...",
}: MultiSelectLigasProps) {
  const disponiveis = ligas.filter((l) => l.id !== excluirId);
  const selecionadasObj = disponiveis.filter((l) => selecionadas.includes(l.id));

  function toggle(id: string) {
    if (selecionadas.includes(id)) onChange(selecionadas.filter((x) => x !== id));
    else onChange([...selecionadas, id]);
  }

  return (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
          >
            <span className={selecionadasObj.length ? "text-foreground" : "text-foreground/20"}>
              {selecionadasObj.length
                ? `${selecionadasObj.length} liga${selecionadasObj.length === 1 ? "" : "s"} selecionada${selecionadasObj.length === 1 ? "" : "s"}`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <div className="max-h-56 overflow-y-auto py-1">
            {disponiveis.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-foreground/50 px-3 py-2">
                Nenhuma liga disponível.
              </p>
            ) : (
              disponiveis.map((l) => {
                const checked = selecionadas.includes(l.id);
                return (
                  <label
                    key={l.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(l.id)}
                      className="accent-navy"
                    />
                    <span className="font-plex-sans text-[13px] text-foreground truncate">
                      {l.nome}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selecionadasObj.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selecionadasObj.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full bg-navy/8 border border-navy/20 px-2.5 py-1 font-plex-sans text-[11px] text-navy"
            >
              {l.nome}
              <button
                type="button"
                onClick={() => toggle(l.id)}
                className="text-navy/50 hover:text-navy"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
