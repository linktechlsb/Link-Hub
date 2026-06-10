import {
  BarChart3,
  BookOpen,
  Briefcase,
  Bug,
  Calendar,
  CheckSquare,
  Code,
  DollarSign,
  FileText,
  Flag,
  Heart,
  Image,
  Lightbulb,
  Mail,
  Megaphone,
  Palette,
  PenTool,
  Phone,
  Rocket,
  Search,
  Star,
  Target,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Catálogo de ícones disponíveis para os cards de tarefa.
// A chave é o nome salvo no banco (coluna `tarefas.icone`).
export const TAREFA_ICONES: Record<string, LucideIcon> = {
  "file-text": FileText,
  "check-square": CheckSquare,
  target: Target,
  flag: Flag,
  lightbulb: Lightbulb,
  rocket: Rocket,
  zap: Zap,
  star: Star,
  code: Code,
  bug: Bug,
  palette: Palette,
  "pen-tool": PenTool,
  image: Image,
  video: Video,
  megaphone: Megaphone,
  users: Users,
  briefcase: Briefcase,
  "book-open": BookOpen,
  "dollar-sign": DollarSign,
  "bar-chart": BarChart3,
  search: Search,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  heart: Heart,
};

export const DEFAULT_ICONE = "file-text";

export function getTarefaIcon(nome?: string | null): LucideIcon {
  return (nome && TAREFA_ICONES[nome]) || TAREFA_ICONES[DEFAULT_ICONE]!;
}
