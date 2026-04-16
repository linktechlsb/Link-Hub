import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Plus, X, LayoutGrid, List, ChevronRight, FolderOpen, Clock, AlertCircle } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusLider = "rascunho" | "em_aprovacao" | "rejeitado" | "aprovado";
type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

type MembroLiga = {
  id: string;
  nome: string;
  iniciais: string;
  cargo: string;
};

type ProjetoLider = {
  id: string;
  nome: string;
  descricao: string;
  responsavel: string;
  iniciais: string;
  status: StatusLider;
  receita?: number;
  prazo?: string;
  motivoRecusa?: string;
  membros?: MembroLiga[];
  observacao?: string;
  submissaoEm?: string; // ISO date — quando entrou na fila de espera
  aprovacaoProfessor?: StatusAprovacao;
  aprovacaoStaff?: StatusAprovacao;
};

// ─── Mock membros da liga ─────────────────────────────────────────────────────

const MOCK_MEMBROS_LIGA: MembroLiga[] = [
  { id: "m1", nome: "Ana Lima", iniciais: "AL", cargo: "Diretora" },
  { id: "m2", nome: "Pedro Alves", iniciais: "PA", cargo: "Desenvolvedor" },
  { id: "m3", nome: "Marina Santos", iniciais: "MS", cargo: "Designer" },
  { id: "m4", nome: "Lucas Ferreira", iniciais: "LF", cargo: "Analista" },
  { id: "m5", nome: "Beatriz Costa", iniciais: "BC", cargo: "Marketing" },
  { id: "m6", nome: "Rafael Nunes", iniciais: "RN", cargo: "Financeiro" },
];

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROJETOS_LIDER: ProjetoLider[] = [
  {
    id: "l1",
    nome: "Automação de notas",
    descricao: "Automatiza lançamento de notas via integração com o sistema acadêmico.",
    responsavel: "Pedro Alves",
    iniciais: "PA",
    status: "rascunho",
    prazo: "2026-05-10",
  },
  {
    id: "l2",
    nome: "App de presenças",
    descricao: "Check-in via QR code para eventos das ligas.",
    responsavel: "Marina Santos",
    iniciais: "MS",
    status: "rascunho",
    prazo: "2026-03-01", // vencido
  },
  {
    id: "l3",
    nome: "API de integração acadêmica",
    descricao: "Integração com o sistema acadêmico da faculdade.",
    responsavel: "Ana Lima",
    iniciais: "AL",
    status: "em_aprovacao",
    submissaoEm: "2026-04-11",
    aprovacaoProfessor: "pendente",
    aprovacaoStaff: "pendente",
  },
  {
    id: "l7",
    nome: "Newsletter mensal",
    descricao: "Comunicado mensal com novidades e conquistas da liga.",
    responsavel: "Beatriz Costa",
    iniciais: "BC",
    status: "em_aprovacao",
    submissaoEm: "2026-04-08",
    aprovacaoProfessor: "aprovado",
    aprovacaoStaff: "pendente",
  },
  {
    id: "l4",
    nome: "Sistema de feedback de eventos",
    descricao: "Formulário automatizado para coleta de feedback pós-evento.",
    responsavel: "Ana Lima",
    iniciais: "AL",
    status: "rejeitado",
    motivoRecusa: "Escopo muito amplo",
    aprovacaoProfessor: "rejeitado",
    aprovacaoStaff: "pendente",
  },
  {
    id: "l5",
    nome: "Plataforma de eventos",
    descricao: "Sistema de inscrições e QR code para eventos da liga.",
    responsavel: "Lucas Ferreira",
    iniciais: "LF",
    status: "aprovado",
    receita: 4500,
    prazo: "2026-08-15",
    aprovacaoProfessor: "aprovado",
    aprovacaoStaff: "aprovado",
  },
  {
    id: "l6",
    nome: "Landing page da liga",
    descricao: "Página pública com membros, projetos e conquistas.",
    responsavel: "Ana Lima",
    iniciais: "AL",
    status: "aprovado",
    receita: 2500,
    prazo: "2025-06-30", // vencido
    aprovacaoProfessor: "aprovado",
    aprovacaoStaff: "aprovado",
  },
];

// ─── Configuração de status ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusLider, { label: string; badge: string }> = {
  rascunho:     { label: "Rascunho",      badge: "bg-gray-100 text-gray-600" },
  em_aprovacao: { label: "Em Aprovação",  badge: "bg-yellow-100 text-yellow-700" },
  rejeitado:    { label: "Recusado",      badge: "bg-red-100 text-red-700" },
  aprovado:     { label: "Aprovado",      badge: "bg-green-100 text-green-700" },
};

const COLUNAS: StatusLider[] = ["rascunho", "em_aprovacao", "rejeitado", "aprovado"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarReceita(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function estaVencido(prazo?: string): boolean {
  if (!prazo) return false;
  return new Date(prazo + "T00:00:00") < new Date(new Date().toDateString());
}

function diasAguardando(submissaoEm?: string): number | null {
  if (!submissaoEm) return null;
  const diff = Date.now() - new Date(submissaoEm + "T00:00:00").getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ iniciais, size = "sm" }: { iniciais: string; size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "rounded-full bg-navy text-white font-bold flex items-center justify-center shrink-0",
        size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
      )}
    >
      {iniciais}
    </div>
  );
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusLider }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md", s.badge)}>
      {s.label}
    </span>
  );
}

// ─── Indicador de aprovação ───────────────────────────────────────────────────

const APROVACAO_STYLE: Record<StatusAprovacao, { text: string; classe: string }> = {
  pendente:  { text: "Pendente",  classe: "text-yellow-600" },
  aprovado:  { text: "Aprovado",  classe: "text-green-600" },
  rejeitado: { text: "Recusado",  classe: "text-red-600" },
};

function AprovacaoIndicador({ label, status }: { label: string; status: StatusAprovacao }) {
  const { text, classe } = APROVACAO_STYLE[status];
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={cn("font-semibold", classe)}>{text}</span>
    </div>
  );
}

// ─── Card do Kanban ───────────────────────────────────────────────────────────

function KanbanCard({
  projeto,
  onClick,
  onSubmeter,
  onRevisar,
}: {
  projeto: ProjetoLider;
  onClick: () => void;
  onSubmeter: (id: string) => void;
  onRevisar: (id: string) => void;
}) {
  const vencido = estaVencido(projeto.prazo);
  const dias = diasAguardando(projeto.submissaoEm);

  return (
    <div
      className="bg-white border border-brand-gray rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={onClick}
    >
      {/* Título + seta */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-sm text-navy leading-snug">{projeto.nome}</p>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      </div>

      {/* Descrição */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{projeto.descricao}</p>

      {/* Motivo de recusa */}
      {projeto.motivoRecusa && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
          <p className="text-xs font-bold text-red-700 mb-0.5">Motivo da recusa</p>
          <p className="text-xs text-red-600">{projeto.motivoRecusa}</p>
        </div>
      )}

      {/* Receita estimada */}
      {projeto.receita && (
        <p className="text-xs text-link-blue font-medium mb-2">
          {formatarReceita(projeto.receita)}
        </p>
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

      {/* Aguardando há X dias */}
      {dias !== null && projeto.status === "em_aprovacao" && (
        <p className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {dias === 0 ? "Enviado hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`}
        </p>
      )}

      {/* Indicadores de aprovação */}
      {projeto.status === "em_aprovacao" && (
        <div className="flex flex-col gap-1 mb-3 bg-gray-50 rounded-md p-2">
          <AprovacaoIndicador label="Professor" status={projeto.aprovacaoProfessor ?? "pendente"} />
          <AprovacaoIndicador label="Staff" status={projeto.aprovacaoStaff ?? "pendente"} />
        </div>
      )}

      {/* Responsável */}
      <div className="flex items-center gap-1.5">
        <Avatar iniciais={projeto.iniciais} />
        <span className="text-xs text-muted-foreground">{projeto.responsavel}</span>
      </div>

      {/* Ações */}
      {projeto.status === "rascunho" && (
        <button
          onClick={(e) => { e.stopPropagation(); onSubmeter(projeto.id); }}
          className="mt-3 w-full text-xs font-medium py-1.5 px-3 rounded-md border border-navy text-navy hover:bg-navy hover:text-white transition-colors"
        >
          Submeter ao professor
        </button>
      )}
      {projeto.status === "rejeitado" && (
        <button
          onClick={(e) => { e.stopPropagation(); onRevisar(projeto.id); }}
          className="mt-3 w-full text-xs font-medium py-1.5 px-3 rounded-md border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
        >
          Revisar e resubmeter
        </button>
      )}
    </div>
  );
}

// ─── Estado vazio da coluna ───────────────────────────────────────────────────

function ColunaVazia() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-brand-gray rounded-lg text-center">
      <FolderOpen className="h-6 w-6 text-brand-gray" strokeWidth={1.5} />
      <p className="text-xs text-muted-foreground/70 leading-snug">
        Nenhum projeto<br />aqui ainda
      </p>
    </div>
  );
}

// ─── Painel de detalhes (edição) ──────────────────────────────────────────────

function PainelDetalhes({
  projeto,
  onFechar,
  onSalvar,
}: {
  projeto: ProjetoLider;
  onFechar: () => void;
  onSalvar: (atualizado: ProjetoLider) => void;
}) {
  const [nome, setNome] = useState(projeto.nome);
  const [descricao, setDescricao] = useState(projeto.descricao);
  const [prazo, setPrazo] = useState(projeto.prazo ?? "");
  const [receita, setReceita] = useState(projeto.receita?.toString() ?? "");
  const [observacao, setObservacao] = useState(projeto.observacao ?? "");

  const vencido = estaVencido(prazo);
  const dias = diasAguardando(projeto.submissaoEm);

  function handleSalvar() {
    onSalvar({
      ...projeto,
      nome,
      descricao,
      prazo: prazo || undefined,
      receita: receita ? Number(receita) : undefined,
      observacao: observacao || undefined,
    });
  }

  const inputClass =
    "w-full text-sm border border-brand-gray rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40";
  const labelClass = "text-xs font-bold text-link-blue uppercase tracking-wider block mb-1";

  return (
    <div className="bg-white border border-brand-gray rounded-lg p-6 mx-1">
      {/* Header do painel */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={projeto.status} />
          {vencido && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
              Atrasado
            </span>
          )}
          {dias !== null && projeto.status === "em_aprovacao" && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {dias === 0 ? "Enviado hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`}
            </span>
          )}
        </div>
        <button
          onClick={onFechar}
          className="text-muted-foreground hover:text-navy transition-colors ml-4 shrink-0"
          aria-label="Fechar"
        >
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
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className={cn(inputClass, "resize-none")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Prazo</label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className={cn(inputClass, vencido && "border-red-300 focus:ring-red-200 focus:border-red-400")}
            />
            {vencido && (
              <p className="text-xs text-red-600 mt-1">Prazo vencido em {formatarData(prazo)}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Receita (R$)</label>
            <input
              type="number"
              value={receita}
              onChange={(e) => setReceita(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
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
                <span className="text-xs font-medium text-navy">{m.nome}</span>
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
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Informações adicionais sobre o projeto..."
          rows={3}
          className={cn(inputClass, "resize-none")}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSalvar}
          className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy/90 transition-colors"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

// ─── Modal novo projeto ───────────────────────────────────────────────────────

function ModalNovoProjeto({
  onFechar,
  onCriar,
}: {
  onFechar: () => void;
  onCriar: (p: Omit<ProjetoLider, "id" | "status">) => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [buscaMembro, setBuscaMembro] = useState("");
  const [selecionados, setSelecionados] = useState<MembroLiga[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const membrosFiltrados = MOCK_MEMBROS_LIGA.filter(
    (m) =>
      m.nome.toLowerCase().includes(buscaMembro.toLowerCase()) &&
      !selecionados.some((s) => s.id === m.id)
  );

  function toggleMembro(membro: MembroLiga) {
    setSelecionados((prev) =>
      prev.some((s) => s.id === membro.id)
        ? prev.filter((s) => s.id !== membro.id)
        : [...prev, membro]
    );
    setBuscaMembro("");
    setDropdownAberto(false);
  }

  function removerMembro(id: string) {
    setSelecionados((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    onCriar({
      nome,
      descricao,
      prazo: prazo || undefined,
      observacao: observacao || undefined,
      responsavel: selecionados[0]?.nome ?? "A definir",
      iniciais: selecionados[0]?.iniciais ?? "?",
      membros: selecionados,
    });
    onFechar();
  }

  const inputClass =
    "w-full text-sm border border-brand-gray rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40";
  const labelClass = "text-xs font-bold text-link-blue uppercase tracking-wider block mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-navy">Novo projeto</h2>
          <button onClick={onFechar} className="text-muted-foreground hover:text-navy transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do projeto"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo do projeto..."
              rows={3}
              className={cn(inputClass, "resize-none")}
            />
          </div>
          <div>
            <label className={labelClass}>Prazo</label>
            <input
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais sobre o projeto..."
              rows={3}
              className={cn(inputClass, "resize-none")}
            />
          </div>

          {/* Seleção de membros */}
          <div>
            <label className={labelClass}>Membros</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={buscaMembro}
                onChange={(e) => { setBuscaMembro(e.target.value); setDropdownAberto(true); }}
                onFocus={() => setDropdownAberto(true)}
                placeholder="Buscar membro da liga..."
                className={cn(inputClass, "pl-8")}
                autoComplete="off"
              />
              {dropdownAberto && membrosFiltrados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-brand-gray rounded-md shadow-md overflow-hidden">
                  {membrosFiltrados.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMembro(m)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {m.iniciais}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">{m.cargo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selecionados.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selecionados.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 bg-navy/5 border border-navy/15 rounded-full pl-1 pr-2 py-1"
                  >
                    <div className="h-5 w-5 rounded-full bg-navy text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                      {m.iniciais}
                    </div>
                    <span className="text-xs font-medium text-navy">{m.nome}</span>
                    <button
                      type="button"
                      onClick={() => removerMembro(m.id)}
                      className="text-muted-foreground hover:text-navy transition-colors ml-0.5"
                      aria-label={`Remover ${m.nome}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-sm font-medium border border-brand-gray rounded-md text-link-blue hover:border-navy/40 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy/90 transition-colors"
            >
              Criar projeto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View principal do Líder ──────────────────────────────────────────────────

export function ProjetosLiderView() {
  const [projetos, setProjetos] = useState<ProjetoLider[]>(MOCK_PROJETOS_LIDER);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusLider | "todos">("todos");
  const [visualizacao, setVisualizacao] = useState<"kanban" | "lista">("kanban");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const projetosFiltrados = projetos.filter((p) => {
    const passaStatus = filtroStatus === "todos" || p.status === filtroStatus;
    const passaBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    return passaStatus && passaBusca;
  }).sort((a, b) => {
    const da = a.prazo ?? "9999-99-99";
    const db = b.prazo ?? "9999-99-99";
    return da.localeCompare(db);
  });

  function toggleSelecionado(id: string) {
    setSelecionado((prev) => (prev === id ? null : id));
  }

  function submeterAoProfessor(id: string) {
    setProjetos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "em_aprovacao" as StatusLider, submissaoEm: new Date().toISOString().split("T")[0] }
          : p
      )
    );
    if (selecionado === id) setSelecionado(null);
  }

  function revisarEResubmeter(id: string) {
    setProjetos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "rascunho" as StatusLider, motivoRecusa: undefined } : p
      )
    );
    if (selecionado === id) setSelecionado(null);
  }

  function salvarProjeto(atualizado: ProjetoLider) {
    setProjetos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
    setSelecionado(null);
  }

  function criarProjeto(dados: Omit<ProjetoLider, "id" | "status">) {
    setProjetos((prev) => [{ ...dados, id: `novo-${Date.now()}`, status: "rascunho" }, ...prev]);
  }

  const projetoSelecionado = projetos.find((p) => p.id === selecionado);

  const PILLS: { value: StatusLider | "todos"; label: string }[] = [
    { value: "todos",        label: "Todos" },
    { value: "rascunho",     label: "Rascunho" },
    { value: "em_aprovacao", label: "Em Aprovação" },
    { value: "rejeitado",    label: "Recusado" },
    { value: "aprovado",     label: "Aprovado" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projetos.length} {projetos.length === 1 ? "projeto em andamento" : "projetos em andamento"}
          </p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo projeto
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-brand-gray rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 w-56"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setFiltroStatus(pill.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                filtroStatus === pill.value
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-link-blue border-brand-gray hover:border-navy/40"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

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

      {/* Painel de detalhes (kanban) — acima do board */}
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
          {COLUNAS.map((col) => {
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
                        onClick={() => toggleSelecionado(p.id)}
                        onSubmeter={submeterAoProfessor}
                        onRevisar={revisarEResubmeter}
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
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Responsável</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">Receita</th>
              </tr>
            </thead>
            <tbody>
              {projetosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="h-8 w-8 text-brand-gray" strokeWidth={1.5} />
                      <p className="text-sm text-muted-foreground/70">Nenhum projeto encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                projetosFiltrados.map((p) => {
                  const isAberta = selecionado === p.id;
                  const vencido = estaVencido(p.prazo);
                  return (
                    <>
                      <tr
                        key={p.id}
                        onClick={() => toggleSelecionado(p.id)}
                        className={cn(
                          "border-b border-brand-gray cursor-pointer transition-colors hover:bg-gray-50",
                          isAberta && "bg-gray-50"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-navy">{p.nome}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">{p.descricao}</div>
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
                        <td className="px-6 py-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Avatar iniciais={p.iniciais} />
                            <span className="text-xs text-muted-foreground">{p.responsavel}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-navy">
                          {p.receita ? formatarReceita(p.receita) : "—"}
                        </td>
                      </tr>
                      {isAberta && (
                        <tr key={`${p.id}-detalhe`}>
                          <td colSpan={4} className="px-4 pb-4 pt-0 bg-gray-50">
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

      {modalAberto && (
        <ModalNovoProjeto
          onFechar={() => setModalAberto(false)}
          onCriar={criarProjeto}
        />
      )}
    </div>
  );
}
