import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search, LayoutGrid, List, X, ChevronRight,
  FolderOpen, Clock, Pencil, CheckCircle, XCircle,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusStaff = "rascunho" | "em_aprovacao" | "ag_staff" | "rejeitado" | "aprovado";

type MembroStaff = { id: string; nome: string; iniciais: string; cargo: string };

type HistoricoEntry = {
  etapa: string;
  acao: "aprovado" | "recusado" | "submetido" | "revisado";
  por: string;
  em: string;
  motivo?: string;
};

type ProjetoStaff = {
  id: string;
  nome: string;
  liga: string;
  descricao: string;
  responsavel: string;
  iniciais: string;
  status: StatusStaff;
  receita?: number;
  prazo?: string;
  motivoRecusa?: string;
  submissaoEm?: string; // data em que entrou na fila do staff
  observacao?: string;
  membros?: MembroStaff[];
  historico?: HistoricoEntry[];
};

// ─── Configuração de status ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusStaff, { label: string; badge: string }> = {
  rascunho:     { label: "Rascunho",      badge: "bg-gray-100 text-gray-600" },
  em_aprovacao: { label: "Com Professor", badge: "bg-yellow-100 text-yellow-700" },
  ag_staff:     { label: "Aguardando Staff", badge: "bg-orange-100 text-orange-700" },
  rejeitado:    { label: "Recusado",      badge: "bg-red-100 text-red-700" },
  aprovado:     { label: "Aprovado",      badge: "bg-green-100 text-green-700" },
};

// Colunas do kanban
const COLUNAS_KANBAN: StatusStaff[] = ["em_aprovacao", "ag_staff", "aprovado", "rejeitado"];

const LIGAS = ["Todas as ligas", "Liga Tech", "Liga Finanças", "Liga Marketing", "Liga RH"];

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROJETOS_STAFF: ProjetoStaff[] = [
  {
    id: "s1",
    nome: "Automação de notas",
    liga: "Liga Tech",
    descricao: "Automatiza lançamento de notas via integração com o sistema acadêmico.",
    responsavel: "Pedro Alves",
    iniciais: "PA",
    status: "rascunho",
    prazo: "2026-05-10",
    historico: [
      { etapa: "Criação", acao: "submetido", por: "Pedro Alves", em: "2026-03-20" },
    ],
  },
  {
    id: "s2",
    nome: "App de presenças",
    liga: "Liga Tech",
    descricao: "Check-in via QR code para eventos das ligas.",
    responsavel: "Marina Silva",
    iniciais: "MS",
    status: "em_aprovacao",
    prazo: "2026-03-01",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Marina Silva",  em: "2026-02-10" },
      { etapa: "Professor", acao: "submetido", por: "Marina Silva",  em: "2026-02-15" },
    ],
  },
  {
    id: "s3",
    nome: "App de gestão de membros",
    liga: "Liga RH",
    descricao: "Sistema para cadastro e acompanhamento de membros das ligas.",
    responsavel: "Carla Nunes",
    iniciais: "CN",
    status: "em_aprovacao",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Carla Nunes", em: "2026-03-01" },
      { etapa: "Professor", acao: "submetido", por: "Carla Nunes", em: "2026-03-05" },
    ],
  },
  {
    id: "s4",
    nome: "API de integração acadêmica",
    liga: "Liga Tech",
    descricao: "Integração com o sistema acadêmico da faculdade.",
    responsavel: "Ana Lima",
    iniciais: "AL",
    status: "em_aprovacao",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Ana Lima", em: "2026-03-10" },
      { etapa: "Professor", acao: "submetido", por: "Ana Lima", em: "2026-04-11" },
    ],
  },
  {
    id: "s5",
    nome: "Plataforma de eventos",
    liga: "Liga Tech",
    descricao: "Sistema de inscrições e check-in via QR code para eventos da liga.",
    responsavel: "Lucas Ferreira",
    iniciais: "LF",
    status: "ag_staff",
    submissaoEm: "2026-04-08",
    receita: 4500,
    prazo: "2026-08-15",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Lucas Ferreira", em: "2026-02-01" },
      { etapa: "Professor", acao: "submetido", por: "Lucas Ferreira", em: "2026-02-10" },
      { etapa: "Professor", acao: "aprovado",  por: "Prof. Roberto",  em: "2026-02-20" },
      { etapa: "Staff",     acao: "submetido", por: "Lucas Ferreira", em: "2026-03-01" },
    ],
  },
  {
    id: "s6",
    nome: "Newsletter automática",
    liga: "Liga Marketing",
    descricao: "Envio semanal de resumos das atividades das ligas para os membros.",
    responsavel: "Renata Barros",
    iniciais: "RB",
    status: "ag_staff",
    submissaoEm: "2026-04-11",
    prazo: "2026-06-01",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Renata Barros", em: "2026-03-15" },
      { etapa: "Professor", acao: "submetido", por: "Renata Barros", em: "2026-03-20" },
      { etapa: "Professor", acao: "aprovado",  por: "Prof. Cláudia", em: "2026-03-28" },
      { etapa: "Staff",     acao: "submetido", por: "Renata Barros", em: "2026-04-08" },
    ],
  },
  {
    id: "s7",
    nome: "Landing page da liga",
    liga: "Liga Tech",
    descricao: "Página pública com membros, projetos e conquistas.",
    responsavel: "Ana Lima",
    iniciais: "AL",
    status: "aprovado",
    receita: 2500,
    prazo: "2025-06-30",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Ana Lima",      em: "2025-03-01" },
      { etapa: "Professor", acao: "aprovado",  por: "Prof. Roberto", em: "2025-03-15" },
      { etapa: "Staff",     acao: "aprovado",  por: "Staff",         em: "2025-04-01" },
    ],
  },
  {
    id: "s8",
    nome: "Relatório financeiro trimestral",
    liga: "Liga Finanças",
    descricao: "Consolidação e apresentação dos resultados financeiros das ligas a cada trimestre.",
    responsavel: "Rafael Costa",
    iniciais: "RC",
    status: "aprovado",
    receita: 3200,
    prazo: "2026-07-01",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Rafael Costa",  em: "2026-01-10" },
      { etapa: "Professor", acao: "aprovado",  por: "Prof. Fátima",  em: "2026-01-20" },
      { etapa: "Staff",     acao: "aprovado",  por: "Staff",         em: "2026-02-01" },
    ],
  },
  {
    id: "s9",
    nome: "Campanha de captação",
    liga: "Liga Marketing",
    descricao: "Campanha para atrair novos membros nas semanas de calouros.",
    responsavel: "Beatriz Costa",
    iniciais: "BC",
    status: "rejeitado",
    motivoRecusa: "Orçamento acima do permitido para o semestre.",
    historico: [
      { etapa: "Criação",   acao: "submetido", por: "Beatriz Costa", em: "2026-02-05" },
      { etapa: "Professor", acao: "aprovado",  por: "Prof. Cláudia", em: "2026-02-12" },
      { etapa: "Staff",     acao: "recusado",  por: "Staff",         em: "2026-02-20",
        motivo: "Orçamento acima do permitido para o semestre." },
    ],
  },
  {
    id: "s10",
    nome: "Treinamento de líderes",
    liga: "Liga RH",
    descricao: "Programa semestral de capacitação para líderes de ligas.",
    responsavel: "Carla Nunes",
    iniciais: "CN",
    status: "rascunho",
    prazo: "2026-09-01",
    historico: [
      { etapa: "Criação", acao: "submetido", por: "Carla Nunes", em: "2026-04-01" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarReceita(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function diasAguardando(submissaoEm?: string): number | null {
  if (!submissaoEm) return null;
  const diff = Date.now() - new Date(submissaoEm + "T00:00:00").getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function estaVencido(prazo?: string) {
  if (!prazo) return false;
  return new Date(prazo + "T00:00:00") < new Date(new Date().toDateString());
}

// ─── Subcomponentes base ──────────────────────────────────────────────────────

function Avatar({ iniciais, size = "sm" }: { iniciais: string; size?: "sm" | "md" }) {
  return (
    <div className={cn(
      "rounded-full bg-navy text-white font-bold flex items-center justify-center shrink-0",
      size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
    )}>
      {iniciais}
    </div>
  );
}

function StatusBadge({ status }: { status: StatusStaff }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap", s.badge)}>
      {s.label}
    </span>
  );
}

function LigaBadge({ liga }: { liga: string }) {
  const cor: Record<string, string> = {
    "Liga Tech":     "bg-blue-100 text-blue-700",
    "Liga Finanças": "bg-emerald-100 text-emerald-700",
    "Liga Marketing":"bg-pink-100 text-pink-700",
    "Liga RH":       "bg-violet-100 text-violet-700",
  };
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap", cor[liga] ?? "bg-gray-100 text-gray-600")}>
      {liga.replace("Liga ", "")}
    </span>
  );
}

function ColunaVazia() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-brand-gray rounded-lg">
      <FolderOpen className="h-6 w-6 text-brand-gray" strokeWidth={1.5} />
      <p className="text-xs text-muted-foreground/70 text-center leading-snug">
        Nenhum projeto<br />aqui ainda
      </p>
    </div>
  );
}

// ─── Modal de recusa ──────────────────────────────────────────────────────────

function ModalRecusar({
  nomeProjeto,
  onFechar,
  onConfirmar,
}: {
  nomeProjeto: string;
  onFechar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-navy">Recusar projeto</h2>
          <button onClick={onFechar} className="text-muted-foreground hover:text-navy transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Informe o motivo da recusa de <span className="font-medium text-navy">"{nomeProjeto}"</span>.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Descreva o motivo da recusa..."
          rows={4}
          autoFocus
          className="w-full text-sm border border-brand-gray rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm font-medium border border-brand-gray rounded-md text-link-blue hover:border-navy/40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(motivo.trim())}
            disabled={!motivo.trim()}
            className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar recusa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Painel de detalhes ───────────────────────────────────────────────────────

function PainelDetalhes({
  projeto,
  onFechar,
  onSalvar,
}: {
  projeto: ProjetoStaff;
  onFechar: () => void;
  onSalvar: (p: ProjetoStaff) => void;
}) {
  const [nome, setNome] = useState(projeto.nome);
  const [descricao, setDescricao] = useState(projeto.descricao);
  const [prazo, setPrazo] = useState(projeto.prazo ?? "");
  const [receita, setReceita] = useState(projeto.receita?.toString() ?? "");
  const [observacao, setObservacao] = useState(projeto.observacao ?? "");

  const vencido = estaVencido(prazo);

  const inputClass = "w-full text-sm border border-brand-gray rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40";
  const labelClass = "text-xs font-bold text-link-blue uppercase tracking-wider block mb-1";

  const ACAO_CONFIG: Record<HistoricoEntry["acao"], { label: string; cls: string }> = {
    submetido: { label: "Submetido",  cls: "bg-gray-100 text-gray-600" },
    aprovado:  { label: "Aprovado",   cls: "bg-green-100 text-green-700" },
    recusado:  { label: "Recusado",   cls: "bg-red-100 text-red-700" },
    revisado:  { label: "Revisado",   cls: "bg-blue-100 text-blue-700" },
  };

  return (
    <div className="bg-white border border-brand-gray rounded-lg p-6 mx-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <LigaBadge liga={projeto.liga} />
          <StatusBadge status={projeto.status} />
          {vencido && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
              Atrasado
            </span>
          )}
        </div>
        <button onClick={onFechar} className="text-muted-foreground hover:text-navy transition-colors ml-4 shrink-0" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Campos editáveis */}
      <div className="grid grid-cols-1 gap-4 mb-5">
        <div>
          <label className={labelClass}>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Descrição</label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={cn(inputClass, "resize-none")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Prazo</label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className={cn(inputClass, vencido && "border-red-300 focus:ring-red-200")}
            />
            {vencido && <p className="text-xs text-red-600 mt-1">Prazo vencido</p>}
          </div>
          <div>
            <label className={labelClass}>Receita (R$)</label>
            <input type="number" value={receita} onChange={(e) => setReceita(e.target.value)} placeholder="0" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Responsável */}
      <div className="mb-5">
        <span className={labelClass}>Responsável</span>
        <div className="flex items-center gap-2 mt-1">
          <Avatar iniciais={projeto.iniciais} size="md" />
          <span className="text-sm text-navy">{projeto.responsavel}</span>
        </div>
      </div>

      {/* Membros */}
      {projeto.membros && projeto.membros.length > 0 && (
        <div className="mb-5">
          <span className={labelClass}>Membros</span>
          <div className="flex gap-2 mt-2 flex-wrap">
            {projeto.membros.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 bg-navy/5 border border-navy/10 rounded-full pl-1 pr-2 py-1">
                <div className="h-5 w-5 rounded-full bg-navy text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  {m.iniciais}
                </div>
                <div>
                  <span className="text-xs font-medium text-navy">{m.nome}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">· {m.cargo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivo de recusa */}
      {projeto.motivoRecusa && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-5">
          <p className="text-xs font-bold text-red-700 mb-1">Motivo da recusa</p>
          <p className="text-sm text-red-600">{projeto.motivoRecusa}</p>
        </div>
      )}

      {/* Observação */}
      <div className="mb-5">
        <label className={labelClass}>Observação</label>
        <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Informações adicionais..." rows={3} className={cn(inputClass, "resize-none")} />
      </div>

      {/* Histórico de aprovações */}
      {projeto.historico && projeto.historico.length > 0 && (
        <div className="mb-5">
          <span className={labelClass}>Histórico de aprovações</span>
          <div className="mt-2 space-y-2">
            {projeto.historico.map((h, i) => {
              const ac = ACAO_CONFIG[h.acao];
              return (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0", ac.cls)}>
                    {ac.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-navy font-medium">{h.etapa}</span>
                    <span className="text-muted-foreground"> · {h.por}</span>
                    <span className="text-muted-foreground text-xs ml-1">— {formatarData(h.em)}</span>
                    {h.motivo && <p className="text-xs text-red-600 mt-0.5">{h.motivo}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => onSalvar({ ...projeto, nome, descricao, prazo: prazo || undefined, receita: receita ? Number(receita) : undefined, observacao: observacao || undefined })}
          className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy/90 transition-colors"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

// ─── Card Kanban ──────────────────────────────────────────────────────────────

function KanbanCard({
  projeto,
  onVerDetalhes,
  onEditar,
  onAprovar,
  onRecusar,
}: {
  projeto: ProjetoStaff;
  onVerDetalhes: () => void;
  onEditar: () => void;
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
}) {
  const vencido = estaVencido(projeto.prazo);
  const dias = diasAguardando(projeto.submissaoEm);

  return (
    <div
      className="bg-white border border-brand-gray rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onVerDetalhes}
    >
      {/* Badges de liga + ação editar */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <LigaBadge liga={projeto.liga} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEditar(); }}
          className="text-muted-foreground hover:text-navy transition-colors shrink-0 p-0.5"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Nome + seta */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-bold text-sm text-navy leading-snug">{projeto.nome}</p>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      </div>

      {/* Descrição */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{projeto.descricao}</p>

      {/* Receita */}
      {projeto.receita && (
        <p className="text-xs text-link-blue font-medium mb-2">{formatarReceita(projeto.receita)}</p>
      )}

      {/* Prazo */}
      {projeto.prazo && (
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className={cn("h-3 w-3 shrink-0", vencido ? "text-red-500" : "text-muted-foreground")} />
          <span className={cn("text-xs", vencido ? "text-red-600 font-medium" : "text-muted-foreground")}>
            {formatarData(projeto.prazo)}
          </span>
          {vencido && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 leading-none">
              Atrasado
            </span>
          )}
        </div>
      )}

      {/* Há X dias aguardando — somente ag_staff */}
      {projeto.status === "ag_staff" && dias !== null && (
        <p className="text-[11px] text-orange-600 font-medium mb-2 flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {dias === 0 ? "Recebido hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`}
        </p>
      )}

      {/* Responsável */}
      <div className="flex items-center gap-1.5 mb-3">
        <Avatar iniciais={projeto.iniciais} />
        <span className="text-xs text-muted-foreground">{projeto.responsavel}</span>
      </div>

      {/* Ações Staff — somente ag_staff */}
      {projeto.status === "ag_staff" && (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAprovar(projeto.id); }}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Aprovar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRecusar(projeto.id); }}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Recusar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── View principal do Staff ──────────────────────────────────────────────────

export function ProjetosStaffView() {
  const [projetos, setProjetos] = useState<ProjetoStaff[]>(MOCK_PROJETOS_STAFF);
  const [busca, setBusca] = useState("");
  const [filtroLiga, setFiltroLiga] = useState("Todas as ligas");
  const [filtroStatus, setFiltroStatus] = useState<StatusStaff | "todos">("todos");
  const [visualizacao, setVisualizacao] = useState<"kanban" | "lista">("kanban");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [recusarId, setRecusarId] = useState<string | null>(null);

  // ── Filtros ────────────────────────────────────────────────────────────────

  const projetosFiltrados = projetos.filter((p) => {
    const passaLiga   = filtroLiga === "Todas as ligas" || p.liga === filtroLiga;
    const passaStatus = filtroStatus === "todos" || p.status === filtroStatus;
    const passaBusca  = p.nome.toLowerCase().includes(busca.toLowerCase());
    return passaLiga && passaStatus && passaBusca;
  }).sort((a, b) => {
    const da = a.prazo ?? "9999-99-99";
    const db = b.prazo ?? "9999-99-99";
    return da.localeCompare(db);
  });

  // ── Subtítulo dinâmico ────────────────────────────────────────────────────

  const aguardandoStaff = projetos.filter((p) => p.status === "ag_staff").length;
  const subtitulo = aguardandoStaff > 0
    ? `${aguardandoStaff} ${aguardandoStaff === 1 ? "projeto aguardando aprovação" : "projetos aguardando aprovação"}`
    : `${projetos.length} projetos no total`;

  // ── Ações ─────────────────────────────────────────────────────────────────

  function aprovar(id: string) {
    const hoje = new Date().toISOString().substring(0, 10);
    setProjetos((prev) => prev.map((p) =>
      p.id !== id ? p : {
        ...p,
        status: "aprovado" as StatusStaff,
        historico: [...(p.historico ?? []), { etapa: "Staff", acao: "aprovado", por: "Staff", em: hoje }],
      }
    ));
    if (selecionado === id) setSelecionado(null);
  }

  function recusar(id: string, motivo: string) {
    const hoje = new Date().toISOString().substring(0, 10);
    setProjetos((prev) => prev.map((p) =>
      p.id !== id ? p : {
        ...p,
        status: "rejeitado" as StatusStaff,
        motivoRecusa: motivo,
        historico: [...(p.historico ?? []), { etapa: "Staff", acao: "recusado", por: "Staff", em: hoje, motivo }],
      }
    ));
    setRecusarId(null);
    if (selecionado === id) setSelecionado(null);
  }

  function salvarProjeto(atualizado: ProjetoStaff) {
    setProjetos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
    setSelecionado(null);
  }

  function toggleSelecionado(id: string) {
    setSelecionado((prev) => (prev === id ? null : id));
  }

  const projetoSelecionado = projetos.find((p) => p.id === selecionado);
  const projetoParaRecusar = projetos.find((p) => p.id === recusarId);

  const STATUS_OPTIONS: { value: StatusStaff | "todos"; label: string }[] = [
    { value: "todos",        label: "Todos" },

    { value: "em_aprovacao", label: "Com Professor" },
    { value: "ag_staff",     label: "Aguardando Staff" },
    { value: "aprovado",     label: "Aprovado" },
    { value: "rejeitado",    label: "Recusado" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitulo}</p>
        </div>
      </div>

      {/* Pills de liga */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {LIGAS.map((liga) => (
          <button
            key={liga}
            onClick={() => setFiltroLiga(liga)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full border transition-colors",
              filtroLiga === liga
                ? "bg-navy text-white border-navy"
                : "bg-white text-link-blue border-brand-gray hover:border-navy/40"
            )}
          >
            {liga}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Select de status */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusStaff | "todos")}
          className="text-sm border border-brand-gray rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 text-link-blue"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-brand-gray rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 w-52"
          />
        </div>

        {/* Toggle kanban/lista */}
        <div className="ml-auto flex items-center border border-brand-gray rounded-md overflow-hidden">
          <button
            onClick={() => setVisualizacao("kanban")}
            className={cn("p-2 transition-colors", visualizacao === "kanban" ? "bg-navy text-white" : "bg-white text-link-blue hover:bg-gray-50")}
            title="Kanban"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setVisualizacao("lista")}
            className={cn("p-2 transition-colors", visualizacao === "lista" ? "bg-navy text-white" : "bg-white text-link-blue hover:bg-gray-50")}
            title="Lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Painel de detalhes acima do kanban */}
      {projetoSelecionado && visualizacao === "kanban" && (
        <div className="mb-6">
          <PainelDetalhes
            projeto={projetoSelecionado}
            onFechar={() => setSelecionado(null)}
            onSalvar={salvarProjeto}
          />
        </div>
      )}

      {/* ── Kanban ─────────────────────────────────────────────────────────── */}
      {visualizacao === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUNAS_KANBAN.map((col) => {
            const colProjetos = projetosFiltrados.filter((p) => p.status === col);
            const cfg = STATUS_CONFIG[col];
            return (
              <div key={col}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", cfg.badge)}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{colProjetos.length}</span>
                </div>
                <div className="space-y-3">
                  {colProjetos.length === 0 ? (
                    <ColunaVazia />
                  ) : (
                    colProjetos.map((p) => (
                      <KanbanCard
                        key={p.id}
                        projeto={p}
                        onVerDetalhes={() => toggleSelecionado(p.id)}
                        onEditar={() => toggleSelecionado(p.id)}
                        onAprovar={aprovar}
                        onRecusar={(id) => setRecusarId(id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Lista ──────────────────────────────────────────────────────────── */}
      {visualizacao === "lista" && (
        <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-gray">
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Projeto</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Liga</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Receita</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {projetosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="h-8 w-8 text-brand-gray" strokeWidth={1.5} />
                      <p className="text-sm text-muted-foreground/70">Nenhum projeto encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                projetosFiltrados.map((p) => {
                  const isAberto = selecionado === p.id;
                  const vencido  = estaVencido(p.prazo);
                  return (
                    <>
                      <tr
                        key={p.id}
                        onClick={() => toggleSelecionado(p.id)}
                        className={cn(
                          "border-b border-brand-gray cursor-pointer transition-colors hover:bg-gray-50",
                          isAberto && "bg-gray-50"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-navy">{p.nome}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{p.descricao}</div>
                          {p.prazo && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className={cn("h-3 w-3", vencido ? "text-red-500" : "text-muted-foreground")} />
                              <span className={cn("text-xs", vencido ? "text-red-600 font-medium" : "text-muted-foreground")}>
                                {formatarData(p.prazo)}
                              </span>
                              {vencido && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 leading-none">
                                  Atrasado
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4"><LigaBadge liga={p.liga} /></td>
                        <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                        <td className="px-6 py-4 font-medium text-navy">
                          {p.receita ? formatarReceita(p.receita) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          {p.status === "ag_staff" ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => aprovar(p.id)}
                                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Aprovar
                              </button>
                              <button
                                onClick={() => setRecusarId(p.id)}
                                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Recusar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelecionado(p.id); }}
                              className="text-muted-foreground hover:text-navy transition-colors p-1"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {isAberto && (
                        <tr key={`${p.id}-detalhe`}>
                          <td colSpan={5} className="px-4 pb-4 pt-0 bg-gray-50">
                            <PainelDetalhes
                              projeto={p}
                              onFechar={() => setSelecionado(null)}
                              onSalvar={salvarProjeto}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal recusa */}
      {recusarId && projetoParaRecusar && (
        <ModalRecusar
          nomeProjeto={projetoParaRecusar.nome}
          onFechar={() => setRecusarId(null)}
          onConfirmar={(motivo) => recusar(recusarId, motivo)}
        />
      )}
    </div>
  );
}
