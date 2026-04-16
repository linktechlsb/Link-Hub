import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  List, LayoutGrid, X, Clock, AlertTriangle,
  CheckCircle, XCircle, FolderOpen, ChevronRight,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";
type ProjetoStatusGlobal = "em_aprovacao" | "aprovado" | "rejeitado";

type MembroProfessor = { id: string; nome: string; iniciais: string };

type HistoricoEntry = {
  etapa: string;
  acao: "aprovado" | "recusado" | "submetido";
  por: string;
  em: string;
  motivo?: string;
};

type ProjetoProfessor = {
  id: string;
  nome: string;
  descricao: string;
  liga: string;
  submetidoPor: string;
  submetidoPorIniciais: string;
  statusGlobal: ProjetoStatusGlobal;
  aprovacaoProfessor: StatusAprovacao;
  aprovacaoStaff: StatusAprovacao;
  receita?: number;
  prazo?: string;
  observacao?: string;
  motivoRecusa?: string;
  submissaoEm: string; // ISO date — quando chegou para o professor
  membros?: MembroProfessor[];
  historico?: HistoricoEntry[];
};

// ─── Mock data ────────────────────────────────────────────────────────────────

// "hoje" para efeito de demonstração é 2026-04-14
const MOCK_PROJETOS_PROFESSOR: ProjetoProfessor[] = [
  {
    id: "p1",
    nome: "App de presenças",
    descricao: "Check-in via QR code para eventos das ligas.",
    liga: "Liga Tech",
    submetidoPor: "Mariana Silva",
    submetidoPorIniciais: "MS",
    statusGlobal: "em_aprovacao",
    aprovacaoProfessor: "pendente",
    aprovacaoStaff: "pendente",
    receita: 3200,
    prazo: "2026-05-10",
    observacao: "Projeto estratégico para o semestre.",
    submissaoEm: "2026-04-06", // 8 dias atrás → urgente
    membros: [
      { id: "m1", nome: "Mariana Silva", iniciais: "MS" },
      { id: "m2", nome: "João Rocha", iniciais: "JR" },
    ],
    historico: [
      { etapa: "Criação", acao: "submetido", por: "Mariana Silva", em: "2026-04-01" },
      { etapa: "Professor", acao: "submetido", por: "Mariana Silva", em: "2026-04-06" },
    ],
  },
  {
    id: "p2",
    nome: "API de integração acadêmica",
    descricao: "Integração com o sistema acadêmico da faculdade para automatizar processos.",
    liga: "Liga Tech",
    submetidoPor: "Ana Lima",
    submetidoPorIniciais: "AL",
    statusGlobal: "em_aprovacao",
    aprovacaoProfessor: "pendente",
    aprovacaoStaff: "pendente",
    receita: 5000,
    prazo: "2026-06-30",
    submissaoEm: "2026-04-12", // 2 dias atrás
    membros: [
      { id: "m3", nome: "Ana Lima", iniciais: "AL" },
      { id: "m4", nome: "Pedro Sauro", iniciais: "PS" },
      { id: "m5", nome: "Carla Nunes", iniciais: "CN" },
    ],
    historico: [
      { etapa: "Criação", acao: "submetido", por: "Ana Lima", em: "2026-04-10" },
      { etapa: "Professor", acao: "submetido", por: "Ana Lima", em: "2026-04-12" },
    ],
  },
  {
    id: "p3",
    nome: "Sistema de feedback de eventos",
    descricao: "Formulário automatizado pós-evento com análise de NPS e relatórios.",
    liga: "Liga Marketing",
    submetidoPor: "Ana Lima",
    submetidoPorIniciais: "AL",
    statusGlobal: "em_aprovacao",
    aprovacaoProfessor: "pendente",
    aprovacaoStaff: "pendente",
    receita: 1800,
    prazo: "2026-04-10", // prazo vencido!
    submissaoEm: "2026-04-13", // 1 dia atrás
    membros: [
      { id: "m3", nome: "Ana Lima", iniciais: "AL" },
    ],
    historico: [
      { etapa: "Criação", acao: "submetido", por: "Ana Lima", em: "2026-04-11" },
      { etapa: "Professor", acao: "submetido", por: "Ana Lima", em: "2026-04-13" },
    ],
  },
  {
    id: "p4",
    nome: "Dashboard financeiro",
    descricao: "Painel de controle para acompanhamento do orçamento das ligas.",
    liga: "Liga Finanças",
    submetidoPor: "Rafael Costa",
    submetidoPorIniciais: "RC",
    statusGlobal: "em_aprovacao",
    aprovacaoProfessor: "aprovado",
    aprovacaoStaff: "pendente",
    receita: 6000,
    prazo: "2026-07-15",
    submissaoEm: "2026-04-01",
    membros: [
      { id: "m6", nome: "Rafael Costa", iniciais: "RC" },
      { id: "m7", nome: "Karina Sousa", iniciais: "KS" },
    ],
    historico: [
      { etapa: "Criação", acao: "submetido", por: "Rafael Costa", em: "2026-03-20" },
      { etapa: "Professor", acao: "submetido", por: "Rafael Costa", em: "2026-04-01" },
      { etapa: "Professor", acao: "aprovado", por: "Prof. Responsável", em: "2026-04-03" },
    ],
  },
  {
    id: "p5",
    nome: "Landing page da liga",
    descricao: "Página pública apresentando os membros, projetos e conquistas da Liga Tech.",
    liga: "Liga Tech",
    submetidoPor: "João Rocha",
    submetidoPorIniciais: "JR",
    statusGlobal: "rejeitado",
    aprovacaoProfessor: "rejeitado",
    aprovacaoStaff: "pendente",
    receita: 2500,
    prazo: "2026-06-01",
    motivoRecusa: "Escopo fora do prazo do semestre.",
    submissaoEm: "2026-03-15",
    membros: [
      { id: "m2", nome: "João Rocha", iniciais: "JR" },
    ],
    historico: [
      { etapa: "Criação", acao: "submetido", por: "João Rocha", em: "2026-03-10" },
      { etapa: "Professor", acao: "submetido", por: "João Rocha", em: "2026-03-15" },
      { etapa: "Professor", acao: "recusado", por: "Prof. Responsável", em: "2026-03-20", motivo: "Escopo fora do prazo do semestre." },
    ],
  },
];

// ─── Utilitários ──────────────────────────────────────────────────────────────

const TODAY = new Date("2026-04-14");

function diasAguardando(submissaoEm: string): number {
  const submissao = new Date(submissaoEm + "T00:00:00");
  return Math.floor((TODAY.getTime() - submissao.getTime()) / (1000 * 60 * 60 * 24));
}

function prazoVencido(prazo?: string): boolean {
  if (!prazo) return false;
  return new Date(prazo + "T00:00:00") < TODAY;
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarReceita(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Avatar({ iniciais, title }: { iniciais: string; title?: string }) {
  return (
    <div
      title={title ?? iniciais}
      className="h-7 w-7 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shrink-0"
    >
      {iniciais}
    </div>
  );
}

function StatusBadge({ statusGlobal, aprovacaoProfessor }: { statusGlobal: ProjetoStatusGlobal; aprovacaoProfessor: StatusAprovacao }) {
  if (statusGlobal === "aprovado") {
    return <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", "bg-green-100 text-green-700")}>Aprovado</span>;
  }
  if (statusGlobal === "rejeitado") {
    return <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", "bg-red-100 text-red-700")}>Recusado por mim</span>;
  }
  // em_aprovacao
  if (aprovacaoProfessor === "aprovado") {
    return <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", "bg-blue-100 text-blue-700")}>Aprovado por mim</span>;
  }
  return <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", "bg-yellow-100 text-yellow-700")}>Ag. Professor</span>;
}

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

function UrgenteBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white shrink-0">
      <AlertTriangle className="h-2.5 w-2.5" />
      Urgente
    </span>
  );
}

function DiasAguardandoBadge({ dias }: { dias: number }) {
  return (
    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
      <Clock className="h-3 w-3" />
      há {dias} {dias === 1 ? "dia" : "dias"}
    </span>
  );
}

function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <FolderOpen className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-sm">{mensagem}</p>
    </div>
  );
}

// ─── Painel de detalhes (somente leitura) ─────────────────────────────────────

function PainelDetalhes({
  projeto,
  onFechar,
}: {
  projeto: ProjetoProfessor;
  onFechar: () => void;
}) {
  const dias = diasAguardando(projeto.submissaoEm);
  const urgente = projeto.aprovacaoProfessor === "pendente" && projeto.statusGlobal === "em_aprovacao" && dias > 7;

  return (
    <div className="bg-white border border-brand-gray rounded-lg p-6 mx-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display font-bold text-lg text-navy">{projeto.nome}</h2>
          {urgente && <UrgenteBadge />}
        </div>
        <button
          onClick={onFechar}
          className="text-muted-foreground hover:text-navy transition-colors ml-4 shrink-0"
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Liga</span>
          <p className="text-navy mt-0.5">{projeto.liga}</p>
        </div>
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Submetido por</span>
          <p className="text-navy mt-0.5">{projeto.submetidoPor}</p>
        </div>
        {projeto.receita !== undefined && (
          <div>
            <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Receita estimada</span>
            <p className="text-navy mt-0.5">{formatarReceita(projeto.receita)}</p>
          </div>
        )}
        {projeto.prazo && (
          <div>
            <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Prazo</span>
            <p className={cn("mt-0.5 font-medium", prazoVencido(projeto.prazo) ? "text-red-600" : "text-navy")}>
              {formatarData(projeto.prazo)}
              {prazoVencido(projeto.prazo) && " — vencido"}
            </p>
          </div>
        )}
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Status</span>
          <p className="mt-0.5">
            <StatusBadge statusGlobal={projeto.statusGlobal} aprovacaoProfessor={projeto.aprovacaoProfessor} />
          </p>
        </div>
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Na fila</span>
          <p className="text-navy mt-0.5 flex items-center gap-1">
            <DiasAguardandoBadge dias={dias} />
          </p>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Descrição</span>
        <p className="text-sm text-muted-foreground mt-0.5">{projeto.descricao}</p>
      </div>

      {projeto.observacao && (
        <div className="mb-4">
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Observação</span>
          <p className="text-sm text-muted-foreground mt-0.5">{projeto.observacao}</p>
        </div>
      )}

      {projeto.motivoRecusa && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Motivo da recusa</span>
          <p className="text-sm text-red-700 mt-0.5">{projeto.motivoRecusa}</p>
        </div>
      )}

      {projeto.membros && projeto.membros.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Membros</span>
          <div className="flex gap-2 mt-2 flex-wrap">
            {projeto.membros.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5">
                <div className="h-7 w-7 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center" title={m.nome}>
                  {m.iniciais}
                </div>
                <span className="text-xs text-navy">{m.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {projeto.historico && projeto.historico.length > 0 && (
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Histórico de aprovações</span>
          <div className="mt-2 space-y-2">
            {projeto.historico.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-link-blue shrink-0" />
                <div>
                  <span className="font-medium text-navy">{h.etapa}</span>
                  <span className="text-muted-foreground"> · {h.acao} por {h.por} em {formatarData(h.em)}</span>
                  {h.motivo && (
                    <p className="text-xs text-red-600 mt-0.5">"{h.motivo}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal de recusa ──────────────────────────────────────────────────────────

function ModalRecusa({
  projeto,
  onConfirmar,
  onCancelar,
}: {
  projeto: ProjetoProfessor;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-navy">Recusar projeto</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{projeto.nome}</p>
          </div>
          <button
            onClick={onCancelar}
            className="text-muted-foreground hover:text-navy transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-sm font-medium text-navy mb-1">
          Motivo da recusa <span className="text-red-500">*</span>
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={4}
          placeholder="Descreva o motivo pelo qual este projeto está sendo recusado..."
          className="w-full text-sm border border-brand-gray rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 resize-none"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancelar}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-brand-gray text-navy hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(motivo.trim())}
            disabled={!motivo.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar recusa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tipos de filtro / abas ───────────────────────────────────────────────────

type FiltroAbaProfessor = "aguardando" | "aprovados" | "recusados";

const COLUNAS_PROFESSOR: { id: FiltroAbaProfessor; label: string; borderClass: string }[] = [
  { id: "aguardando", label: "Aguardando minha decisão", borderClass: "border-yellow-400" },
  { id: "aprovados",  label: "Aprovados por mim",        borderClass: "border-blue-400" },
  { id: "recusados",  label: "Recusados por mim",        borderClass: "border-red-400" },
];

function filtrarProjetos(projetos: ProjetoProfessor[], filtro: FiltroAbaProfessor): ProjetoProfessor[] {
  if (filtro === "aguardando") return projetos.filter((p) => p.aprovacaoProfessor === "pendente" && p.statusGlobal === "em_aprovacao");
  if (filtro === "aprovados")  return projetos.filter((p) => p.aprovacaoProfessor === "aprovado");
  if (filtro === "recusados")  return projetos.filter((p) => p.aprovacaoProfessor === "rejeitado");
  return projetos;
}

// ─── View principal ───────────────────────────────────────────────────────────

export function ProjetosProfessorView() {
  const [projetos, setProjetos] = useState<ProjetoProfessor[]>(
    [...MOCK_PROJETOS_PROFESSOR].sort((a, b) => {
      const da = a.prazo ?? "9999-99-99";
      const db = b.prazo ?? "9999-99-99";
      return da.localeCompare(db);
    })
  );
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroAbaProfessor>("aguardando");
  const [visualizacao, setVisualizacao] = useState<"lista" | "kanban">("kanban");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [recusandoId, setRecusandoId] = useState<string | null>(null);

  // ── Contadores para os pills
  const contadores = {
    aguardando: projetos.filter((p) => p.aprovacaoProfessor === "pendente" && p.statusGlobal === "em_aprovacao").length,
    aprovados:  projetos.filter((p) => p.aprovacaoProfessor === "aprovado").length,
    recusados:  projetos.filter((p) => p.aprovacaoProfessor === "rejeitado").length,
  };

  // ── Ações
  function aprovar(id: string) {
    setProjetos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const novoStatus: ProjetoStatusGlobal =
          p.aprovacaoStaff === "aprovado" ? "aprovado" : "em_aprovacao";
        return { ...p, aprovacaoProfessor: "aprovado" as StatusAprovacao, statusGlobal: novoStatus };
      })
    );
    setSelecionado(null);
  }

  function recusar(id: string, motivo: string) {
    setProjetos((prev) =>
      prev.map((p) =>
        p.id !== id ? p : {
          ...p,
          aprovacaoProfessor: "rejeitado" as StatusAprovacao,
          statusGlobal: "rejeitado" as ProjetoStatusGlobal,
          motivoRecusa: motivo,
        }
      )
    );
    setRecusandoId(null);
    setSelecionado(null);
  }

  // ── Projetos filtrados
  const projetosFiltrados = filtrarProjetos(projetos, filtroAtivo);

  const projetoRecusando = recusandoId
    ? projetos.find((p) => p.id === recusandoId)
    : null;

  // ── Subtítulo dinâmico
  const qtdAguardando = contadores.aguardando;
  const subtitulo =
    qtdAguardando === 0
      ? "Nenhum projeto aguardando revisão"
      : `${qtdAguardando} ${qtdAguardando === 1 ? "projeto aguardando" : "projetos aguardando"} sua revisão`;

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitulo}</p>
        </div>

        {/* Toggle lista / kanban */}
        <div className="flex items-center gap-1 bg-brand-gray rounded-md p-1">
          <button
            onClick={() => setVisualizacao("kanban")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors",
              visualizacao === "kanban"
                ? "bg-white text-navy shadow-sm"
                : "text-link-blue hover:text-navy"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setVisualizacao("lista")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors",
              visualizacao === "lista"
                ? "bg-white text-navy shadow-sm"
                : "text-link-blue hover:text-navy"
            )}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* Pills de filtro */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {COLUNAS_PROFESSOR.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setFiltroAtivo(id); setSelecionado(null); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full border transition-colors",
              filtroAtivo === id
                ? "bg-navy text-white border-navy"
                : "bg-white text-navy border-brand-gray hover:border-navy/40"
            )}
          >
            {label}
            {contadores[id] > 0 && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                  filtroAtivo === id
                    ? "bg-white/20 text-white"
                    : id === "aguardando"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {contadores[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {visualizacao === "lista" ? (
        <ListaView
          projetos={projetosFiltrados}
          selecionado={selecionado}
          onSelecionar={(id) => setSelecionado((prev) => (prev === id ? null : id))}
          onAprovar={aprovar}
          onRecusar={(id) => setRecusandoId(id)}
        />
      ) : (
        <KanbanView
          projetos={projetos}
          onAprovar={aprovar}
          onRecusar={(id) => setRecusandoId(id)}
          onSelecionar={(id) => setSelecionado((prev) => (prev === id ? null : id))}
          selecionado={selecionado}
        />
      )}

      {/* Painel de detalhes — fora do fluxo da tabela */}
      {selecionado && visualizacao === "kanban" && (() => {
        const p = projetos.find((x) => x.id === selecionado);
        return p ? (
          <div className="mt-4">
            <PainelDetalhes projeto={p} onFechar={() => setSelecionado(null)} />
          </div>
        ) : null;
      })()}

      {/* Modal de recusa */}
      {projetoRecusando && (
        <ModalRecusa
          projeto={projetoRecusando}
          onConfirmar={(motivo) => recusar(projetoRecusando.id, motivo)}
          onCancelar={() => setRecusandoId(null)}
        />
      )}
    </div>
  );
}

// ─── Visão Lista ──────────────────────────────────────────────────────────────

function ListaView({
  projetos,
  selecionado,
  onSelecionar,
  onAprovar,
  onRecusar,
}: {
  projetos: ProjetoProfessor[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
}) {
  if (projetos.length === 0) {
    return (
      <div className="bg-white border border-brand-gray rounded-lg">
        <EstadoVazio mensagem="Nenhum projeto nesta categoria." />
      </div>
    );
  }

  return (
    <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-gray">
            <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
              Projeto
            </th>
            <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
              Submetido por
            </th>
            <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
              Prazo
            </th>
            <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {projetos.map((p) => {
            const isAberto = selecionado === p.id;
            const dias = diasAguardando(p.submissaoEm);
            const urgente = p.aprovacaoProfessor === "pendente" && p.statusGlobal === "em_aprovacao" && dias > 7;
            const vencido = prazoVencido(p.prazo);

            return (
              <>
                <tr
                  key={p.id}
                  onClick={() => onSelecionar(p.id)}
                  className={cn(
                    "border-b border-brand-gray cursor-pointer transition-colors",
                    isAberto ? "bg-navy/5" : "hover:bg-gray-50"
                  )}
                >
                  {/* Projeto */}
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-navy">{p.nome}</span>
                          {urgente && <UrgenteBadge />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                          {p.descricao}
                        </div>
                        <DiasAguardandoBadge dias={dias} />
                      </div>
                    </div>
                  </td>

                  {/* Submetido por */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Avatar iniciais={p.submetidoPorIniciais} title={p.submetidoPor} />
                      <span className="text-navy">{p.submetidoPor}</span>
                    </div>
                  </td>

                  {/* Prazo */}
                  <td className="px-6 py-4">
                    {p.prazo ? (
                      <span className={cn("font-medium", vencido ? "text-red-600" : "text-navy")}>
                        {formatarData(p.prazo)}
                        {vencido && <span className="ml-1 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">vencido</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge statusGlobal={p.statusGlobal} aprovacaoProfessor={p.aprovacaoProfessor} />
                    {p.motivoRecusa && (
                      <p className="text-[10px] text-red-600 mt-1 max-w-[180px] truncate" title={p.motivoRecusa}>
                        {p.motivoRecusa}
                      </p>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {p.aprovacaoProfessor === "pendente" && p.statusGlobal === "em_aprovacao" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onAprovar(p.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aprovar
                        </button>
                        <button
                          onClick={() => onRecusar(p.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Recusar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>

                {/* Painel de detalhes inline */}
                {isAberto && (
                  <tr key={`${p.id}-detalhe`}>
                    <td colSpan={5} className="px-4 pb-4 pt-0 bg-navy/5">
                      <PainelDetalhes projeto={p} onFechar={() => onSelecionar(p.id)} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Visão Kanban ─────────────────────────────────────────────────────────────

function KanbanView({
  projetos,
  onAprovar,
  onRecusar,
  onSelecionar,
  selecionado,
}: {
  projetos: ProjetoProfessor[];
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
  onSelecionar: (id: string) => void;
  selecionado: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {COLUNAS_PROFESSOR.map((col) => {
        const cards = filtrarProjetos(projetos, col.id)
          .sort((a, b) => {
            const da = a.prazo ?? "9999-99-99";
            const db = b.prazo ?? "9999-99-99";
            return da.localeCompare(db);
          });

        return (
          <div key={col.id} className="flex flex-col gap-2">
            {/* Cabeçalho da coluna */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-link-blue uppercase tracking-wider">
                {col.label}
              </span>
              <span className="text-xs font-bold bg-brand-gray text-link-blue px-1.5 py-0.5 rounded-full">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div
              className={cn(
                "bg-white border border-brand-gray rounded-lg border-t-2 overflow-hidden",
                col.borderClass
              )}
            >
              {cards.length === 0 ? (
                <EstadoVazio mensagem="Sem projetos aqui." />
              ) : (
                <div className="divide-y divide-brand-gray">
                  {cards.map((p) => (
                    <KanbanCard
                      key={p.id}
                      projeto={p}
                      selecionado={selecionado === p.id}
                      onSelecionar={onSelecionar}
                      onAprovar={onAprovar}
                      onRecusar={onRecusar}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  projeto,
  selecionado,
  onSelecionar,
  onAprovar,
  onRecusar,
}: {
  projeto: ProjetoProfessor;
  selecionado: boolean;
  onSelecionar: (id: string) => void;
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
}) {
  const dias = diasAguardando(projeto.submissaoEm);
  const urgente = projeto.aprovacaoProfessor === "pendente" && projeto.statusGlobal === "em_aprovacao" && dias > 7;
  const vencido = prazoVencido(projeto.prazo);

  return (
    <div
      onClick={() => onSelecionar(projeto.id)}
      className={cn(
        "p-4 cursor-pointer transition-colors",
        selecionado ? "bg-navy/5" : "hover:bg-gray-50"
      )}
    >
      {/* Nome + urgente */}
      <div className="flex items-start gap-1.5 mb-1 flex-wrap">
        <span className="font-bold text-sm text-navy flex-1">{projeto.nome}</span>
        {urgente && <UrgenteBadge />}
      </div>

      {/* Descrição */}
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{projeto.descricao}</p>

      {/* Submetido por */}
      <div className="flex items-center gap-1.5 mb-2">
        <Avatar iniciais={projeto.submetidoPorIniciais} title={projeto.submetidoPor} />
        <span className="text-xs text-navy">{projeto.submetidoPor}</span>
      </div>

      {/* Prazo + dias aguardando */}
      <div className="flex items-center gap-3 text-[11px] mb-2">
        {projeto.prazo && (
          <span className={cn("font-medium", vencido ? "text-red-600" : "text-muted-foreground")}>
            {formatarData(projeto.prazo)}{vencido && " ⚠"}
          </span>
        )}
        {dias === 0 ? (
          <span className="text-[10px] font-bold text-orange-500 flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            Vence hoje
          </span>
        ) : (
          <DiasAguardandoBadge dias={dias} />
        )}
      </div>

      {/* Indicadores de aprovação dupla */}
      {projeto.statusGlobal === "em_aprovacao" && (
        <div className="flex flex-col gap-1 mb-3 bg-gray-50 rounded-md p-2">
          <AprovacaoIndicador label="Professor (eu)" status={projeto.aprovacaoProfessor} />
          <AprovacaoIndicador label="Staff" status={projeto.aprovacaoStaff} />
        </div>
      )}

      {/* Motivo de recusa */}
      {projeto.motivoRecusa && (
        <p className="text-[10px] text-red-600 bg-red-50 rounded px-2 py-1 mb-2 line-clamp-2">
          {projeto.motivoRecusa}
        </p>
      )}

      {/* Ações */}
      {projeto.aprovacaoProfessor === "pendente" && projeto.statusGlobal === "em_aprovacao" && (
        <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAprovar(projeto.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="h-3 w-3" />
            Aprovar
          </button>
          <button
            onClick={() => onRecusar(projeto.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            <XCircle className="h-3 w-3" />
            Recusar
          </button>
        </div>
      )}
    </div>
  );
}
