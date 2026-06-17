import {
  Link,
  FileText,
  Image,
  Globe,
  Folder,
  BookOpen,
  Code2,
  Video,
  Music,
  Star,
  Pencil,
  type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const ICONES: { id: string; componente: LucideIcon }[] = [
  { id: "link", componente: Link },
  { id: "file-text", componente: FileText },
  { id: "image", componente: Image },
  { id: "globe", componente: Globe },
  { id: "folder", componente: Folder },
  { id: "book-open", componente: BookOpen },
  { id: "code2", componente: Code2 },
  { id: "video", componente: Video },
  { id: "music", componente: Music },
  { id: "star", componente: Star },
];

export const CORES_PICKER = [
  "#10284E",
  "#546484",
  "#7C3AED",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#DB2777",
  "#0D9488",
];

export function iconeComponente(id: string): LucideIcon {
  return ICONES.find((i) => i.id === id)?.componente ?? Link;
}

export function RecursoIcone({ id, className }: { id: string; className?: string }) {
  const Comp = iconeComponente(id);
  return <Comp className={className ?? "h-4 w-4 text-white"} />;
}

export function IconeCor({
  icone,
  cor,
  onChange,
}: {
  icone: string;
  cor: string;
  onChange: (icone: string, cor: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative h-9 w-9 flex items-center justify-center rounded-full border-2 border-transparent hover:border-border transition-colors shrink-0 outline-none"
          style={{ backgroundColor: cor }}
          title="Escolher ícone e cor"
        >
          <span className="group-hover:opacity-0 transition-opacity">
            <RecursoIcone id={icone} />
          </span>
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <Pencil className="h-3.5 w-3.5 text-white" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-3">
        <DropdownMenuLabel className="text-xs text-foreground/40 px-0 pb-2">
          Ícone
        </DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-1.5">
          {ICONES.map((ic) => {
            const Comp = ic.componente;
            return (
              <button
                key={ic.id}
                type="button"
                onClick={() => onChange(ic.id, cor)}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded transition-colors",
                  icone === ic.id
                    ? "bg-foreground text-background"
                    : "bg-foreground/[0.06] text-foreground/60 hover:bg-foreground/[0.10]",
                )}
              >
                <Comp className="h-4 w-4" />
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator className="my-3" />
        <DropdownMenuLabel className="text-xs text-foreground/40 px-0 pb-2">Cor</DropdownMenuLabel>
        <div className="flex flex-wrap gap-1.5">
          {CORES_PICKER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(icone, c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                cor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
