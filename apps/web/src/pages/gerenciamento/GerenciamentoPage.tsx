import {
  Check,
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
  Upload,
  Loader2,
  MoreVertical,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

import { AbaPresenca } from "./AbaPresenca";
import { GerenciamentoStaffPage } from "./GerenciamentoStaffPage";

// ─── tipos ────────────────────────────────────────────────────────────────────

type Cargo = "Membro" | "Diretor" | "Admin";

interface MembroAtivo {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  iniciais: string;
  cor: string;
  avatarUrl?: string | null;
  novo?: boolean;
}

interface Recurso {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  icone: string;
  cor: string;
}

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
  onChange: (icone: string, cor: string) => void;
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

interface InfoLiga {
  nome: string;
  area: string;
  descricao: string;
  semestre: string;
  emailContato: string;
  instagram: string;
  linkedin: string;
  bannerUrl: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const CORES = ["#10284E", "#546484", "#FEC641", "#6366f1", "#14b8a6", "#f97316"];

function corPorNome(nome: string): string {
  return CORES[nome.charCodeAt(0) % CORES.length]!;
}

interface MembroAPI {
  id: string;
  usuario_id: string;
  nome: string;
  email: string;
  cargo: string | null;
  role: string | null;
  avatar_url?: string | null;
}

function apiParaMembro(m: MembroAPI): MembroAtivo {
  let cargo: Cargo;
  if (m.cargo === "Diretor") {
    cargo = "Diretor";
  } else if (m.role === "staff") {
    cargo = "Admin";
  } else if (m.role === "diretor") {
    cargo = "Diretor";
  } else {
    cargo = "Membro";
  }
  const nome = m.nome ?? m.email;
  const iniciais = nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return {
    id: m.usuario_id,
    nome,
    email: m.email,
    cargo,
    iniciais,
    cor: corPorNome(nome),
    avatarUrl: m.avatar_url,
  };
}

function cargoBadgeClass(cargo: Cargo) {
  if (cargo === "Diretor") return "bg-purple-100 text-purple-700";
  if (cargo === "Admin") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const inputClass =
  "w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60";

// ─── sub-componentes de aba ───────────────────────────────────────────────────

// ── Membros ──
function AbaMembros({ ligaId }: { ligaId: string | null }) {
  const [membros, setMembros] = useState<MembroAtivo[]>([]);
  const [emailConvite, setEmailConvite] = useState("");
  const [cargoConvite, setCargoConvite] = useState<Cargo>("Membro");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoCargoEdit, setNovoCargoEdit] = useState<Cargo>("Membro");
  const [salvandoEdicaoId, setSalvandoEdicaoId] = useState<string | null>(null);
  const [confirmandoRemoverId, setConfirmandoRemoverId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [dropdownAbertoId, setDropdownAbertoId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownAbertoId(null);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  useEffect(() => {
    if (!ligaId) {
      setCarregando(false);
      return;
    }
    async function carregar() {
      try {
        const token = await getToken();
        const res = await fetch(`/api/ligas/${ligaId}/membros`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as MembroAPI[];
          setMembros(data.map(apiParaMembro));
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, [ligaId]);

  if (carregando)
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando membros…</p>;

  async function convidar() {
    if (!ligaId) {
      toast.error("Liga não identificada.");
      return;
    }
    const email = emailConvite.trim();
    if (!email) {
      toast.error("Informe o e-mail institucional.");
      return;
    }
    setEnviandoConvite(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          cargo: cargoConvite === "Diretor" ? "Diretor" : null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string } & MembroAPI;
      if (!res.ok) {
        toast.error(body.error ?? "Erro ao adicionar membro.");
        return;
      }
      const novo = apiParaMembro({
        id: body.id,
        usuario_id: body.usuario_id,
        nome: body.nome ?? email,
        email: body.email ?? email,
        cargo: body.cargo ?? (cargoConvite === "Diretor" ? "Diretor" : null),
        role: body.role ?? null,
      });
      setMembros((prev) => {
        const semDuplicata = prev.filter((m) => m.id !== novo.id);
        return [{ ...novo, novo: true }, ...semDuplicata];
      });
      setEmailConvite("");
      toast.success("Membro adicionado.");
    } finally {
      setEnviandoConvite(false);
    }
  }

  function iniciarEdicao(membro: MembroAtivo) {
    setEditandoId(membro.id);
    setNovoCargoEdit(membro.cargo);
  }

  async function salvarEdicao(id: string) {
    if (!ligaId) return;
    setSalvandoEdicaoId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cargo: novoCargoEdit === "Diretor" ? "Diretor" : null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao salvar cargo.");
        return;
      }
      setMembros((prev) => prev.map((m) => (m.id === id ? { ...m, cargo: novoCargoEdit } : m)));
      setEditandoId(null);
      toast.success("Cargo atualizado.");
    } finally {
      setSalvandoEdicaoId(null);
    }
  }

  async function remover(id: string) {
    if (!ligaId) return;
    setRemovendoId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao remover membro.");
        return;
      }
      setMembros((prev) => prev.filter((m) => m.id !== id));
      toast.success("Membro removido.");
    } finally {
      setRemovendoId(null);
      setConfirmandoRemoverId(null);
    }
  }

  const diretor = membros.find((m) => m.cargo === "Diretor");

  return (
    <div className="space-y-8">
      {/* Adicionar */}
      <section className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Adicionar Novo Membro
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            placeholder="E-mail institucional…"
            value={emailConvite}
            onChange={(e) => setEmailConvite(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !enviandoConvite) void convidar();
            }}
            className="flex-1 min-w-[200px] border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
          />
          <select
            value={cargoConvite}
            onChange={(e) => setCargoConvite(e.target.value as Cargo)}
            className="w-36 border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60"
          >
            <option value="Membro">Membro</option>
            <option value="Diretor">Diretor</option>
          </select>
          <button
            onClick={() => void convidar()}
            disabled={enviandoConvite}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-2.5 hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {enviandoConvite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Adicionar"}
          </button>
        </div>
        <p className="font-plex-sans text-[12px] text-navy/40 mt-2">
          O usuário precisa já estar cadastrado no sistema (e-mail institucional).
        </p>
      </section>

      {/* Membros ativos */}
      <section className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Membros Ativos ({membros.length})
        </p>
        <div className="border-t border-navy/15">
          {membros.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-3 border-b border-navy/10"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 shrink-0 overflow-hidden flex items-center justify-center text-white font-plex-mono text-[11px]"
                  style={m.avatarUrl ? undefined : { backgroundColor: m.cor }}
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.nome} className="h-full w-full object-cover" />
                  ) : (
                    m.iniciais
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-plex-sans font-semibold text-[13px] text-navy">{m.nome}</p>
                    {m.novo && (
                      <span className="font-plex-mono text-[9px] uppercase tracking-[0.10em] bg-green-100 text-green-700 px-1.5 py-0.5">
                        Novo
                      </span>
                    )}
                  </div>
                  <p className="font-plex-mono text-[10px] text-navy/50">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {editandoId === m.id ? (
                  <>
                    <select
                      value={novoCargoEdit}
                      onChange={(e) => setNovoCargoEdit(e.target.value as Cargo)}
                      className="border border-navy/20 px-2 py-1.5 bg-white font-plex-sans text-[12px] text-navy focus:outline-none focus:border-navy/60"
                    >
                      <option value="Membro">Membro</option>
                      <option value="Diretor">Diretor</option>
                    </select>
                    <button
                      onClick={() => void salvarEdicao(m.id)}
                      disabled={salvandoEdicaoId === m.id}
                      className="text-green-600 hover:text-green-800 transition-colors disabled:opacity-40"
                    >
                      {salvandoEdicaoId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-navy/40 hover:text-navy transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : confirmandoRemoverId === m.id ? (
                  <div className="flex items-center gap-3">
                    <span className="font-plex-sans text-[12px] text-red-600">Remover?</span>
                    <button
                      onClick={() => void remover(m.id)}
                      disabled={removendoId === m.id}
                      className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-600 hover:text-red-800 transition-colors disabled:opacity-40"
                    >
                      {removendoId === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Sim"
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmandoRemoverId(null)}
                      className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <>
                    <span
                      className={cn(
                        "font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5",
                        cargoBadgeClass(m.cargo),
                      )}
                    >
                      {m.cargo}
                    </span>
                    <div className="relative" ref={dropdownAbertoId === m.id ? dropdownRef : null}>
                      <button
                        onClick={() => setDropdownAbertoId(dropdownAbertoId === m.id ? null : m.id)}
                        className="text-navy/40 hover:text-navy transition-colors p-1"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {dropdownAbertoId === m.id && (
                        <div className="absolute right-0 top-7 z-50 bg-white border border-navy/15 min-w-[130px] shadow-sm">
                          <button
                            onClick={() => {
                              iniciarEdicao(m);
                              setDropdownAbertoId(null);
                            }}
                            className="w-full text-left px-3 py-2 font-plex-sans text-[13px] text-navy hover:bg-navy/5 transition-colors flex items-center gap-2"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          {m.id !== diretor?.id && (
                            <button
                              onClick={() => {
                                setConfirmandoRemoverId(m.id);
                                setDropdownAbertoId(null);
                              }}
                              className="w-full text-left px-3 py-2 font-plex-sans text-[13px] text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Informações ──
function AbaInformacoes({ ligaId, initialInfo }: { ligaId: string | null; initialInfo: InfoLiga }) {
  const [form, setForm] = useState<InfoLiga>(initialInfo);
  const [bannerPreview, setBannerPreview] = useState<string>(initialInfo.bannerUrl);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alterado = JSON.stringify(form) !== JSON.stringify(initialInfo) || bannerFile !== null;

  async function salvar() {
    if (!ligaId) return;
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
            <img src={bannerPreview} alt="Banner da liga" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setBannerPreview("");
                setForm((prev) => ({ ...prev, bannerUrl: "" }));
              }}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 p-1 transition-colors"
              title="Remover imagem"
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
            placeholder="@ligatech"
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
            placeholder="liga-tech-faculdade"
            className={inputClass}
          />
        </div>
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
    </div>
  );
}

// ── Recursos ──
const TIPOS_COM_ARQUIVO = ["Apresentação", "Vídeo", "Documento"] as const;

type RecursoAPI = {
  id: string;
  titulo: string;
  tipo: string;
  url: string;
  icone: string;
  cor: string;
};

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

function AbaRecursos({ ligaId }: { ligaId: string | null }) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("URL");
  const [novoUrl, setNovoUrl] = useState("");
  const [novoIcone, setNovoIcone] = useState("link");
  const [novoCor, setNovoCor] = useState("#546484");
  const [novoEnviando, setNovoEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Recurso>>({});
  const [editEnviando, setEditEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function uploadArquivo(
    file: File,
    setUrl: (url: string) => void,
    setEnviando: (v: boolean) => void,
  ) {
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "text/plain",
      "application/zip",
    ];
    const tamanhoMaximoMB = 5;
    if (!tiposPermitidos.includes(file.type)) {
      setErro("Tipo de ficheiro não permitido. Use imagens, PDF, TXT ou ZIP.");
      return;
    }
    if (file.size > tamanhoMaximoMB * 1024 * 1024) {
      setErro(`O ficheiro não pode ter mais de ${tamanhoMaximoMB} MB.`);
      return;
    }

    setEnviando(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${ligaId ?? "geral"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("recursos").upload(path, file, { upsert: false });
    if (error) {
      setErro("Falha ao enviar o ficheiro. Tente novamente.");
      setEnviando(false);
      return;
    }
    const { data } = supabase.storage.from("recursos").getPublicUrl(path);
    setUrl(data.publicUrl);
    setEnviando(false);
  }

  useEffect(() => {
    if (!ligaId) {
      setCarregando(false);
      return;
    }
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
    if (!novoNome.trim()) {
      setErro("Informe o nome do recurso.");
      return;
    }
    if (!novoUrl.trim()) {
      setErro("Informe a URL.");
      return;
    }
    if (!ligaId) {
      setErro("Liga não identificada. Recarregue a página.");
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
      setErro(body.error ?? `Erro ${res.status} ao salvar.`);
    }
  }

  async function remover(id: string) {
    const token = await getToken();
    const res = await fetch(`/api/recursos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRecursos((prev) => prev.filter((r) => r.id !== id));
    }
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

  if (carregando) {
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando recursos…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Lista */}
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Recursos ({recursos.length})
        </p>
        {recursos.length === 0 ? (
          <p className="font-plex-sans text-[13px] text-navy/50">
            Nenhum recurso cadastrado ainda.
          </p>
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
                      <select
                        value={editForm.tipo ?? "URL"}
                        onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                        className="w-36 border border-navy/20 px-3 py-1.5 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 bg-white"
                      >
                        <option>URL</option>
                        <option>Documento</option>
                        <option>Notion</option>
                        <option>Planilha</option>
                        <option>Apresentação</option>
                        <option>Vídeo</option>
                        <option>Outro</option>
                      </select>
                    </div>
                    {(TIPOS_COM_ARQUIVO as readonly string[]).includes(editForm.tipo ?? "") ? (
                      <div>
                        <label
                          className={cn(
                            "flex items-center gap-2 w-full border border-dashed px-3 py-2 cursor-pointer transition-colors font-plex-sans text-[13px]",
                            editEnviando
                              ? "border-navy/30 bg-navy/5 text-navy/60 cursor-not-allowed"
                              : "border-navy/20 hover:border-navy/40 text-navy/50 hover:text-navy",
                          )}
                        >
                          {editEnviando ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <Upload className="h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate text-[12px]">
                            {editEnviando
                              ? "Enviando…"
                              : editForm.url
                                ? "Arquivo enviado — clique para substituir"
                                : "Clique para enviar arquivo"}
                          </span>
                          <input
                            type="file"
                            className="sr-only"
                            disabled={editEnviando}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file)
                                void uploadArquivo(
                                  file,
                                  (url) => setEditForm((f) => ({ ...f, url })),
                                  setEditEnviando,
                                );
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {editForm.url && (
                          <p className="mt-1 font-plex-sans text-[12px] text-green-600 truncate">
                            ✓ {editForm.url}
                          </p>
                        )}
                      </div>
                    ) : (
                      <input
                        value={editForm.url ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        placeholder="URL"
                        className="w-full border border-navy/20 px-3 py-1.5 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 bg-white"
                      />
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => void salvarEdicao(r.id)}
                        disabled={editEnviando}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-white bg-navy px-3 py-1.5 hover:bg-navy/90 transition-colors disabled:opacity-40"
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

      {/* Adicionar novo recurso */}
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
          <select
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            className="w-36 border border-navy/20 px-3 py-2 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 bg-white"
          >
            <option>URL</option>
            <option>Documento</option>
            <option>Notion</option>
            <option>Planilha</option>
            <option>Apresentação</option>
            <option>Vídeo</option>
            <option>Outro</option>
          </select>
          <button
            onClick={() => void adicionar()}
            disabled={novoEnviando}
            className="flex items-center gap-1.5 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-2.5 hover:bg-navy/90 transition-colors disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>
        <div className="mt-3">
          {(TIPOS_COM_ARQUIVO as readonly string[]).includes(novoTipo) ? (
            <label
              className={cn(
                "flex items-center gap-2 w-full border border-dashed px-4 py-3 cursor-pointer transition-colors font-plex-sans text-[13px]",
                novoEnviando
                  ? "border-navy/30 bg-navy/5 text-navy/60 cursor-not-allowed"
                  : "border-navy/20 hover:border-navy/40 text-navy/50 hover:text-navy",
              )}
            >
              {novoEnviando ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Upload className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">
                {novoEnviando
                  ? "Enviando arquivo…"
                  : novoUrl
                    ? "Arquivo enviado — clique para substituir"
                    : "Clique para selecionar arquivo"}
              </span>
              <input
                type="file"
                className="sr-only"
                disabled={novoEnviando}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadArquivo(file, setNovoUrl, setNovoEnviando);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <input
              value={novoUrl}
              onChange={(e) => setNovoUrl(e.target.value)}
              placeholder="URL do recurso"
              className="w-full border border-navy/20 px-3 py-2 font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60 bg-white"
            />
          )}
        </div>
        {erro && <p className="font-plex-sans text-[12px] text-red-600 mt-2">{erro}</p>}
      </div>
    </div>
  );
}

// ── Receita ──

interface RegistroFinanceiro {
  id: string;
  tipo: "receita" | "custo";
  recorrencia: "unico" | "recorrente";
  descricao: string;
  observacao: string;
  valor: number;
  data: string;
}

type RegistroFinanceiroAPI = {
  id: string;
  tipo: string;
  recorrencia: string;
  descricao: string;
  observacao: string | null;
  valor: string | number;
  data: string;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function apiParaRegistro(r: RegistroFinanceiroAPI): RegistroFinanceiro {
  return {
    id: r.id,
    tipo: r.tipo as "receita" | "custo",
    recorrencia: r.recorrencia === "recorrente" ? "recorrente" : "unico",
    descricao: r.descricao,
    observacao: r.observacao ?? "",
    valor: typeof r.valor === "string" ? parseFloat(r.valor) : r.valor,
    data: r.data,
  };
}

function AbaReceita({ ligaId }: { ligaId: string | null }) {
  const [registros, setRegistros] = useState<RegistroFinanceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [novoTipo, setNovoTipo] = useState<"receita" | "custo">("receita");
  const [novaRecorrencia, setNovaRecorrencia] = useState<"unico" | "recorrente">("unico");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaObs, setNovaObs] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novaData, setNovaData] = useState(new Date().toISOString().slice(0, 10));
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!ligaId) {
      setCarregando(false);
      return;
    }
    async function carregar() {
      try {
        const token = await getToken();
        const res = await fetch(`/api/receitas?liga_id=${ligaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as RegistroFinanceiroAPI[];
          setRegistros(data.map(apiParaRegistro));
        }
      } finally {
        setCarregando(false);
      }
    }
    void carregar();
  }, [ligaId]);

  async function adicionar() {
    setErro(null);
    if (!novaDescricao.trim()) {
      setErro("Informe a descrição.");
      return;
    }
    const valorNum = parseFloat(novoValor.replace(",", "."));
    if (isNaN(valorNum) || valorNum < 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (!ligaId) {
      setErro("Liga não identificada. Recarregue a página.");
      return;
    }
    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/receitas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: ligaId,
          tipo: novoTipo,
          recorrencia: novaRecorrencia,
          descricao: novaDescricao.trim(),
          observacao: novaObs.trim() || undefined,
          valor: valorNum,
          data: novaData,
        }),
      });
      if (res.ok) {
        const criado = (await res.json()) as RegistroFinanceiroAPI;
        setRegistros((prev) => [apiParaRegistro(criado), ...prev]);
        setNovaDescricao("");
        setNovaObs("");
        setNovoValor("");
        setNovaRecorrencia("unico");
        setNovaData(new Date().toISOString().slice(0, 10));
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErro(body.error ?? `Erro ${res.status} ao salvar.`);
      }
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    const token = await getToken();
    const res = await fetch(`/api/receitas/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRegistros((prev) => prev.filter((r) => r.id !== id));
    }
  }

  const totalReceitas = registros
    .filter((r) => r.tipo === "receita")
    .reduce((s, r) => s + r.valor, 0);
  const totalCustos = registros.filter((r) => r.tipo === "custo").reduce((s, r) => s + r.valor, 0);
  const saldo = totalReceitas - totalCustos;

  if (carregando) {
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando financeiro…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Resumo KPI */}
      <div className="grid grid-cols-3">
        <div className="border border-navy/15 p-5 border-r-0">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
            Receitas
          </p>
          <p className="font-display font-bold text-[22px] tracking-[-0.02em] text-green-600">
            {formatarMoeda(totalReceitas)}
          </p>
        </div>
        <div className="border border-navy/15 p-5 border-r-0">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
            Custos
          </p>
          <p className="font-display font-bold text-[22px] tracking-[-0.02em] text-red-500">
            {formatarMoeda(totalCustos)}
          </p>
        </div>
        <div className="border border-navy/15 p-5">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-2">
            Saldo
          </p>
          <p
            className={cn(
              "font-display font-bold text-[22px] tracking-[-0.02em]",
              saldo >= 0 ? "text-navy" : "text-red-500",
            )}
          >
            {formatarMoeda(saldo)}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Lançamentos ({registros.length})
        </p>
        {registros.length === 0 ? (
          <p className="font-plex-sans text-[13px] text-navy/50">Nenhum lançamento ainda.</p>
        ) : (
          <div className="border-t border-navy/15">
            {registros.map((r) => (
              <div
                key={r.id}
                className="border-b border-navy/10 py-3 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-7 w-7 flex items-center justify-center shrink-0 mt-0.5 text-white font-plex-mono text-[11px]",
                      r.tipo === "receita" ? "bg-green-500" : "bg-red-400",
                    )}
                  >
                    {r.tipo === "receita" ? "+" : "−"}
                  </div>
                  <div>
                    <p className="font-plex-sans font-semibold text-[13px] text-navy">
                      {r.descricao}
                    </p>
                    {r.observacao && (
                      <p className="font-plex-sans text-[12px] text-navy/50 mt-0.5">
                        {r.observacao}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-plex-mono text-[10px] text-navy/50">
                        {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                      <span
                        className={cn(
                          "font-plex-mono text-[9px] uppercase tracking-[0.10em] px-1.5 py-0.5",
                          r.recorrencia === "recorrente"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {r.recorrencia === "recorrente" ? "Recorrente" : "Único"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "font-plex-mono text-[12px]",
                      r.tipo === "receita" ? "text-green-600" : "text-red-500",
                    )}
                  >
                    {r.tipo === "receita" ? "+" : "−"}
                    {formatarMoeda(r.valor)}
                  </span>
                  <button
                    onClick={() => void remover(r.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adicionar */}
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Adicionar Lançamento
        </p>
        <div className="space-y-3">
          {/* Tipo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNovoTipo("receita")}
              className={cn(
                "flex-1 py-2 font-plex-mono text-[10px] tracking-[0.14em] uppercase border-2 transition-colors",
                novoTipo === "receita"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-navy/15 text-navy/40 hover:border-green-300",
              )}
            >
              + Receita
            </button>
            <button
              type="button"
              onClick={() => setNovoTipo("custo")}
              className={cn(
                "flex-1 py-2 font-plex-mono text-[10px] tracking-[0.14em] uppercase border-2 transition-colors",
                novoTipo === "custo"
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-navy/15 text-navy/40 hover:border-red-300",
              )}
            >
              − Custo
            </button>
          </div>

          {/* Recorrência */}
          <select
            value={novaRecorrencia}
            onChange={(e) => setNovaRecorrencia(e.target.value as "unico" | "recorrente")}
            className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60"
          >
            <option value="unico">Único</option>
            <option value="recorrente">Recorrente</option>
          </select>

          {/* Descrição */}
          <input
            value={novaDescricao}
            onChange={(e) => setNovaDescricao(e.target.value)}
            placeholder="Descrição"
            className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
          />

          {/* Observação */}
          <input
            value={novaObs}
            onChange={(e) => setNovaObs(e.target.value)}
            placeholder="Observação (opcional)"
            className="w-full border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
          />

          {/* Valor + Data */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-plex-sans text-[13px] text-navy/50 pointer-events-none">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={novoValor}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.,]/g, "");
                  setNovoValor(v);
                }}
                placeholder="0,00"
                className="w-full border border-navy/20 pl-9 pr-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
              />
            </div>
            <input
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="w-40 border border-navy/20 px-3 py-2.5 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60"
            />
          </div>

          {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}

          <button
            onClick={() => void adicionar()}
            disabled={enviando}
            className="flex items-center gap-1.5 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-navy px-4 py-3 hover:bg-navy/90 transition-colors disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {enviando ? "Salvando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Desempenho ──
function AbaDesempenho() {
  const score = 840;
  const scoreMax = 1000;
  const porcentagem = Math.round((score / scoreMax) * 100);

  const resumo = [
    { label: "Projetos concluídos", valor: "4", cor: "text-green-600" },
    { label: "Em andamento", valor: "2", cor: "text-blue-600" },
    { label: "Receita total", valor: "R$ 3.200", cor: "text-amber-600" },
    { label: "Frequência média", valor: "87%", cor: "text-purple-600" },
    { label: "Membros ativos", valor: "5", cor: "text-navy" },
  ];

  const composicao = [
    { label: "Projetos", formula: "4 projetos × 50 pts", valor: 200, cor: "bg-green-500" },
    { label: "Presenças", formula: "32 presenças × 10 pts", valor: 320, cor: "bg-blue-500" },
    { label: "Receita", formula: "R$ 3.200 × 0,015 pts", valor: 48, cor: "bg-amber-500" },
    { label: "Feed", formula: "54 publicações × 5 pts", valor: 272, cor: "bg-purple-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-4">
          Score Atual
        </p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="font-display font-bold text-4xl text-navy">{score}</span>
            <span className="font-plex-sans text-lg text-navy/40 ml-1">pts</span>
          </div>
          <span className="font-plex-mono text-[10px] uppercase tracking-[0.14em] bg-brand-yellow text-navy px-2 py-0.5">
            1º lugar
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

      {/* Resumo */}
      <div className="border border-navy/15 p-5">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Resumo
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {resumo.map((r) => (
            <div key={r.label} className="border border-navy/10 p-3">
              <p className={cn("font-display font-bold text-xl", r.cor)}>{r.valor}</p>
              <p className="font-plex-sans text-[12px] text-navy/50 mt-0.5">{r.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Composição do score */}
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
                <span className="font-plex-mono text-[12px] text-navy">{c.valor} pts</span>
              </div>
              <div className="w-full bg-navy/10 h-px overflow-hidden">
                <div
                  className={cn("h-px", c.cor)}
                  style={{ width: `${Math.round((c.valor / score) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

type Aba = "Membros" | "Informações" | "Recursos" | "Receita" | "Presença" | "Desempenho";

const ABAS: Aba[] = ["Membros", "Informações", "Recursos", "Receita", "Presença", "Desempenho"];

const INFO_VAZIA: InfoLiga = {
  nome: "",
  area: "",
  descricao: "",
  semestre: "",
  emailContato: "",
  instagram: "",
  linkedin: "",
  bannerUrl: "",
};

export function GerenciamentoPage() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("Membros");
  const [ligaNome, setLigaNome] = useState("");
  const [diretorNome, setDiretorNome] = useState("");
  const [ligaId, setLigaId] = useState<string | null>(null);
  const [ligaInfo, setLigaInfo] = useState<InfoLiga>(INFO_VAZIA);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        const token = await getToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user.email;
        if (email) {
          const { data: usuario } = await supabase
            .from("usuarios")
            .select("role")
            .eq("email", email)
            .single();
          if (usuario?.role) setRole(usuario.role as string);
        }

        const res = await fetch("/api/ligas/minha", { headers });
        if (res.ok) {
          const l = (await res.json()) as Record<string, unknown>;
          if (l.id) setLigaId(l.id as string);
          if (l.nome) setLigaNome(l.nome as string);
          setDiretorNome((l.lider_email as string) ?? "");
          setLigaInfo({
            nome: (l.nome as string) ?? "",
            area: (l.area as string) ?? "",
            descricao: (l.descricao as string) ?? "",
            semestre: (l.semestre_fundacao as string) ?? "",
            emailContato: (l.email_contato as string) ?? "",
            instagram: (l.instagram as string) ?? "",
            linkedin: (l.linkedin as string) ?? "",
            bannerUrl: (l.imagem_url as string) ?? "",
          });
        }
      } catch {
        // silencioso
      }
    }
    void carregarDados();
  }, []);

  if (role === "staff") return <GerenciamentoStaffPage />;

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Gerenciamento
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          {ligaNome || "Carregando…"}
          {diretorNome ? ` · ${diretorNome}` : ""}
        </p>
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

      {/* Conteúdo da aba */}
      {abaAtiva === "Membros" && <AbaMembros ligaId={ligaId} />}
      {abaAtiva === "Informações" && <AbaInformacoes ligaId={ligaId} initialInfo={ligaInfo} />}
      {abaAtiva === "Recursos" && <AbaRecursos ligaId={ligaId} />}
      {abaAtiva === "Receita" && <AbaReceita ligaId={ligaId} />}
      {abaAtiva === "Presença" && <AbaPresenca ligaId={ligaId} />}
      {abaAtiva === "Desempenho" && <AbaDesempenho />}
    </div>
  );
}
