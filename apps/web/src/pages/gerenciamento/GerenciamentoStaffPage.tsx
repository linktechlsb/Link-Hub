import {
  X,
  Pencil,
  Trash2,
  Plus,
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
  ChevronDown,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
  icone: string;
  cor: string;
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
  metricas: MetricasLiga;
}

type RecursoAPI = {
  id: string;
  titulo: string;
  tipo: string;
  url: string;
  icone: string;
  cor: string;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function apiParaLiga(l: Record<string, unknown>): Liga {
  return {
    id: l.id as string,
    nome: l.nome as string,
    info: {
      nome: (l.nome as string) ?? "",
      area: (l.area as string) ?? "",
      descricao: (l.descricao as string) ?? "",
      semestre: (l.semestre_fundacao as string) ?? "",
      emailContato: (l.email_contato as string) ?? "",
      instagram: (l.instagram as string) ?? "",
      linkedin: (l.linkedin as string) ?? "",
      bannerUrl: (l.imagem_url as string) ?? "",
      professorMentor: (l.professor_mentor as string) ?? "",
    },
    metricas: {
      score: 0,
      projetosConcluidos: 0,
      projetosAndamento: 0,
      receita: 0,
      frequencia: 0,
      membrosAtivos: 0,
    },
  };
}

function apiParaRecurso(r: RecursoAPI): Recurso {
  return {
    id: r.id,
    nome: r.titulo,
    tipo: r.tipo,
    url: r.url,
    icone: r.icone ?? "link",
    cor: r.cor ?? "#546484",
  };
}

const inputClass =
  "w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60";

// ─── picker de ícone/cor ──────────────────────────────────────────────────────

const ICONES: { id: string; componente: LucideIcon }[] = [
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

const CORES_PICKER = [
  "#10284E",
  "#546484",
  "#7C3AED",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#DB2777",
  "#0D9488",
];

function iconeComponente(id: string): LucideIcon {
  return ICONES.find((i) => i.id === id)?.componente ?? Link;
}

function RecursoIcone({ id, className }: { id: string; className?: string }) {
  const Comp = iconeComponente(id);
  return <Comp className={className ?? "h-4 w-4 text-white"} />;
}

function IconeCor({
  icone,
  cor,
  onChange,
}: {
  icone: string;
  cor: string;
  onChange: (i: string, c: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="h-9 w-9 flex items-center justify-center border-2 border-transparent hover:border-navy/20 transition-colors"
        style={{ backgroundColor: cor }}
        title="Escolher ícone e cor"
      >
        <RecursoIcone id={icone} />
      </button>
      {aberto && (
        <div className="absolute left-0 top-11 z-50 bg-white border border-navy/15 p-3 w-56">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
            Ícone
          </p>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {ICONES.map((ic) => {
              const Comp = ic.componente;
              return (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => onChange(ic.id, cor)}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center transition-colors",
                    icone === ic.id
                      ? "bg-navy text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  <Comp className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
            Cor
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CORES_PICKER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(icone, c)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-colors",
                  cor === c ? "border-navy scale-110" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [bannerPreview, setBannerPreview] = useState(initialInfo.bannerUrl);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false);

  const [prevId, setPrevId] = useState(ligaId);
  if (ligaId !== prevId) {
    setPrevId(ligaId);
    setForm(initialInfo);
    setBannerPreview(initialInfo.bannerUrl);
    setBannerFile(null);
    setSalvo(false);
    setConfirmandoArquivar(false);
  }

  const alterado = JSON.stringify(form) !== JSON.stringify(initialInfo) || bannerFile !== null;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const token = await getToken();
      if (bannerFile) {
        const fd = new FormData();
        fd.append("imagem", bannerFile);
        const imgRes = await fetch(`/api/ligas/${ligaId}/imagem`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!imgRes.ok) {
          setErro("Erro ao enviar imagem.");
          return;
        }
        setBannerFile(null);
      }
      const res = await fetch(`/api/ligas/${ligaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: form.nome,
          descricao: form.descricao,
          area: form.area,
          semestre_fundacao: form.semestre,
          email_contato: form.emailContato,
          instagram: form.instagram,
          linkedin: form.linkedin,
          professor_mentor: form.professorMentor,
        }),
      });
      if (!res.ok) {
        setErro("Erro ao salvar informações.");
        return;
      }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar() {
    const token = await getToken();
    const res = await fetch(`/api/ligas/${ligaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) onArquivar();
    else setErro("Erro ao arquivar liga.");
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-4">
      {/* Dados gerais */}
      <div className="border border-navy/15 p-5 space-y-4">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Dados Gerais
        </p>
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
            Nome da liga
          </label>
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
            Área de atuação
          </label>
          <input
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
            Descrição
          </label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={3}
            className={cn(inputClass, "resize-none")}
          />
        </div>
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
            Semestre de fundação
          </label>
          <input
            value={form.semestre}
            onChange={(e) => setForm({ ...form, semestre: e.target.value })}
            placeholder="ex: 2023.1"
            className={inputClass}
          />
        </div>
      </div>

      {/* Foto / Banner */}
      <div className="border border-navy/15 p-5 space-y-3">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Foto / Banner da Liga
        </p>
        {bannerPreview ? (
          <div className="relative overflow-hidden border border-navy/15 h-36">
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setBannerPreview("");
                setBannerFile(null);
                setForm((prev) => ({ ...prev, bannerUrl: "" }));
              }}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-navy/20 h-36 flex flex-col items-center justify-center gap-2 text-navy/40">
            <Image className="h-6 w-6" />
            <span className="font-plex-sans text-[12px]">Nenhuma imagem selecionada</span>
          </div>
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors">
          <Plus className="h-3.5 w-3.5" />
          {bannerPreview ? "Trocar imagem" : "Selecionar imagem"}
          <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </label>
      </div>

      {/* Contatos */}
      <div className="border border-navy/15 p-5 space-y-4">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Contatos da Liga
        </p>
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
            E-mail de contato
          </label>
          <input
            type="email"
            value={form.emailContato}
            onChange={(e) => setForm({ ...form, emailContato: e.target.value })}
            placeholder="contato@faculdade.edu"
            className={inputClass}
          />
        </div>
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
            Instagram
          </label>
          <input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@liga"
            className={inputClass}
          />
        </div>
        <div>
          <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3 block">
            LinkedIn
          </label>
          <input
            value={form.linkedin}
            onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
            placeholder="liga-faculdade"
            className={inputClass}
          />
        </div>
      </div>

      {/* Professor mentor */}
      <div className="border border-navy/15 p-5 space-y-3">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Professor Mentor
        </p>
        <input
          value={form.professorMentor}
          onChange={(e) => setForm({ ...form, professorMentor: e.target.value })}
          placeholder="Nome do professor mentor"
          className={inputClass}
        />
      </div>

      {/* Botão salvar */}
      {alterado && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
          {salvo && (
            <span className="font-plex-sans text-[12px] text-green-600">Salvo com sucesso!</span>
          )}
          {erro && <span className="font-plex-sans text-[12px] text-red-600">{erro}</span>}
        </div>
      )}

      {/* Zona de perigo */}
      <div className="border border-red-200 p-5 space-y-3">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-red-500 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Zona de Perigo
        </p>
        <p className="font-plex-sans text-[13px] text-navy/50">
          Arquivar a liga a tornará inativa e ela não aparecerá mais para os membros. Esta ação pode
          ser revertida pelo Super Admin.
        </p>
        {confirmandoArquivar ? (
          <div className="flex items-center gap-4">
            <span className="font-plex-sans text-[12px] text-red-600">
              Confirmar arquivamento de &quot;{form.nome}&quot;?
            </span>
            <button
              onClick={() => void arquivar()}
              className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-600 hover:text-red-800 transition-colors"
            >
              Sim, arquivar
            </button>
            <button
              onClick={() => setConfirmandoArquivar(false)}
              className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoArquivar(true)}
            className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-500 hover:text-red-700 transition-colors"
          >
            Arquivar liga
          </button>
        )}
      </div>
    </div>
  );
}

// ── Recursos ──
function AbaRecursos({ ligaId }: { ligaId: string }) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("Link");
  const [novoUrl, setNovoUrl] = useState("");
  const [novoIcone, setNovoIcone] = useState("link");
  const [novoCor, setNovoCor] = useState("#546484");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Recurso>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [prevId, setPrevId] = useState(ligaId);
  if (ligaId !== prevId) {
    setPrevId(ligaId);
    setRecursos([]);
    setEditandoId(null);
    setCarregando(true);
  }

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        const res = await fetch(`/api/recursos?liga_id=${ligaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as RecursoAPI[];
          setRecursos(data.map(apiParaRecurso));
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, [ligaId]);

  async function adicionar() {
    setErro(null);
    if (!novoNome.trim() || !novoUrl.trim()) {
      setErro("Informe o nome e a URL.");
      return;
    }
    const token = await getToken();
    const res = await fetch("/api/recursos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        liga_id: ligaId,
        titulo: novoNome.trim(),
        tipo: novoTipo,
        url: novoUrl.trim(),
        icone: novoIcone,
        cor: novoCor,
      }),
    });
    if (res.ok) {
      const criado = (await res.json()) as RecursoAPI;
      setRecursos((prev) => [apiParaRecurso(criado), ...prev]);
      setNovoNome("");
      setNovoUrl("");
      setNovoIcone("link");
      setNovoCor("#546484");
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErro(body.error ?? `Erro ${res.status}.`);
    }
  }

  async function remover(id: string) {
    const token = await getToken();
    const res = await fetch(`/api/recursos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setRecursos((prev) => prev.filter((r) => r.id !== id));
  }

  function iniciarEdicao(r: Recurso) {
    setEditandoId(r.id);
    setEditForm({ nome: r.nome, tipo: r.tipo, url: r.url, icone: r.icone, cor: r.cor });
  }

  async function salvarEdicao(id: string) {
    const token = await getToken();
    const res = await fetch(`/api/recursos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        titulo: editForm.nome,
        tipo: editForm.tipo,
        url: editForm.url,
        icone: editForm.icone,
        cor: editForm.cor,
      }),
    });
    if (res.ok) {
      const atualizado = (await res.json()) as RecursoAPI;
      setRecursos((prev) => prev.map((r) => (r.id === id ? apiParaRecurso(atualizado) : r)));
    }
    setEditandoId(null);
  }

  if (carregando)
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando recursos…</p>;

  return (
    <div className="space-y-4">
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Recursos ({recursos.length})
        </p>
        {recursos.length === 0 ? (
          <p className="font-plex-sans text-[13px] text-navy/50">Nenhum recurso cadastrado.</p>
        ) : (
          <div className="border-t border-navy/15">
            {recursos.map((r) => (
              <div key={r.id} className="border-b border-navy/10 py-3">
                {editandoId === r.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <IconeCor
                        icone={editForm.icone ?? "link"}
                        cor={editForm.cor ?? "#546484"}
                        onChange={(ic, c) => setEditForm({ ...editForm, icone: ic, cor: c })}
                      />
                      <input
                        value={editForm.nome ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                        placeholder="Nome"
                        className="flex-1 border border-navy/20 px-3 py-1.5 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 bg-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={editForm.url ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        placeholder="URL"
                        className="flex-1 border border-navy/20 px-3 py-1.5 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 bg-white"
                      />
                      <input
                        value={editForm.tipo ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                        placeholder="Tipo"
                        className="w-36 border border-navy/20 px-3 py-1.5 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 bg-white"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => void salvarEdicao(r.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-white bg-navy px-3 py-1.5 hover:bg-navy/90 transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: r.cor }}
                      >
                        <RecursoIcone id={r.icone} />
                      </div>
                      <div>
                        <p className="font-plex-sans font-semibold text-[13px] text-navy">
                          {r.nome}
                        </p>
                        <p className="font-plex-mono text-[10px] text-navy/50">{r.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => iniciarEdicao(r)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void remover(r.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-400 hover:text-red-600 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adicionar */}
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Adicionar Recurso
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          <IconeCor
            icone={novoIcone}
            cor={novoCor}
            onChange={(ic, c) => {
              setNovoIcone(ic);
              setNovoCor(c);
            }}
          />
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do recurso"
            className="flex-1 min-w-[140px] border border-navy/20 px-3 py-2 font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60 bg-white"
          />
          <input
            value={novoUrl}
            onChange={(e) => setNovoUrl(e.target.value)}
            placeholder="URL"
            className="flex-1 min-w-[160px] border border-navy/20 px-3 py-2 font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60 bg-white"
          />
          <input
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            placeholder="Tipo (ex: Documento)"
            className="w-36 border border-navy/20 px-3 py-2 font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60 bg-white"
          />
          <button
            onClick={() => void adicionar()}
            className="flex items-center gap-1.5 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-2.5 hover:bg-navy/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>
        {erro && <p className="font-plex-sans text-[12px] text-red-600 mt-2">{erro}</p>}
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
    {
      label: "Projetos",
      formula: `${m.projetosConcluidos} proj. × 50 pts`,
      valor: m.projetosConcluidos * 50,
      cor: "bg-green-500",
    },
    {
      label: "Presenças",
      formula: `${Math.round(m.frequencia * 0.5)} pres. × 10 pts`,
      valor: Math.round(m.frequencia * 0.5) * 10,
      cor: "bg-blue-500",
    },
    {
      label: "Receita",
      formula: `R$ ${m.receita.toLocaleString("pt-BR")} × 0,015`,
      valor: Math.round(m.receita * 0.015),
      cor: "bg-amber-500",
    },
    {
      label: "Feed",
      formula: `publicações × 5 pts`,
      valor:
        m.score -
        (m.projetosConcluidos * 50 +
          Math.round(m.frequencia * 0.5) * 10 +
          Math.round(m.receita * 0.015)),
      cor: "bg-purple-500",
    },
  ];

  const rankingOrdenado = [...todasLigas].sort((a, b) => b.metricas.score - a.metricas.score);
  const posicao = rankingOrdenado.findIndex((l) => l.id === liga.id) + 1;

  // suppress unused variable warning
  void nome;

  return (
    <div className="space-y-4">
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-4">
          Score Atual
        </p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="font-display font-bold text-4xl text-navy">{m.score}</span>
            <span className="font-plex-sans text-lg text-navy/40 ml-1">pts</span>
          </div>
          <span className="font-plex-mono text-[10px] uppercase tracking-[0.14em] bg-brand-yellow text-navy px-2 py-0.5">
            {posicao}º lugar
          </span>
        </div>
        <div className="w-full bg-navy/10 h-px overflow-hidden">
          <div
            className="h-px transition-all duration-500"
            style={{
              width: `${porcentagem}%`,
              background: "linear-gradient(90deg, #10284E, #546484)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 font-plex-mono text-[10px] text-navy/40">
          <span>0 pts</span>
          <span>{porcentagem}% do máximo</span>
          <span>{scoreMax} pts</span>
        </div>
      </div>

      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Resumo
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Projetos concluídos",
              valor: String(m.projetosConcluidos),
              cor: "text-green-600",
            },
            { label: "Em andamento", valor: String(m.projetosAndamento), cor: "text-blue-600" },
            {
              label: "Receita total",
              valor: `R$ ${m.receita.toLocaleString("pt-BR")}`,
              cor: "text-amber-600",
            },
            { label: "Frequência média", valor: `${m.frequencia}%`, cor: "text-purple-600" },
            { label: "Membros ativos", valor: String(m.membrosAtivos), cor: "text-navy" },
          ].map((r) => (
            <div key={r.label} className="border border-navy/10 p-3">
              <p className={cn("font-display font-bold text-xl", r.cor)}>{r.valor}</p>
              <p className="font-plex-sans text-[12px] text-navy/50 mt-0.5">{r.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Composição do Score
        </p>
        <div className="space-y-4">
          {composicao.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-plex-sans font-semibold text-[13px] text-navy">
                    {c.label}
                  </span>
                  <span className="font-plex-mono text-[10px] text-navy/50 ml-2">{c.formula}</span>
                </div>
                <span className="font-plex-mono text-[12px] text-navy">
                  {Math.max(0, c.valor)} pts
                </span>
              </div>
              <div className="w-full bg-navy/10 h-px overflow-hidden">
                <div
                  className={cn("h-px", c.cor)}
                  style={{
                    width: `${Math.min(100, Math.round((Math.max(0, c.valor) / (m.score || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Comparativo — Ranking Geral
        </p>
        <div className="space-y-1">
          {rankingOrdenado.map((l, i) => {
            const isAtual = l.id === liga.id;
            const pct = Math.round((l.metricas.score / scoreMax) * 100);
            return (
              <div
                key={l.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 transition-colors",
                  isAtual ? "bg-navy/5 border border-navy/15" : "hover:bg-navy/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "font-plex-mono text-[10px] w-5 text-center",
                    isAtual ? "text-navy" : "text-navy/40",
                  )}
                >
                  {i + 1}º
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        "font-plex-sans font-semibold text-[13px] truncate",
                        isAtual ? "text-navy" : "text-navy/70",
                      )}
                    >
                      {l.nome}
                      {isAtual && (
                        <span className="ml-2 font-plex-mono text-[9px] uppercase tracking-[0.10em] bg-navy text-white px-1.5 py-0.5 align-middle">
                          atual
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-plex-mono text-[11px] ml-3 shrink-0",
                        isAtual ? "text-navy" : "text-navy/40",
                      )}
                    >
                      {l.metricas.score} pts
                    </span>
                  </div>
                  <div className="w-full bg-navy/10 h-px overflow-hidden">
                    <div
                      className="h-px transition-all duration-500"
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
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligaSelecionadaId, setLigaSelecionadaId] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<Aba>("Informações");
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const token = await getToken();
        const res = await fetch("/api/ligas", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>[];
          const mapped = data.map(apiParaLiga);
          setLigas(mapped);
          if (mapped.length > 0) setLigaSelecionadaId(mapped[0]!.id);
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, []);

  const liga = ligas.find((l) => l.id === ligaSelecionadaId) ?? ligas[0];

  function selecionarLiga(id: string) {
    setLigaSelecionadaId(id);
    setAbaAtiva("Informações");
    setSeletorAberto(false);
  }

  function arquivarLiga() {
    setLigas((prev) => prev.filter((l) => l.id !== ligaSelecionadaId));
    const restantes = ligas.filter((l) => l.id !== ligaSelecionadaId);
    if (restantes.length > 0) setLigaSelecionadaId(restantes[0]!.id);
    setAbaAtiva("Informações");
  }

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mb-2">
          Gerenciamento
        </h1>
        <p className="font-plex-sans text-[13px] text-navy/50">Carregando ligas…</p>
      </div>
    );
  }

  if (!liga) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy mb-2">
          Gerenciamento
        </h1>
        <p className="font-plex-sans text-[13px] text-navy/50">Nenhuma liga encontrada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Gerenciamento
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Visão Staff · Todas as ligas
        </p>
      </div>

      {/* Seletor de liga */}
      <div className="relative mb-8">
        <button
          onClick={() => setSeletorAberto((v) => !v)}
          className="flex items-center gap-3 bg-white border border-navy/15 px-4 py-3 hover:border-navy/30 transition-colors w-full sm:w-auto"
        >
          <div
            className="h-8 w-8 flex items-center justify-center text-white font-plex-mono text-[11px] shrink-0"
            style={{ background: "linear-gradient(135deg, #10284E, #546484)" }}
          >
            {liga.nome.charAt(0)}
          </div>
          <div className="text-left">
            <p className="font-plex-sans font-semibold text-[13px] text-navy">{liga.nome}</p>
            <p className="font-plex-mono text-[10px] text-navy/50">
              {liga.info.area || "Sem área definida"}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-navy/40 ml-auto transition-transform",
              seletorAberto && "rotate-180",
            )}
          />
        </button>

        {seletorAberto && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-navy/15 overflow-hidden w-full sm:w-80">
            {ligas.map((l) => (
              <button
                key={l.id}
                onClick={() => selecionarLiga(l.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 hover:bg-navy/[0.03] transition-colors text-left border-b border-navy/10 last:border-0",
                  l.id === ligaSelecionadaId && "bg-navy/5",
                )}
              >
                <div
                  className="h-7 w-7 flex items-center justify-center text-white font-plex-mono text-[10px] shrink-0"
                  style={{ background: "linear-gradient(135deg, #10284E, #546484)" }}
                >
                  {l.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-plex-sans font-semibold text-[13px] truncate",
                      l.id === ligaSelecionadaId ? "text-navy" : "text-navy/70",
                    )}
                  >
                    {l.nome}
                  </p>
                  <p className="font-plex-mono text-[10px] text-navy/50 truncate">
                    {l.info.area || "Sem área"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {seletorAberto && (
          <div className="fixed inset-0 z-10" onClick={() => setSeletorAberto(false)} />
        )}
      </div>

      {/* Abas */}
      <div className="border-b border-navy/15 mb-8">
        <div className="flex">
          {ABAS.map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={cn(
                "px-5 py-3 font-plex-mono text-[10px] uppercase tracking-[0.14em] transition-colors border-b-2 -mb-px",
                abaAtiva === aba
                  ? "border-navy text-navy"
                  : "border-transparent text-navy/40 hover:text-navy",
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
      {abaAtiva === "Recursos" && <AbaRecursos key={liga.id} ligaId={liga.id} />}
      {abaAtiva === "Desempenho" && <AbaDesempenho liga={liga} todasLigas={ligas} />}
    </div>
  );
}
