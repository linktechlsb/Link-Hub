import {
  Search,
  LayoutGrid,
  List,
  X,
  ChevronRight,
  FolderOpen,
  Clock,
  Pencil,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusStaff = "rascunho" | "em_aprovacao" | "rejeitado" | "aprovado";
type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

type MembroStaff = {
  id: string;
  nome: string;
  iniciais: string;
  cargo: string;
  avatarUrl?: string;
};

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
  responsavelAvatarUrl?: string;
  status: StatusStaff;
  criadoPor?: string;
  receita?: number;
  prazo?: string;
  motivoRecusa?: string;
  submissaoEm?: string; // data em que entrou na fila do staff
  aprovacaoProfessor?: StatusAprovacao;
  aprovacaoStaff?: StatusAprovacao;
  observacao?: string;
  membros?: MembroStaff[];
  historico?: HistoricoEntry[];
};

// ─── Configuração de status ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusStaff, { label: string; badge: string }> = {
  rascunho: { label: "Rascunho", badge: "bg-gray-100 text-gray-600" },
  em_aprovacao: { label: "Em Aprovação", badge: "bg-yellow-100 text-yellow-700" },
  rejeitado: { label: "Recusado", badge: "bg-red-100 text-red-700" },
  aprovado: { label: "Aprovado", badge: "bg-green-100 text-green-700" },
};

// Colunas do kanban
const COLUNAS_KANBAN: StatusStaff[] = ["rascunho", "em_aprovacao", "aprovado", "rejeitado"];

// ─── API / mapeamento ─────────────────────────────────────────────────────────

interface ProjetoAPI {
  id: string;
  liga_id: string;
  liga?: { id: string; nome: string };
  titulo: string;
  descricao?: string | null;
  responsavel_id: string;
  criado_por?: string | null;
  status: string;
  prazo?: string | null;
  aprovacao_professor: StatusAprovacao;
  aprovacao_staff: StatusAprovacao;
}

interface LigaAPI {
  id: string;
  nome: string;
}

interface MembroLigaAPI {
  usuario_id: string;
  nome: string | null;
  email: string;
  cargo: string | null;
  role: string | null;
  avatar_url: string | null;
}

function iniciaisDe(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  professor: "Professor",
  lider: "Líder",
  diretor: "Diretor",
  membro: "Membro",
};

function rotuloCargo(m: MembroLigaAPI): string {
  if (m.cargo) return m.cargo;
  if (m.role && ROLE_LABEL[m.role]) return ROLE_LABEL[m.role]!;
  if (m.role) return m.role.charAt(0).toUpperCase() + m.role.slice(1);
  return "Membro";
}

function apiParaMembroStaff(m: MembroLigaAPI): MembroStaff {
  const nome = m.nome ?? m.email;
  return {
    id: m.usuario_id,
    nome,
    iniciais: iniciaisDe(nome),
    cargo: rotuloCargo(m),
    avatarUrl: m.avatar_url ?? undefined,
  };
}

function normalizarStatus(s: string): StatusStaff {
  if (s === "rascunho" || s === "em_aprovacao" || s === "rejeitado" || s === "aprovado") return s;
  return "aprovado";
}

function apiParaProjetoStaff(p: ProjetoAPI, membrosPorId: Map<string, MembroStaff>): ProjetoStaff {
  const resp = membrosPorId.get(p.responsavel_id);
  const nomeResp = resp?.nome ?? "—";
  return {
    id: p.id,
    nome: p.titulo,
    liga: p.liga?.nome ?? "—",
    descricao: p.descricao ?? "",
    responsavel: nomeResp,
    iniciais: resp?.iniciais ?? iniciaisDe(nomeResp),
    responsavelAvatarUrl: resp?.avatarUrl,
    status: normalizarStatus(p.status),
    criadoPor: p.criado_por ?? undefined,
    prazo: p.prazo ?? undefined,
    aprovacaoProfessor: p.aprovacao_professor,
    aprovacaoStaff: p.aprovacao_staff,
  };
}

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

function Avatar({
  iniciais,
  size = "sm",
  avatarUrl,
  alt,
}: {
  iniciais: string;
  size?: "sm" | "md";
  avatarUrl?: string;
  alt?: string;
}) {
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={alt ?? iniciais}
        className={cn("rounded-full object-cover shrink-0", sizeClass)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-navy text-white font-bold flex items-center justify-center shrink-0",
        sizeClass,
        size === "sm" ? "text-[10px]" : "text-xs",
      )}
    >
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
    "Liga Tech": "bg-blue-100 text-blue-700",
    "Liga Finanças": "bg-emerald-100 text-emerald-700",
    "Liga Marketing": "bg-pink-100 text-pink-700",
    "Liga RH": "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap",
        cor[liga] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {liga.replace("Liga ", "")}
    </span>
  );
}

function ColunaVazia() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-brand-gray rounded-lg">
      <FolderOpen className="h-6 w-6 text-brand-gray" strokeWidth={1.5} />
      <p className="text-xs text-muted-foreground/70 text-center leading-snug">
        Nenhum projeto
        <br />
        aqui ainda
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
          <button
            onClick={onFechar}
            className="text-muted-foreground hover:text-navy transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Informe o motivo da recusa de{" "}
          <span className="font-medium text-navy">&quot;{nomeProjeto}&quot;</span>.
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

  const inputClass =
    "w-full text-sm border border-brand-gray rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40";
  const labelClass = "text-xs font-bold text-link-blue uppercase tracking-wider block mb-1";

  const ACAO_CONFIG: Record<HistoricoEntry["acao"], { label: string; cls: string }> = {
    submetido: { label: "Submetido", cls: "bg-gray-100 text-gray-600" },
    aprovado: { label: "Aprovado", cls: "bg-green-100 text-green-700" },
    recusado: { label: "Recusado", cls: "bg-red-100 text-red-700" },
    revisado: { label: "Revisado", cls: "bg-blue-100 text-blue-700" },
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
              className={cn(inputClass, vencido && "border-red-300 focus:ring-red-200")}
            />
            {vencido && <p className="text-xs text-red-600 mt-1">Prazo vencido</p>}
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
          <Avatar
            iniciais={projeto.iniciais}
            size="md"
            avatarUrl={projeto.responsavelAvatarUrl}
            alt={projeto.responsavel}
          />
          <span className="text-sm text-navy">{projeto.responsavel}</span>
        </div>
      </div>

      {/* Membros */}
      {projeto.membros && projeto.membros.length > 0 && (
        <div className="mb-5">
          <span className={labelClass}>Membros</span>
          <div className="flex gap-2 mt-2 flex-wrap">
            {projeto.membros.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 bg-navy/5 border border-navy/10 rounded-full pl-1 pr-2 py-1"
              >
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
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Informações adicionais..."
          rows={3}
          className={cn(inputClass, "resize-none")}
        />
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
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0",
                      ac.cls,
                    )}
                  >
                    {ac.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-navy font-medium">{h.etapa}</span>
                    <span className="text-muted-foreground"> · {h.por}</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      — {formatarData(h.em)}
                    </span>
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
          onClick={() =>
            onSalvar({
              ...projeto,
              nome,
              descricao,
              prazo: prazo || undefined,
              receita: receita ? Number(receita) : undefined,
              observacao: observacao || undefined,
            })
          }
          className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy/90 transition-colors"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

// ─── Indicador de aprovação ───────────────────────────────────────────────────

const APROVACAO_STYLE: Record<StatusAprovacao, { text: string; classe: string }> = {
  pendente: { text: "Pendente", classe: "text-yellow-600" },
  aprovado: { text: "Aprovado", classe: "text-green-600" },
  rejeitado: { text: "Recusado", classe: "text-red-600" },
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

// ─── Card Kanban ──────────────────────────────────────────────────────────────

function KanbanCard({
  projeto,
  podeEnviar,
  onVerDetalhes,
  onEditar,
  onAprovar,
  onRecusar,
  onEnviar,
}: {
  projeto: ProjetoStaff;
  podeEnviar: boolean;
  onVerDetalhes: () => void;
  onEditar: () => void;
  onAprovar: (id: string) => void;
  onRecusar: (id: string) => void;
  onEnviar: (id: string) => void;
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
          onClick={(e) => {
            e.stopPropagation();
            onEditar();
          }}
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
        <p className="text-xs text-link-blue font-medium mb-2">
          {formatarReceita(projeto.receita)}
        </p>
      )}

      {/* Prazo */}
      {projeto.prazo && (
        <div className="flex items-center gap-1.5 mb-3">
          <Clock
            className={cn("h-3 w-3 shrink-0", vencido ? "text-red-500" : "text-muted-foreground")}
          />
          <span
            className={cn(
              "text-xs",
              vencido ? "text-red-600 font-medium" : "text-muted-foreground",
            )}
          >
            {formatarData(projeto.prazo)}
          </span>
          {vencido && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 leading-none">
              Atrasado
            </span>
          )}
        </div>
      )}

      {/* Há X dias aguardando — somente em_aprovacao */}
      {projeto.status === "em_aprovacao" && dias !== null && (
        <p className="text-[11px] text-orange-600 font-medium mb-2 flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {dias === 0 ? "Recebido hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`}
        </p>
      )}

      {/* Responsável */}
      <div className="flex items-center gap-1.5 mb-3">
        <Avatar
          iniciais={projeto.iniciais}
          avatarUrl={projeto.responsavelAvatarUrl}
          alt={projeto.responsavel}
        />
        <span className="text-xs text-muted-foreground">{projeto.responsavel}</span>
      </div>

      {/* Indicadores de aprovação — somente em_aprovacao */}
      {projeto.status === "em_aprovacao" && (
        <div className="flex flex-col gap-1 mb-3 bg-gray-50 rounded-md p-2">
          <AprovacaoIndicador label="Professor" status={projeto.aprovacaoProfessor ?? "pendente"} />
          <AprovacaoIndicador label="Staff" status={projeto.aprovacaoStaff ?? "pendente"} />
        </div>
      )}

      {/* Ações Staff — somente em_aprovacao */}
      {projeto.status === "em_aprovacao" && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAprovar(projeto.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Aprovar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRecusar(projeto.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Recusar
          </button>
        </div>
      )}

      {/* Enviar para aprovação — somente rascunho do próprio criador */}
      {projeto.status === "rascunho" && podeEnviar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEnviar(projeto.id);
          }}
          className="mt-1 w-full text-xs font-medium py-1.5 px-3 rounded-md border border-navy text-navy hover:bg-navy hover:text-white transition-colors"
        >
          Enviar para aprovação
        </button>
      )}
    </div>
  );
}

// ─── Modal novo projeto (Staff) ───────────────────────────────────────────────

function ModalNovoProjetoStaff({
  ligas,
  onFechar,
  onCriar,
}: {
  ligas: LigaAPI[];
  onFechar: () => void;
  onCriar: (dados: {
    liga_id: string;
    titulo: string;
    descricao?: string;
    prazo?: string;
    observacao?: string;
    responsavel_id: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [ligaId, setLigaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [buscaMembro, setBuscaMembro] = useState("");
  const [selecionados, setSelecionados] = useState<MembroStaff[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [membrosDaLiga, setMembrosDaLiga] = useState<MembroStaff[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const membrosRef = useRef<HTMLDivElement>(null);

  // Carrega membros quando a liga muda
  useEffect(() => {
    setSelecionados([]);
    setMembrosDaLiga([]);
    if (!ligaId) return;
    let cancelado = false;
    async function carregar() {
      setCarregandoMembros(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/ligas/${ligaId}/membros`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as MembroLigaAPI[];
        if (!cancelado) setMembrosDaLiga(data.map(apiParaMembroStaff));
      } finally {
        if (!cancelado) setCarregandoMembros(false);
      }
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, [ligaId]);

  useEffect(() => {
    if (!dropdownAberto) return;
    function handleClick(e: MouseEvent) {
      if (membrosRef.current && !membrosRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [dropdownAberto]);

  const membrosFiltrados = membrosDaLiga.filter(
    (m) =>
      m.nome.toLowerCase().includes(buscaMembro.toLowerCase()) &&
      !selecionados.some((s) => s.id === m.id),
  );

  function toggleMembro(m: MembroStaff) {
    setSelecionados((prev) =>
      prev.some((s) => s.id === m.id) ? prev.filter((s) => s.id !== m.id) : [...prev, m],
    );
    setBuscaMembro("");
    setDropdownAberto(false);
  }

  function removerMembro(id: string) {
    setSelecionados((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!ligaId) {
      setErro("Selecione uma liga.");
      return;
    }
    if (!nome.trim()) return;
    if (selecionados.length === 0) {
      setErro("Selecione ao menos um membro como responsável.");
      return;
    }
    setEnviando(true);
    const resultado = await onCriar({
      liga_id: ligaId,
      titulo: nome,
      descricao: descricao || undefined,
      prazo: prazo || undefined,
      observacao: observacao || undefined,
      responsavel_id: selecionados[0]!.id,
    });
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.error ?? "Não foi possível criar o projeto.");
      return;
    }
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
          <button
            onClick={onFechar}
            className="text-muted-foreground hover:text-navy transition-colors"
          >
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
            <label className={labelClass}>Liga *</label>
            <select
              value={ligaId}
              onChange={(e) => setLigaId(e.target.value)}
              required
              className={cn(inputClass, "bg-white")}
            >
              <option value="">Selecione uma liga...</option>
              {ligas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
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

          {/* Membros da liga selecionada */}
          <div>
            <label className={labelClass}>Membros</label>
            <div className="relative" ref={membrosRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={buscaMembro}
                onChange={(e) => {
                  setBuscaMembro(e.target.value);
                  setDropdownAberto(true);
                }}
                onFocus={() => setDropdownAberto(true)}
                placeholder={
                  !ligaId
                    ? "Selecione uma liga primeiro..."
                    : carregandoMembros
                      ? "Carregando membros..."
                      : "Buscar membro da liga..."
                }
                disabled={!ligaId || carregandoMembros}
                className={cn(inputClass, "pl-8")}
                autoComplete="off"
              />
              {dropdownAberto && membrosFiltrados.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-brand-gray rounded-md shadow-md overflow-y-auto max-h-56">
                  {membrosFiltrados.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMembro(m)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.nome}
                          className="h-7 w-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {m.iniciais}
                        </div>
                      )}
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
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.nome}
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-navy text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {m.iniciais}
                      </div>
                    )}
                    <span className="text-xs font-medium text-navy">{m.nome}</span>
                    <span className="text-[10px] text-muted-foreground">· {m.cargo}</span>
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

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <p className="text-xs text-red-700">{erro}</p>
            </div>
          )}

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
              disabled={enviando}
              className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? "Criando..." : "Criar projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View principal do Staff ──────────────────────────────────────────────────

export function ProjetosStaffView() {
  const { usuarioId } = useUser();
  const [projetosAPI, setProjetosAPI] = useState<ProjetoAPI[]>([]);
  const [ligas, setLigas] = useState<LigaAPI[]>([]);
  const [membrosPorLiga, setMembrosPorLiga] = useState<Map<string, MembroStaff>>(new Map());
  const [busca, setBusca] = useState("");
  const [filtroLiga, setFiltroLiga] = useState("Todas as ligas");
  const [filtroStatus, setFiltroStatus] = useState<StatusStaff | "todos">("todos");
  const [visualizacao, setVisualizacao] = useState<"kanban" | "lista">("kanban");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [recusarId, setRecusarId] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function authHeaders(): Promise<Record<string, string> | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function recarregarProjetos(headers: Record<string, string>) {
    const res = await fetch(`/api/projetos`, { headers });
    if (!res.ok) return;
    const data = (await res.json()) as ProjetoAPI[];
    setProjetosAPI(data);

    // Carrega membros de cada liga única para resolver nomes dos responsáveis.
    const ligasUnicas = Array.from(new Set(data.map((p) => p.liga_id)));
    const novoMapa = new Map<string, MembroStaff>();
    await Promise.all(
      ligasUnicas.map(async (ligaId) => {
        const r = await fetch(`/api/ligas/${ligaId}/membros`, { headers });
        if (!r.ok) return;
        const membros = (await r.json()) as MembroLigaAPI[];
        for (const m of membros) {
          novoMapa.set(m.usuario_id, apiParaMembroStaff(m));
        }
      }),
    );
    setMembrosPorLiga(novoMapa);
  }

  useEffect(() => {
    async function carregar() {
      const headers = await authHeaders();
      if (!headers) return;

      const resLigas = await fetch(`/api/ligas`, { headers });
      if (resLigas.ok) {
        const data = (await resLigas.json()) as LigaAPI[];
        setLigas(data);
      }

      await recarregarProjetos(headers);
    }
    void carregar();
  }, []);

  const projetos = projetosAPI.map((p) => apiParaProjetoStaff(p, membrosPorLiga));

  // ── Filtros ────────────────────────────────────────────────────────────────

  const projetosFiltrados = projetos
    .filter((p) => {
      const passaLiga = filtroLiga === "Todas as ligas" || p.liga === filtroLiga;
      const passaStatus = filtroStatus === "todos" || p.status === filtroStatus;
      const passaBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
      return passaLiga && passaStatus && passaBusca;
    })
    .sort((a, b) => {
      const da = a.prazo ?? "9999-99-99";
      const db = b.prazo ?? "9999-99-99";
      return da.localeCompare(db);
    });

  // ── Subtítulo dinâmico ────────────────────────────────────────────────────

  const aguardandoAprovacao = projetos.filter((p) => p.status === "em_aprovacao").length;
  const subtitulo =
    aguardandoAprovacao > 0
      ? `${aguardandoAprovacao} ${aguardandoAprovacao === 1 ? "projeto aguardando aprovação" : "projetos aguardando aprovação"}`
      : `${projetos.length} projetos no total`;

  // ── Ações ─────────────────────────────────────────────────────────────────

  async function registrarAprovacao(id: string, decisao: "aprovado" | "rejeitado") {
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch(`/api/projetos/${id}/aprovacao`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ papel: "staff", decisao }),
    });
    if (!res.ok) return;
    const atualizado = (await res.json()) as ProjetoAPI;
    setProjetosAPI((prev) => prev.map((p) => (p.id === id ? { ...p, ...atualizado } : p)));
  }

  function aprovar(id: string) {
    void registrarAprovacao(id, "aprovado");
    setSelecionado(null);
  }

  function recusar(id: string, _motivo: string) {
    // API atual não armazena o motivo — registra apenas a decisão.
    void registrarAprovacao(id, "rejeitado");
    setRecusarId(null);
    setSelecionado(null);
  }

  function salvarProjeto(_atualizado: ProjetoStaff) {
    // Edição inline ainda não persiste no backend.
    setSelecionado(null);
  }

  async function enviarParaAprovacao(id: string) {
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch(`/api/projetos/${id}/status`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "em_aprovacao" }),
    });
    if (!res.ok) return;
    const atualizado = (await res.json()) as ProjetoAPI;
    setProjetosAPI((prev) => prev.map((p) => (p.id === id ? { ...p, ...atualizado } : p)));
  }

  async function criarProjeto(dados: {
    liga_id: string;
    titulo: string;
    descricao?: string;
    prazo?: string;
    observacao?: string;
    responsavel_id: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const headers = await authHeaders();
    if (!headers) return { ok: false, error: "Sessão expirada. Faça login novamente." };
    const res = await fetch(`/api/projetos`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        liga_id: dados.liga_id,
        titulo: dados.titulo,
        descricao: dados.descricao,
        responsavel_id: dados.responsavel_id,
        prazo: dados.prazo,
      }),
    });
    if (!res.ok) {
      let mensagem = `Falha ao criar projeto (${res.status}).`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) mensagem = body.error;
      } catch {
        // sem corpo JSON
      }
      return { ok: false, error: mensagem };
    }
    await recarregarProjetos(headers);
    return { ok: true };
  }

  function toggleSelecionado(id: string) {
    setSelecionado((prev) => (prev === id ? null : id));
  }

  const projetoSelecionado = projetos.find((p) => p.id === selecionado);
  const projetoParaRecusar = projetos.find((p) => p.id === recusarId);

  const STATUS_OPTIONS: { value: StatusStaff | "todos"; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "em_aprovacao", label: "Em Aprovação" },
    { value: "aprovado", label: "Aprovado" },
    { value: "rejeitado", label: "Recusado" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitulo}</p>
        </div>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo projeto
        </button>
      </div>

      {/* Pills de liga */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {["Todas as ligas", ...ligas.map((l) => l.nome)].map((nome) => (
          <button
            key={nome}
            onClick={() => setFiltroLiga(nome)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full border transition-colors",
              filtroLiga === nome
                ? "bg-navy text-white border-navy"
                : "bg-white text-link-blue border-brand-gray hover:border-navy/40",
            )}
          >
            {nome}
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
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
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
            className={cn(
              "p-2 transition-colors",
              visualizacao === "kanban"
                ? "bg-navy text-white"
                : "bg-white text-link-blue hover:bg-gray-50",
            )}
            title="Kanban"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setVisualizacao("lista")}
            className={cn(
              "p-2 transition-colors",
              visualizacao === "lista"
                ? "bg-navy text-white"
                : "bg-white text-link-blue hover:bg-gray-50",
            )}
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
                        podeEnviar={!!usuarioId && p.criadoPor === usuarioId}
                        onVerDetalhes={() => toggleSelecionado(p.id)}
                        onEditar={() => toggleSelecionado(p.id)}
                        onAprovar={aprovar}
                        onRecusar={(id) => setRecusarId(id)}
                        onEnviar={enviarParaAprovacao}
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
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
                  Projeto
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
                  Liga
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
                  Receita
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
                  Ações
                </th>
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
                  const vencido = estaVencido(p.prazo);
                  return (
                    <>
                      <tr
                        key={p.id}
                        onClick={() => toggleSelecionado(p.id)}
                        className={cn(
                          "border-b border-brand-gray cursor-pointer transition-colors hover:bg-gray-50",
                          isAberto && "bg-gray-50",
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-navy">{p.nome}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                            {p.descricao}
                          </div>
                          {p.prazo && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock
                                className={cn(
                                  "h-3 w-3",
                                  vencido ? "text-red-500" : "text-muted-foreground",
                                )}
                              />
                              <span
                                className={cn(
                                  "text-xs",
                                  vencido ? "text-red-600 font-medium" : "text-muted-foreground",
                                )}
                              >
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
                          <LigaBadge liga={p.liga} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-6 py-4 font-medium text-navy">
                          {p.receita ? formatarReceita(p.receita) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          {p.status === "em_aprovacao" ? (
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
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
                          ) : p.status === "rascunho" && usuarioId && p.criadoPor === usuarioId ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void enviarParaAprovacao(p.id);
                              }}
                              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-navy text-navy hover:bg-navy hover:text-white transition-colors"
                            >
                              Enviar para aprovação
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelecionado(p.id);
                              }}
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

      {/* Modal novo projeto */}
      {modalAberto && (
        <ModalNovoProjetoStaff
          ligas={ligas}
          onFechar={() => setModalAberto(false)}
          onCriar={criarProjeto}
        />
      )}
    </div>
  );
}
