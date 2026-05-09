import {
  MoreHorizontal,
  X,
  Plus,
  Image,
  Link,
  FileText,
  Globe,
  Folder,
  BookOpen,
  Code2,
  Video,
  Music,
  Star,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AnimatedTabs } from "@/components/ui/animated-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SectionHeader, KpiRow, RankingList } from "@/pages/home/v1/primitives";

import type { RankingLiga } from "@link-leagues/types";

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
  "w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60";

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
        <div className="absolute left-0 top-11 z-50 bg-background border border-foreground/15 p-3 w-56">
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

  const inputCls =
    "w-full border border-navy/20 px-3 py-2.5 bg-background font-plex-sans text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-navy/60";

  return (
    <div className="space-y-8">
      {/* Dados Gerais */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Dados Gerais"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
          acao={
            alterado ? (
              <div className="flex items-center gap-3">
                {salvo && <span className="font-plex-sans text-[12px] text-green-600">Salvo!</span>}
                {erro && <span className="font-plex-sans text-[12px] text-red-600">{erro}</span>}
                <button
                  onClick={() => void salvar()}
                  disabled={salvando}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors disabled:opacity-40"
                >
                  {salvando ? "Salvando…" : "Salvar alterações"}
                </button>
              </div>
            ) : null
          }
        />
        <div className="space-y-4">
          {[
            { label: "Nome da liga", field: "nome" as const, placeholder: "" },
            { label: "Área de atuação", field: "area" as const, placeholder: "" },
            {
              label: "Semestre de fundação",
              field: "semestre" as const,
              placeholder: "ex: 2023.1",
            },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                {label}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                placeholder={placeholder}
                className={inputCls}
              />
            </div>
          ))}
          <div>
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
              Descrição
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
          </div>
        </div>
      </section>

      {/* Foto / Banner */}
      <section className="space-y-3">
        <SectionHeader
          titulo="Foto / Banner da Liga"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        />
        {bannerPreview ? (
          <div className="relative overflow-hidden border border-navy/15 h-36">
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setBannerPreview("");
                setBannerFile(null);
                setForm((prev) => ({ ...prev, bannerUrl: "" }));
              }}
              className="absolute top-2 right-2 bg-background/80 hover:bg-background text-red-500 p-1 transition-colors"
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
      </section>

      {/* Contatos */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Contatos da Liga"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        />
        <div className="space-y-4">
          {[
            {
              label: "E-mail de contato",
              field: "emailContato" as const,
              type: "email",
              placeholder: "contato@faculdade.edu",
            },
            { label: "Instagram", field: "instagram" as const, type: "text", placeholder: "@liga" },
            {
              label: "LinkedIn",
              field: "linkedin" as const,
              type: "text",
              placeholder: "liga-faculdade",
            },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2 block">
                {label}
              </label>
              <input
                type={type}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                placeholder={placeholder}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Professor Mentor */}
      <section className="space-y-3">
        <SectionHeader
          titulo="Professor Mentor"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        />
        <input
          value={form.professorMentor}
          onChange={(e) => setForm({ ...form, professorMentor: e.target.value })}
          placeholder="Nome do professor mentor"
          className={inputCls}
        />
      </section>

      {/* Zona de Perigo */}
      <section className="space-y-3">
        <SectionHeader
          titulo="Zona de Perigo"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-red-500"
        />
        <p className="font-plex-sans text-[13px] text-foreground/50">
          Arquivar a liga a tornará inativa e não aparecerá mais para os membros. Pode ser revertido
          pelo Super Admin.
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
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-full transition-colors"
          >
            Arquivar liga
          </button>
        )}
      </section>
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
  const [sheetAberto, setSheetAberto] = useState(false);

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
    setSheetAberto(true);
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
    <div className="space-y-6">
      <SectionHeader
        titulo="Recursos"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        acao={
          <button
            onClick={() => {
              setNovoNome("");
              setNovoTipo("Link");
              setNovoUrl("");
              setNovoIcone("link");
              setNovoCor("#546484");
              setEditandoId(null);
              setSheetAberto(true);
            }}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white transition-colors"
          >
            + Adicionar
          </button>
        }
      />

      {recursos.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/40">Nenhum recurso cadastrado.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Recurso
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
                URL
              </th>
              <th className="py-3 px-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {recursos.map((r) => (
              <tr
                key={r.id}
                className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: r.cor }}
                    >
                      <RecursoIcone id={r.icone} />
                    </div>
                    <div>
                      <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                        {r.nome}
                      </span>
                      <span className="block font-plex-mono text-[10px] text-foreground/40">
                        {r.tipo}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 hidden sm:table-cell">
                  <span className="font-plex-mono text-[11px] text-foreground/40 truncate max-w-[200px] block">
                    {r.url}
                  </span>
                </td>
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer"
                        onClick={() => iniciarEdicao(r)}
                      >
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                        onClick={() => void remover(r.id)}
                      >
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                Recursos
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                {editandoId ? "Editar Recurso" : "Adicionar Recurso"}
              </h2>
            </div>
            <div className="h-px bg-foreground/[0.08]" />
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <div className="flex items-center gap-3">
              <IconeCor
                icone={editandoId ? (editForm.icone ?? "link") : novoIcone}
                cor={editandoId ? (editForm.cor ?? "#546484") : novoCor}
                onChange={(ic, c) => {
                  if (editandoId) setEditForm({ ...editForm, icone: ic, cor: c });
                  else {
                    setNovoIcone(ic);
                    setNovoCor(c);
                  }
                }}
              />
              <div className="flex-1">
                <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                  Nome
                </label>
                <input
                  value={editandoId ? (editForm.nome ?? "") : novoNome}
                  onChange={(e) =>
                    editandoId
                      ? setEditForm({ ...editForm, nome: e.target.value })
                      : setNovoNome(e.target.value)
                  }
                  placeholder="Nome do recurso"
                  className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                />
              </div>
            </div>
            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                URL
              </label>
              <input
                value={editandoId ? (editForm.url ?? "") : novoUrl}
                onChange={(e) =>
                  editandoId
                    ? setEditForm({ ...editForm, url: e.target.value })
                    : setNovoUrl(e.target.value)
                }
                placeholder="https://..."
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>
            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Tipo
              </label>
              <input
                value={editandoId ? (editForm.tipo ?? "") : novoTipo}
                onChange={(e) =>
                  editandoId
                    ? setEditForm({ ...editForm, tipo: e.target.value })
                    : setNovoTipo(e.target.value)
                }
                placeholder="Ex: Documento, Notion..."
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>
            {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
          </div>
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/[0.08]" />
            <div className="px-8 py-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  if (editandoId) void salvarEdicao(editandoId).then(() => setSheetAberto(false));
                  else
                    void adicionar().then(() => {
                      if (!erro) setSheetAberto(false);
                    });
                }}
                style={{
                  backgroundColor: editandoId
                    ? (editForm.nome ?? "").trim() && (editForm.url ?? "").trim()
                      ? "#10244D"
                      : "#9FA7B8"
                    : novoNome.trim() && novoUrl.trim()
                      ? "#10244D"
                      : "#9FA7B8",
                }}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white px-4 py-3 rounded-full hover:opacity-90 transition-all"
              >
                {editandoId ? "Salvar" : "Adicionar"}
              </button>
              <button
                onClick={() => setSheetAberto(false)}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Desempenho ──
function AbaDesempenho({ liga, todasLigas }: { liga: Liga; todasLigas: Liga[] }) {
  const { data: rankingData } = useCachedFetch<RankingLiga[]>("/api/ranking");
  const ranking = rankingData ?? [];
  const minha = ranking.find((r) => r.liga_id === liga.id) ?? null;
  const score = minha?.pontuacao ?? 0;
  const scoreMaxRanking = ranking.reduce((acc, r) => Math.max(acc, r.pontuacao ?? 0), 0);
  const scoreMax = Math.max(scoreMaxRanking, 1);
  const porcentagem = Math.round((score / scoreMax) * 100);

  const composicao = [
    {
      label: "Projetos concluídos",
      valor: minha?.projetos_concluidos ?? 0,
      cor: "bg-green-500",
    },
    { label: "Presenças", valor: minha?.presencas ?? 0, cor: "bg-blue-500" },
    {
      label: "Receita (R$)",
      valor: Math.round(Number(minha?.receita_total ?? 0)),
      cor: "bg-amber-500",
    },
    { label: "Publicações", valor: minha?.posts ?? 0, cor: "bg-purple-500" },
  ];
  const composicaoMax = Math.max(...composicao.map((c) => c.valor), 1);

  // Ranking ordenado a partir dos dados reais; cai pra todasLigas se ranking ainda não carregou
  const rankingMap = new Map(ranking.map((r) => [r.liga_id, r] as const));
  const rankingOrdenado = [...todasLigas]
    .map((l) => ({ ...l, pontos: rankingMap.get(l.id)?.pontuacao ?? 0 }))
    .sort((a, b) => b.pontos - a.pontos);
  const posicao = minha?.posicao ?? rankingOrdenado.findIndex((l) => l.id === liga.id) + 1;

  return (
    <div className="space-y-8">
      {/* Score */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Score Atual"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        />
        <div className="border border-navy/15 p-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="font-display font-bold text-4xl text-navy">{score}</span>
              <span className="font-plex-sans text-lg text-navy/40 ml-1">pts</span>
            </div>
            {posicao > 0 && (
              <span className="font-plex-mono text-[10px] uppercase tracking-[0.14em] bg-brand-yellow text-navy px-2 py-0.5 rounded-full">
                {posicao}º lugar
              </span>
            )}
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
      </section>

      {/* KPIs resumo */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Resumo"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        />
        <KpiRow
          items={[
            { label: "Projetos concluídos", valor: String(minha?.projetos_concluidos ?? 0) },
            { label: "Em andamento", valor: String(minha?.projetos_em_andamento ?? 0) },
            { label: "Presenças", valor: String(minha?.presencas ?? 0) },
            { label: "Publicações", valor: String(minha?.posts ?? 0) },
          ]}
          cols={4}
        />
      </section>

      {/* Indicadores */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Indicadores"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        />
        <div className="space-y-4">
          {composicao.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                  {c.label}
                </span>
                <span className="font-plex-mono text-[12px] text-foreground">{c.valor}</span>
              </div>
              <div className="w-full bg-navy/10 h-px overflow-hidden">
                <div
                  className={cn("h-px", c.cor)}
                  style={{ width: `${Math.round((c.valor / composicaoMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ranking comparativo */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Comparativo — Ranking Geral"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
        />
        <RankingList
          items={rankingOrdenado.map((l) => ({
            id: l.id,
            nome: l.nome,
            score: l.pontos,
            destaque: l.id === liga.id,
          }))}
        />
      </section>
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
      <AnimatedTabs
        tabs={ABAS}
        activeTab={abaAtiva}
        onChange={(aba) => setAbaAtiva(aba as Aba)}
        wrapperClassName="mb-8"
      />

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
