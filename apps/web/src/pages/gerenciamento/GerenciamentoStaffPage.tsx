import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Pencil,
  Trash2,
  Plus,
  Link,
  FileText,
  Image,
  Globe,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

// ─── tipos ────────────────────────────────────────────────────────────────────

interface InfoLiga {
  nome: string;
  area: string;
  descricao: string;
  semestre: string;
  emailContato: string;
  instagram: string;
  linkedin: string;
  bannerUrl: string;
  professorMentor: string;
}

interface Recurso {
  id: string;
  nome: string;
  tipo: string;
  url: string;
}

interface MetricasLiga {
  score: number;
  projetosConcluidos: number;
  projetosAndamento: number;
  receita: number;
  frequencia: number;
  membrosAtivos: number;
}

interface Liga {
  id: string;
  nome: string;
  info: InfoLiga;
  recursos: Recurso[];
  metricas: MetricasLiga;
}

// ─── mock ─────────────────────────────────────────────────────────────────────

const PROFESSORES = [
  "Prof. Dr. Ricardo Oliveira",
  "Profa. Dra. Fernanda Castro",
  "Prof. Me. Bruno Almeida",
  "Profa. Dra. Camila Rocha",
  "Prof. Dr. Eduardo Pires",
];

const CORES = ["#10284E", "#546484", "#FEC641", "#6366f1", "#14b8a6", "#f97316"];

function inicialCor(nome: string): string {
  return CORES[nome.charCodeAt(0) % CORES.length];
}

function recursoIcone(tipo: string) {
  const t = tipo.toLowerCase();
  if (t.includes("design")) return <Image className="h-4 w-4 text-white" />;
  if (t.includes("doc")) return <FileText className="h-4 w-4 text-white" />;
  if (t.includes("armazen")) return <Globe className="h-4 w-4 text-white" />;
  return <Link className="h-4 w-4 text-white" />;
}

const MOCK_LIGAS: Liga[] = [
  {
    id: "l1",
    nome: "Liga Tech",
    info: {
      nome: "Liga Tech",
      area: "Tecnologia e Inovação",
      descricao: "Liga voltada para desenvolvimento de habilidades técnicas e projetos de impacto.",
      semestre: "2023.1",
      emailContato: "liga.tech@faculdade.edu",
      instagram: "@ligatech",
      linkedin: "liga-tech-faculdade",
      bannerUrl: "",
      professorMentor: PROFESSORES[0],
    },
    recursos: [
      { id: "r1", nome: "Notion da Liga", tipo: "Documento", url: "https://notion.so" },
      { id: "r2", nome: "Google Drive", tipo: "Armazenamento", url: "https://drive.google.com" },
      { id: "r3", nome: "Figma", tipo: "Design", url: "https://figma.com" },
    ],
    metricas: { score: 840, projetosConcluidos: 4, projetosAndamento: 2, receita: 3200, frequencia: 87, membrosAtivos: 5 },
  },
  {
    id: "l2",
    nome: "Liga de Finanças",
    info: {
      nome: "Liga de Finanças",
      area: "Finanças e Mercado de Capitais",
      descricao: "Liga focada em mercado financeiro, investimentos e análise econômica.",
      semestre: "2022.2",
      emailContato: "liga.financas@faculdade.edu",
      instagram: "@ligafinancas",
      linkedin: "liga-financas-faculdade",
      bannerUrl: "",
      professorMentor: PROFESSORES[1],
    },
    recursos: [
      { id: "r4", nome: "Planilha de Ativos", tipo: "Documento", url: "https://docs.google.com" },
      { id: "r5", nome: "Bloomberg Terminal", tipo: "Link", url: "https://bloomberg.com" },
    ],
    metricas: { score: 710, projetosConcluidos: 3, projetosAndamento: 3, receita: 2800, frequencia: 82, membrosAtivos: 7 },
  },
  {
    id: "l3",
    nome: "Liga de Marketing",
    info: {
      nome: "Liga de Marketing",
      area: "Marketing e Comunicação",
      descricao: "Liga dedicada a estratégias de marketing digital, branding e comunicação.",
      semestre: "2023.1",
      emailContato: "liga.marketing@faculdade.edu",
      instagram: "@ligamarketing",
      linkedin: "liga-marketing-faculdade",
      bannerUrl: "",
      professorMentor: PROFESSORES[2],
    },
    recursos: [
      { id: "r6", nome: "Canva Pro", tipo: "Design", url: "https://canva.com" },
      { id: "r7", nome: "Meta Business Suite", tipo: "Link", url: "https://business.facebook.com" },
      { id: "r8", nome: "Drive de Campanhas", tipo: "Armazenamento", url: "https://drive.google.com" },
    ],
    metricas: { score: 620, projetosConcluidos: 2, projetosAndamento: 4, receita: 1900, frequencia: 75, membrosAtivos: 6 },
  },
  {
    id: "l4",
    nome: "Liga de RH",
    info: {
      nome: "Liga de RH",
      area: "Recursos Humanos e Gestão de Pessoas",
      descricao: "Liga voltada para desenvolvimento humano, processos seletivos e cultura organizacional.",
      semestre: "2023.2",
      emailContato: "liga.rh@faculdade.edu",
      instagram: "@ligarh",
      linkedin: "liga-rh-faculdade",
      bannerUrl: "",
      professorMentor: PROFESSORES[3],
    },
    recursos: [
      { id: "r9", nome: "Notion RH", tipo: "Documento", url: "https://notion.so" },
    ],
    metricas: { score: 480, projetosConcluidos: 1, projetosAndamento: 2, receita: 900, frequencia: 68, membrosAtivos: 4 },
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const inputClass =
  "w-full border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white";

// ─── sub-componentes ──────────────────────────────────────────────────────────

// ── Informações ──
function AbaInformacoes({
  ligaId,
  initialInfo,
  onArquivar,
}: {
  ligaId: string;
  initialInfo: InfoLiga;
  onArquivar: () => void;
}) {
  const [form, setForm] = useState<InfoLiga>(initialInfo);
  const [original] = useState<InfoLiga>(initialInfo);
  const [bannerPreview, setBannerPreview] = useState(initialInfo.bannerUrl);
  const [salvo, setSalvo] = useState(false);
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false);

  // Reset quando muda de liga
  const [prevId, setPrevId] = useState(ligaId);
  if (ligaId !== prevId) {
    setPrevId(ligaId);
    setForm(initialInfo);
    setBannerPreview(initialInfo.bannerUrl);
    setSalvo(false);
    setConfirmandoArquivar(false);
  }

  const alterado =
    JSON.stringify(form) !== JSON.stringify(original) ||
    bannerPreview !== original.bannerUrl;

  function salvar() {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBannerPreview(url);
    setForm((prev) => ({ ...prev, bannerUrl: url }));
  }

  return (
    <div className="space-y-4">
      {/* Dados gerais */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">Dados Gerais</p>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Nome da liga</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Área de atuação</label>
          <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={3}
            className={cn(inputClass, "resize-none")}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Semestre de fundação</label>
          <input
            value={form.semestre}
            onChange={(e) => setForm({ ...form, semestre: e.target.value })}
            placeholder="ex: 2023.1"
            className={inputClass}
          />
        </div>
      </div>

      {/* Foto / Banner */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">Foto / Banner da Liga</p>
        {bannerPreview ? (
          <div className="relative rounded-lg overflow-hidden border border-brand-gray h-36">
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
            <button
              onClick={() => { setBannerPreview(""); setForm((prev) => ({ ...prev, bannerUrl: "" })); }}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 rounded-full p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-brand-gray rounded-lg h-36 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Image className="h-6 w-6" />
            <span className="text-xs">Nenhuma imagem selecionada</span>
          </div>
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-brand-gray text-navy text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
          <Plus className="h-3.5 w-3.5" />
          {bannerPreview ? "Trocar imagem" : "Selecionar imagem"}
          <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </label>
      </div>

      {/* Contatos */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">Contatos da Liga</p>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">E-mail de contato</label>
          <input
            type="email"
            value={form.emailContato}
            onChange={(e) => setForm({ ...form, emailContato: e.target.value })}
            placeholder="contato@faculdade.edu"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Instagram</label>
          <input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@liga"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">LinkedIn</label>
          <input
            value={form.linkedin}
            onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
            placeholder="liga-faculdade"
            className={inputClass}
          />
        </div>
      </div>

      {/* Professor mentor — editável pelo Staff */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">Professor Mentor</p>
        <select
          value={form.professorMentor}
          onChange={(e) => setForm({ ...form, professorMentor: e.target.value })}
          className={inputClass}
        >
          {PROFESSORES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Botão salvar */}
      {alterado && (
        <div className="flex items-center gap-3">
          <button
            onClick={salvar}
            className="bg-navy hover:bg-navy/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Salvar alterações
          </button>
          {salvo && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
        </div>
      )}

      {/* Zona de perigo */}
      <div className="bg-white border border-red-200 rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Zona de Perigo
        </p>
        <p className="text-sm text-muted-foreground">
          Arquivar a liga a tornará inativa e ela não aparecerá mais para os membros. Esta ação pode ser revertida pelo Super Admin.
        </p>
        {confirmandoArquivar ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">Confirmar arquivamento de "{form.nome}"?</span>
            <button
              onClick={onArquivar}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Sim, arquivar
            </button>
            <button
              onClick={() => setConfirmandoArquivar(false)}
              className="border border-brand-gray text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoArquivar(true)}
            className="border border-red-300 text-red-500 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Arquivar liga
          </button>
        )}
      </div>
    </div>
  );
}

// ── Recursos ──
function AbaRecursos({ ligaId, initialRecursos }: { ligaId: string; initialRecursos: Recurso[] }) {
  const [recursos, setRecursos] = useState<Recurso[]>(initialRecursos);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("Documento");
  const [novoUrl, setNovoUrl] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Recurso>>({});

  // Reset ao trocar de liga
  const [prevId, setPrevId] = useState(ligaId);
  if (ligaId !== prevId) {
    setPrevId(ligaId);
    setRecursos(initialRecursos);
    setEditandoId(null);
    setNovoNome("");
    setNovoUrl("");
  }

  function adicionar() {
    if (!novoNome.trim() || !novoUrl.trim()) return;
    setRecursos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: novoNome.trim(), tipo: novoTipo, url: novoUrl.trim() },
    ]);
    setNovoNome("");
    setNovoUrl("");
  }

  function remover(id: string) {
    setRecursos((prev) => prev.filter((r) => r.id !== id));
  }

  function iniciarEdicao(r: Recurso) {
    setEditandoId(r.id);
    setEditForm({ nome: r.nome, tipo: r.tipo, url: r.url });
  }

  function salvarEdicao(id: string) {
    setRecursos((prev) => prev.map((r) => (r.id === id ? { ...r, ...editForm } as Recurso : r)));
    setEditandoId(null);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Recursos ({recursos.length})
        </p>
        <div className="divide-y divide-brand-gray">
          {recursos.map((r) => (
            <div key={r.id} className="py-3">
              {editandoId === r.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editForm.nome ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    placeholder="Nome"
                    className="border border-brand-gray rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <div className="flex gap-2">
                    <input
                      value={editForm.url ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      placeholder="URL"
                      className="flex-1 border border-brand-gray rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                    <select
                      value={editForm.tipo ?? "Documento"}
                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                      className="border border-brand-gray rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      <option>Documento</option>
                      <option>Armazenamento</option>
                      <option>Design</option>
                      <option>Link</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => salvarEdicao(r.id)}
                      className="bg-navy text-white text-xs px-3 py-1.5 rounded-lg hover:bg-navy/90 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="border border-brand-gray text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: inicialCor(r.nome) }}
                    >
                      {recursoIcone(r.tipo)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">{r.tipo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => iniciarEdicao(r)}
                      className="text-link-blue hover:bg-gray-50 p-1.5 rounded-md transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remover(r.id)}
                      className="text-red-400 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {recursos.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground text-center">Nenhum recurso cadastrado.</p>
          )}
        </div>
      </div>

      {/* Adicionar */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">Adicionar Recurso</p>
        <div className="flex gap-2 flex-wrap">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do recurso"
            className="flex-1 min-w-[140px] border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <input
            value={novoUrl}
            onChange={(e) => setNovoUrl(e.target.value)}
            placeholder="URL"
            className="flex-1 min-w-[160px] border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <select
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            className="border border-brand-gray rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            <option>Documento</option>
            <option>Armazenamento</option>
            <option>Design</option>
            <option>Link</option>
          </select>
          <button
            onClick={adicionar}
            className="flex items-center gap-1.5 bg-navy hover:bg-navy/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Desempenho ──
function AbaDesempenho({ liga, todasLigas }: { liga: Liga; todasLigas: Liga[] }) {
  const { metricas: m, nome } = liga;
  const scoreMax = 1000;
  const porcentagem = Math.round((m.score / scoreMax) * 100);

  const composicao = [
    { label: "Projetos", formula: `${m.projetosConcluidos} proj. × 50 pts`, valor: m.projetosConcluidos * 50, cor: "bg-green-500" },
    { label: "Presenças", formula: `${Math.round(m.frequencia * 0.5)} pres. × 10 pts`, valor: Math.round(m.frequencia * 0.5) * 10, cor: "bg-blue-500" },
    { label: "Receita", formula: `R$ ${m.receita.toLocaleString("pt-BR")} × 0,015`, valor: Math.round(m.receita * 0.015), cor: "bg-amber-500" },
    { label: "Feed", formula: `publicações × 5 pts`, valor: m.score - (m.projetosConcluidos * 50 + Math.round(m.frequencia * 0.5) * 10 + Math.round(m.receita * 0.015)), cor: "bg-purple-500" },
  ];

  const rankingOrdenado = [...todasLigas].sort((a, b) => b.metricas.score - a.metricas.score);
  const posicao = rankingOrdenado.findIndex((l) => l.id === liga.id) + 1;

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-4">Score Atual</p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="font-display font-bold text-4xl text-navy">{m.score}</span>
            <span className="text-lg text-muted-foreground ml-1">pts</span>
          </div>
          <span className="bg-brand-yellow text-navy text-xs font-bold px-2.5 py-1 rounded-full">
            🏆 {posicao}º lugar
          </span>
        </div>
        <div className="w-full bg-brand-gray rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${porcentagem}%`, background: "linear-gradient(90deg, #10284E, #546484)" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span>0 pts</span>
          <span>{porcentagem}% do máximo</span>
          <span>{scoreMax} pts</span>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">Resumo</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Projetos concluídos", valor: String(m.projetosConcluidos), cor: "text-green-600" },
            { label: "Em andamento", valor: String(m.projetosAndamento), cor: "text-blue-600" },
            { label: "Receita total", valor: `R$ ${m.receita.toLocaleString("pt-BR")}`, cor: "text-amber-600" },
            { label: "Frequência média", valor: `${m.frequencia}%`, cor: "text-purple-600" },
            { label: "Membros ativos", valor: String(m.membrosAtivos), cor: "text-navy" },
          ].map((r) => (
            <div key={r.label} className="bg-gray-50 rounded-lg p-3">
              <p className={cn("font-display font-bold text-xl", r.cor)}>{r.valor}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Composição do score */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">Composição do Score</p>
        <div className="space-y-3">
          {composicao.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-semibold text-navy">{c.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{c.formula}</span>
                </div>
                <span className="text-sm font-bold text-navy">{Math.max(0, c.valor)} pts</span>
              </div>
              <div className="w-full bg-brand-gray rounded-full h-2 overflow-hidden">
                <div
                  className={cn("h-2 rounded-full", c.cor)}
                  style={{ width: `${Math.min(100, Math.round((Math.max(0, c.valor) / m.score) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparativo ranking */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Comparativo — Ranking Geral
        </p>
        <div className="space-y-2">
          {rankingOrdenado.map((l, i) => {
            const isAtual = l.id === liga.id;
            const pct = Math.round((l.metricas.score / scoreMax) * 100);
            return (
              <div
                key={l.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  isAtual ? "bg-navy/5 ring-1 ring-navy/20" : "hover:bg-gray-50"
                )}
              >
                <span className={cn("text-xs font-bold w-5 text-center", isAtual ? "text-navy" : "text-muted-foreground")}>
                  {i + 1}º
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-sm font-semibold truncate", isAtual ? "text-navy" : "text-gray-700")}>
                      {l.nome}
                      {isAtual && (
                        <span className="ml-2 text-[10px] font-bold bg-navy text-white px-1.5 py-0.5 rounded-full align-middle">
                          atual
                        </span>
                      )}
                    </span>
                    <span className={cn("text-xs font-bold ml-3 shrink-0", isAtual ? "text-navy" : "text-gray-500")}>
                      {l.metricas.score} pts
                    </span>
                  </div>
                  <div className="w-full bg-brand-gray rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: isAtual
                          ? "linear-gradient(90deg, #10284E, #546484)"
                          : "#CBCBCB",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── página Staff ─────────────────────────────────────────────────────────────

type Aba = "Informações" | "Recursos" | "Desempenho";
const ABAS: Aba[] = ["Informações", "Recursos", "Desempenho"];

export function GerenciamentoStaffPage() {
  const [ligas, setLigas] = useState<Liga[]>(MOCK_LIGAS);
  const [ligaSelecionadaId, setLigaSelecionadaId] = useState(MOCK_LIGAS[0].id);
  const [abaAtiva, setAbaAtiva] = useState<Aba>("Informações");
  const [seletorAberto, setSeletorAberto] = useState(false);

  const liga = ligas.find((l) => l.id === ligaSelecionadaId) ?? ligas[0];

  function selecionarLiga(id: string) {
    setLigaSelecionadaId(id);
    setAbaAtiva("Informações");
    setSeletorAberto(false);
  }

  function arquivarLiga() {
    setLigas((prev) => prev.filter((l) => l.id !== ligaSelecionadaId));
    const restantes = ligas.filter((l) => l.id !== ligaSelecionadaId);
    if (restantes.length > 0) setLigaSelecionadaId(restantes[0].id);
    setAbaAtiva("Informações");
  }

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Gerenciamento</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão Staff — todas as ligas</p>
      </div>

      {/* Seletor de liga */}
      <div className="relative mb-6">
        <button
          onClick={() => setSeletorAberto((v) => !v)}
          className="flex items-center gap-3 bg-white border border-brand-gray rounded-xl px-4 py-3 hover:border-navy/30 transition-colors w-full sm:w-auto"
        >
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #10284E, #546484)" }}
          >
            {liga.nome.charAt(0)}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-navy">{liga.nome}</p>
            <p className="text-xs text-muted-foreground">{liga.info.area}</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground ml-auto transition-transform", seletorAberto && "rotate-180")} />
        </button>

        {seletorAberto && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-brand-gray rounded-xl shadow-lg overflow-hidden w-full sm:w-80">
            {ligas.map((l) => (
              <button
                key={l.id}
                onClick={() => selecionarLiga(l.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left",
                  l.id === ligaSelecionadaId && "bg-navy/5"
                )}
              >
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #10284E, #546484)" }}
                >
                  {l.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", l.id === ligaSelecionadaId ? "text-navy" : "text-gray-700")}>
                    {l.nome}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{l.info.area}</p>
                </div>
                <span className="text-xs font-bold text-link-blue shrink-0">{l.metricas.score} pts</span>
              </button>
            ))}
          </div>
        )}

        {/* overlay para fechar seletor ao clicar fora */}
        {seletorAberto && (
          <div className="fixed inset-0 z-10" onClick={() => setSeletorAberto(false)} />
        )}
      </div>

      {/* Abas */}
      <div className="border-b border-brand-gray mb-6">
        <div className="flex gap-1">
          {ABAS.map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                abaAtiva === aba
                  ? "border-[#7C3AED] text-[#7C3AED]"
                  : "border-transparent text-muted-foreground hover:text-navy"
              )}
            >
              {aba}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {abaAtiva === "Informações" && (
        <AbaInformacoes
          key={liga.id}
          ligaId={liga.id}
          initialInfo={liga.info}
          onArquivar={arquivarLiga}
        />
      )}
      {abaAtiva === "Recursos" && (
        <AbaRecursos
          key={liga.id}
          ligaId={liga.id}
          initialRecursos={liga.recursos}
        />
      )}
      {abaAtiva === "Desempenho" && (
        <AbaDesempenho liga={liga} todasLigas={ligas} />
      )}
    </div>
  );
}
