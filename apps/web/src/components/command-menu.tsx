import {
  BookOpen,
  Calendar,
  ClipboardList,
  Command,
  FileText,
  FolderOpen,
  Home,
  MessageSquare,
  Settings,
  Shield,
  Trophy,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useUser } from "@/hooks/use-user";

import type { Liga, Projeto, UserRole } from "@link-leagues/types";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, path: "/home" },
  { id: "ligas", label: "Ligas", icon: BookOpen, path: "/ligas" },
  { id: "projetos", label: "Projetos", icon: FolderOpen, path: "/projetos" },
  { id: "agenda", label: "Agenda", icon: Calendar, path: "/agenda" },
  { id: "mural", label: "Mural", icon: MessageSquare, path: "/mural" },
  { id: "ranking", label: "Ranking", icon: Trophy, path: "/ranking" },
  {
    id: "presenca",
    label: "Presença",
    icon: ClipboardList,
    path: "/presenca",
    roles: ["staff", "diretor"],
  },
  {
    id: "formularios",
    label: "Formulários",
    icon: FileText,
    path: "/formularios",
    roles: ["staff", "diretor"],
  },
  {
    id: "gerenciamento",
    label: "Gerenciamento",
    icon: Settings,
    path: "/gerenciamento",
    roles: ["staff"],
  },
  {
    id: "super-admin",
    label: "Super Admin",
    icon: Shield,
    path: "/super-admin",
    roles: ["staff"],
  },
  { id: "conta", label: "Minha Conta", icon: User, path: "/conta" },
];

const QUICK_ACTIONS: NavItem[] = [
  {
    id: "novo-formulario",
    label: "Novo formulário",
    icon: FileText,
    path: "/formularios/novo",
    roles: ["staff", "diretor"],
  },
  {
    id: "gerenciar-usuarios",
    label: "Gerenciar usuários",
    icon: Settings,
    path: "/gerenciamento",
    roles: ["staff"],
  },
  {
    id: "ver-minha-liga",
    label: "Ver minha liga",
    icon: BookOpen,
    path: "/ligas",
    roles: ["membro", "estudante"],
  },
  {
    id: "ver-presenca",
    label: "Ver minha presença",
    icon: ClipboardList,
    path: "/presenca",
    roles: ["membro", "estudante", "professor"],
  },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [commandValue, setCommandValue] = useState("");
  const navigate = useNavigate();
  const { role } = useUser();

  const { data: ligas } = useCachedFetch<Liga[]>(open ? "/api/ligas" : null);
  const { data: projetos } = useCachedFetch<Projeto[]>(open ? "/api/projetos" : null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) setCommandValue("");
  }, [open]);

  function run(path: string) {
    navigate(path);
    setOpen(false);
  }

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  const visibleActions = QUICK_ACTIONS.filter((item) => role && item.roles!.includes(role));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-gray bg-white text-muted-foreground transition-colors hover:bg-brand-gray dark:border-white/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20"
        aria-label="Abrir menu de busca"
      >
        <Command size={13} />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        value={commandValue}
        onValueChange={setCommandValue}
      >
        <CommandInput placeholder="Buscar páginas, ações, ligas..." />
        <CommandList onMouseLeave={() => setCommandValue("")}>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          <CommandGroup heading="Navegar">
            {visibleNavItems.map((item) => (
              <CommandItem key={item.id} onSelect={() => run(item.path)}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {visibleActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ações Rápidas">
                {visibleActions.map((item) => (
                  <CommandItem key={item.id} onSelect={() => run(item.path)}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {ligas && ligas.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ligas">
                {ligas
                  .filter((l) => l.ativo)
                  .map((liga) => (
                    <CommandItem key={liga.id} onSelect={() => run(`/ligas/${liga.id}`)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      {liga.nome}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}

          {projetos && projetos.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projetos">
                {projetos.map((projeto) => (
                  <CommandItem key={projeto.id} onSelect={() => run("/projetos")}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {projeto.titulo}
                    {projeto.liga && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {projeto.liga.nome}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
