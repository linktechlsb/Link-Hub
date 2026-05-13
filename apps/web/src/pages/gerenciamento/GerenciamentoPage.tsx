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
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import { AbaCRM } from "./AbaCRM";
import { AbaPresenca } from "./AbaPresenca";
import { GerenciamentoStaffPage } from "./GerenciamentoStaffPage";

import type { Liga, RankingLiga } from "@link-leagues/types";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative h-9 w-9 flex items-center justify-center rounded-full border-2 border-transparent hover:border-navy/20 transition-colors shrink-0 outline-none"
          style={{ backgroundColor: cor }}
          title="Escolher ícone e cor"
        >
          <span className="group-hover:opacity-0 transition-opacity">
            <RecursoIcone id={icone} />
          </span>
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <Pencil className="h-3.5 w-3.5 text-white" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-3">
        <DropdownMenuLabel className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 px-0 pb-2">
          Ícone
        </DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-1.5">
          {ICONES.map((ic) => {
            const Comp = ic.componente;
            return (
              <button
                key={ic.id}
                type="button"
                onClick={() => onChange(ic.id, cor)}
                className={cn(
                  "h-8 w-8 flex items-center justify-center rounded transition-colors",
                  icone === ic.id
                    ? "bg-navy text-white"
                    : "bg-foreground/[0.06] text-foreground/60 hover:bg-foreground/[0.10]",
                )}
              >
                <Comp className="h-4 w-4" />
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator className="my-3" />
        <DropdownMenuLabel className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 px-0 pb-2">
          Cor
        </DropdownMenuLabel>
        <div className="flex flex-wrap gap-1.5">
          {CORES_PICKER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(icone, c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                cor === c ? "border-navy scale-110" : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
  if (cargo === "Diretor") return "bg-link-blue/10 text-link-blue";
  if (cargo === "Admin") return "bg-brand-yellow/20 text-navy";
  return "bg-foreground/[0.07] text-foreground/50";
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
  const [carregando, setCarregando] = useState(true);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [sheetModo, setSheetModo] = useState<"adicionar" | "editar">("adicionar");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [emailConvite, setEmailConvite] = useState("");
  const [cargoConvite, setCargoConvite] = useState<Cargo>("Membro");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [novoCargoEdit, setNovoCargoEdit] = useState<Cargo>("Membro");
  const [salvandoEdicaoId, setSalvandoEdicaoId] = useState<string | null>(null);
  const [confirmandoRemoverId, setConfirmandoRemoverId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

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
        body: JSON.stringify({ email, cargo: cargoConvite === "Diretor" ? "Diretor" : null }),
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
      setMembros((prev) => [{ ...novo, novo: true }, ...prev.filter((m) => m.id !== novo.id)]);
      setEmailConvite("");
      setSheetAberto(false);
      toast.success("Membro adicionado.");
    } finally {
      setEnviandoConvite(false);
    }
  }

  async function salvarEdicao(id: string) {
    if (!ligaId) return;
    setSalvandoEdicaoId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/ligas/${ligaId}/membros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cargo: novoCargoEdit === "Diretor" ? "Diretor" : null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Erro ao salvar cargo.");
        return;
      }
      setMembros((prev) => prev.map((m) => (m.id === id ? { ...m, cargo: novoCargoEdit } : m)));
      setSheetAberto(false);
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

  function abrirEditar(membro: MembroAtivo) {
    setEditandoId(membro.id);
    setNovoCargoEdit(membro.cargo);
    setSheetModo("editar");
    setSheetAberto(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        titulo="Membros da liga"
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
        acao={
          <button
            onClick={() => {
              setSheetModo("adicionar");
              setEmailConvite("");
              setCargoConvite("Membro");
              setSheetAberto(true);
            }}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
          >
            + Novo membro
          </button>
        }
      />

      {membros.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/40">Nenhum membro cadastrado.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-foreground/[0.08]">
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Nome
              </th>
              <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                Cargo
              </th>
              <th className="py-3 px-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {membros.map((m) => (
              <tr
                key={m.id}
                className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 shrink-0 flex items-center justify-center text-white font-plex-mono text-[11px] overflow-hidden"
                      style={m.avatarUrl ? undefined : { backgroundColor: m.cor }}
                    >
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        m.iniciais
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                          {m.nome}
                        </span>
                        {m.novo && (
                          <span className="font-plex-mono text-[9px] uppercase tracking-[0.10em] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            Novo
                          </span>
                        )}
                      </div>
                      <span className="font-plex-mono text-[10px] text-foreground/40">
                        {m.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  {confirmandoRemoverId === m.id ? (
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
                    <span
                      className={cn(
                        "font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5 rounded-full",
                        cargoBadgeClass(m.cargo),
                      )}
                    >
                      {m.cargo}
                    </span>
                  )}
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
                        onClick={() => abrirEditar(m)}
                      >
                        Editar cargo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                        onClick={() => setConfirmandoRemoverId(m.id)}
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

      {/* Sheet Adicionar/Editar */}
      <Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                Membros
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                {sheetModo === "adicionar" ? "Adicionar Membro" : "Editar Cargo"}
              </h2>
            </div>
            <div className="h-px bg-foreground/[0.08]" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {sheetModo === "adicionar" ? (
              <>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                    E-mail institucional
                  </label>
                  <input
                    type="email"
                    placeholder="usuario@faculdade.edu"
                    value={emailConvite}
                    onChange={(e) => setEmailConvite(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !enviandoConvite) void convidar();
                    }}
                    className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                  />
                  <p className="font-plex-sans text-[11px] text-foreground/40 mt-1.5">
                    O usuário precisa já estar cadastrado no sistema.
                  </p>
                </div>
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                    Cargo
                  </label>
                  <Select value={cargoConvite} onValueChange={(v) => setCargoConvite(v as Cargo)}>
                    <SelectTrigger className="w-full font-plex-sans text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Membro" className="font-plex-sans text-[13px]">
                        Membro
                      </SelectItem>
                      <SelectItem value="Diretor" className="font-plex-sans text-[13px]">
                        Diretor
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div>
                <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                  Cargo
                </label>
                <Select value={novoCargoEdit} onValueChange={(v) => setNovoCargoEdit(v as Cargo)}>
                  <SelectTrigger className="w-full font-plex-sans text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Membro" className="font-plex-sans text-[13px]">
                      Membro
                    </SelectItem>
                    <SelectItem value="Diretor" className="font-plex-sans text-[13px]">
                      Diretor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/[0.08]" />
            <div className="px-8 py-6 flex flex-col gap-3">
              {sheetModo === "adicionar" ? (
                <button
                  onClick={() => void convidar()}
                  disabled={enviandoConvite || !emailConvite.trim()}
                  className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {enviandoConvite && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Adicionar membro
                </button>
              ) : (
                <button
                  onClick={() => editandoId && void salvarEdicao(editandoId)}
                  disabled={salvandoEdicaoId !== null}
                  className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {salvandoEdicaoId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar alterações
                </button>
              )}
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

  const inputCls =
    "w-full border border-border px-3 py-2.5 bg-muted/50 font-plex-sans text-[13px] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded";

  return (
    <div className="space-y-8">
      {/* Dados Gerais */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Dados Gerais"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
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
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
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
            <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
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
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
        />
        {bannerPreview ? (
          <div className="relative overflow-hidden border border-navy/15 h-36">
            <img src={bannerPreview} alt="Banner da liga" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setBannerPreview("");
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
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
        />
        <div className="space-y-4">
          {[
            {
              label: "E-mail de contato",
              field: "emailContato" as const,
              type: "email",
              placeholder: "contato@faculdade.edu",
            },
            {
              label: "Instagram",
              field: "instagram" as const,
              type: "text",
              placeholder: "@ligatech",
            },
            {
              label: "LinkedIn",
              field: "linkedin" as const,
              type: "text",
              placeholder: "liga-tech-faculdade",
            },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
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
  const [sheetAberto, setSheetAberto] = useState(false);
  const [confirmandoDeletar, setConfirmandoDeletar] = useState<Recurso | null>(null);
  const [deletando, setDeletando] = useState(false);

  async function uploadArquivo(
    file: File,
    setUrl: (url: string) => void,
    setEnviando: (v: boolean) => void,
  ) {
    const tiposPermitidos = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    const tamanhoMaximoMB = 50;
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

  async function adicionar(): Promise<boolean> {
    setErro(null);
    if (!novoNome.trim()) {
      setErro("Informe o nome do recurso.");
      return false;
    }
    if (!novoUrl.trim()) {
      setErro("Informe a URL.");
      return false;
    }
    if (!ligaId) {
      setErro("Liga não identificada. Recarregue a página.");
      return false;
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
      return true;
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErro(body.error ?? `Erro ${res.status} ao salvar.`);
      return false;
    }
  }

  async function remover(id: string) {
    setDeletando(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/recursos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRecursos((prev) => prev.filter((r) => r.id !== id));
        toast.success("Recurso removido.");
      } else {
        toast.error("Erro ao remover recurso.");
      }
    } finally {
      setDeletando(false);
      setConfirmandoDeletar(null);
    }
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
        tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
        acao={
          <button
            onClick={() => {
              setNovoNome("");
              setNovoTipo("URL");
              setNovoUrl("");
              setNovoIcone("link");
              setNovoCor("#546484");
              setEditandoId(null);
              setSheetAberto(true);
            }}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
          >
            + Novo recurso
          </button>
        }
      />

      {recursos.length === 0 ? (
        <p className="font-plex-sans text-[13px] text-navy/40">Nenhum recurso cadastrado ainda.</p>
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
                      className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full"
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
                        onClick={() => setConfirmandoDeletar(r)}
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

      {/* Dialog de confirmação de deleção */}
      <AlertDialog
        open={!!confirmandoDeletar}
        onOpenChange={(v) => {
          if (!v && !deletando) setConfirmandoDeletar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-[18px] text-navy">
              Remover recurso
            </AlertDialogTitle>
            <AlertDialogDescription className="font-plex-sans text-[13px] text-foreground/60">
              Tem certeza que deseja remover{" "}
              <span className="font-semibold text-foreground">{confirmandoDeletar?.nome}</span>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletando}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletando}
              onClick={(e) => {
                e.preventDefault();
                if (confirmandoDeletar) void remover(confirmandoDeletar.id);
              }}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase bg-red-600 hover:bg-red-700 text-white"
            >
              {deletando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Removendo…
                </span>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet Adicionar/Editar */}
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
            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Nome
              </label>
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
                <input
                  value={editandoId ? (editForm.nome ?? "") : novoNome}
                  onChange={(e) =>
                    editandoId
                      ? setEditForm({ ...editForm, nome: e.target.value })
                      : setNovoNome(e.target.value)
                  }
                  placeholder="Nome do recurso"
                  className="flex-1 font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                />
              </div>
            </div>
            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Tipo
              </label>
              <Select
                value={editandoId ? (editForm.tipo ?? "URL") : novoTipo}
                onValueChange={(v) =>
                  editandoId ? setEditForm({ ...editForm, tipo: v }) : setNovoTipo(v)
                }
              >
                <SelectTrigger className="w-full font-plex-sans text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "URL",
                    "PDF",
                    "Apresentação",
                    "Documento",
                    "Notion",
                    "Planilha",
                    "Vídeo",
                    "Outro",
                  ].map((t) => (
                    <SelectItem key={t} value={t} className="font-plex-sans text-[13px]">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const tipo = editandoId ? (editForm.tipo ?? "URL") : novoTipo;
              const ehMidia =
                tipo === "PDF" ||
                tipo === "Documento" ||
                tipo === "Vídeo" ||
                tipo === "Apresentação";
              const currentUrl = editandoId ? (editForm.url ?? "") : novoUrl;
              const enviando = editandoId ? editEnviando : novoEnviando;
              const setUrl = (url: string) =>
                editandoId ? setEditForm({ ...editForm, url }) : setNovoUrl(url);
              const setEnviando = editandoId ? setEditEnviando : setNovoEnviando;
              const accept =
                tipo === "Vídeo"
                  ? "video/*"
                  : tipo === "PDF"
                    ? ".pdf"
                    : tipo === "Apresentação"
                      ? ".pdf,.ppt,.pptx"
                      : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

              return (
                <div>
                  <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                    {ehMidia ? "Arquivo" : "URL"}
                  </label>
                  {ehMidia ? (
                    <label
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 w-full h-24 border border-dashed rounded cursor-pointer transition-colors",
                        currentUrl
                          ? "border-foreground/30 bg-muted/30"
                          : "border-foreground/20 hover:border-foreground/40",
                      )}
                    >
                      {enviando ? (
                        <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
                      ) : currentUrl ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="font-plex-mono text-[10px] text-foreground/50 max-w-[220px] truncate">
                            {currentUrl.split("/").pop()}
                          </span>
                          <span className="font-plex-mono text-[9px] uppercase tracking-[0.12em] text-foreground/30">
                            Trocar arquivo
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-foreground/30" />
                          <span className="font-plex-sans text-[12px] text-foreground/40">
                            Clique para selecionar
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void uploadArquivo(file, setUrl, setEnviando);
                        }}
                      />
                    </label>
                  ) : (
                    <input
                      value={currentUrl}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                    />
                  )}
                </div>
              );
            })()}
            {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/[0.08]" />
            <div className="px-8 py-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  if (editandoId) void salvarEdicao(editandoId).then(() => setSheetAberto(false));
                  else
                    void adicionar().then((ok) => {
                      if (ok) setSheetAberto(false);
                    });
                }}
                disabled={
                  editandoId
                    ? !(editForm.nome ?? "").trim() || !(editForm.url ?? "").trim()
                    : !novoNome.trim() || !novoUrl.trim()
                }
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editandoId ? "Salvar alterações" : "Adicionar recurso"}
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
  const [sheetAberto, setSheetAberto] = useState(false);

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
        toast.success("Lançamento adicionado.");
        setSheetAberto(false);
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

  if (carregando)
    return <p className="font-plex-sans text-[13px] text-navy/50">Carregando financeiro…</p>;

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <KpiRow
        items={[
          { label: "Receitas", valor: formatarMoeda(totalReceitas) },
          { label: "Custos", valor: formatarMoeda(totalCustos) },
          { label: "Saldo", valor: formatarMoeda(saldo) },
        ]}
        cols={3}
      />

      {/* Lista de lançamentos */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Lançamentos"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
          acao={
            <button
              onClick={() => {
                setNovoTipo("receita");
                setNovaRecorrencia("unico");
                setNovaDescricao("");
                setNovaObs("");
                setNovoValor("");
                setNovaData(new Date().toISOString().slice(0, 10));
                setSheetAberto(true);
              }}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
            >
              + Adicionar
            </button>
          }
        />

        {registros.length === 0 ? (
          <p className="font-plex-sans text-[13px] text-navy/40">Nenhum lançamento ainda.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-foreground/[0.08]">
                <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                  Descrição
                </th>
                <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
                  Data
                </th>
                <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden md:table-cell">
                  Recorrência
                </th>
                <th className="text-right py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                  Valor
                </th>
                <th className="py-3 px-4 w-10" />
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-plex-mono text-[10px] uppercase px-1.5 py-0.5 rounded-full font-bold shrink-0",
                          r.tipo === "receita"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600",
                        )}
                      >
                        {r.tipo === "receita" ? "+" : "−"}
                      </span>
                      <div>
                        <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                          {r.descricao}
                        </span>
                        {r.observacao && (
                          <span className="block font-plex-sans text-[11px] text-foreground/40">
                            {r.observacao}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-plex-mono text-[11px] text-foreground/50 hidden sm:table-cell">
                    {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-4 px-4 hidden md:table-cell">
                    <span
                      className={cn(
                        "font-plex-mono text-[9px] uppercase tracking-[0.10em] px-2 py-0.5 rounded-full",
                        r.recorrencia === "recorrente"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-foreground/[0.06] text-foreground/50",
                      )}
                    >
                      {r.recorrencia === "recorrente" ? "Recorrente" : "Único"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span
                      className={cn(
                        "font-plex-mono text-[12px]",
                        r.tipo === "receita" ? "text-green-600" : "text-red-500",
                      )}
                    >
                      {r.tipo === "receita" ? "+" : "−"}
                      {formatarMoeda(r.valor)}
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
      </section>

      {/* Sheet Adicionar Lançamento */}
      <Sheet open={sheetAberto} onOpenChange={(v) => !v && setSheetAberto(false)}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col gap-0 p-0">
          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/20" />
            <div className="px-8 pt-8 pb-6">
              <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                Financeiro
              </p>
              <h2 className="font-display font-bold text-[22px] tracking-[-0.02em] text-foreground mt-1">
                Adicionar Lançamento
              </h2>
            </div>
            <div className="h-px bg-foreground/[0.08]" />
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {/* Tipo */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNovoTipo("receita")}
                className={cn(
                  "flex-1 py-2 font-plex-mono text-[10px] tracking-[0.14em] uppercase border-2 transition-colors rounded-full",
                  novoTipo === "receita"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-foreground/15 text-foreground/40 hover:border-green-300",
                )}
              >
                + Receita
              </button>
              <button
                type="button"
                onClick={() => setNovoTipo("custo")}
                className={cn(
                  "flex-1 py-2 font-plex-mono text-[10px] tracking-[0.14em] uppercase border-2 transition-colors rounded-full",
                  novoTipo === "custo"
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-foreground/15 text-foreground/40 hover:border-red-300",
                )}
              >
                − Custo
              </button>
            </div>

            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Recorrência
              </label>
              <Select
                value={novaRecorrencia}
                onValueChange={(v) => setNovaRecorrencia(v as "unico" | "recorrente")}
              >
                <SelectTrigger className="w-full font-plex-sans text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unico" className="font-plex-sans text-[13px]">
                    Único
                  </SelectItem>
                  <SelectItem value="recorrente" className="font-plex-sans text-[13px]">
                    Recorrente
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Descrição
              </label>
              <input
                value={novaDescricao}
                onChange={(e) => setNovaDescricao(e.target.value)}
                placeholder="Ex: Patrocínio empresa X"
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            <div>
              <label className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3 block">
                Observação (opcional)
              </label>
              <input
                value={novaObs}
                onChange={(e) => setNovaObs(e.target.value)}
                placeholder="Detalhes adicionais"
                className="w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-plex-sans text-[13px] text-foreground/40 pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder="0,00"
                  className="w-full font-plex-sans text-[13px] text-foreground border border-border pl-9 pr-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
                />
              </div>
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="w-40 font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            {erro && <p className="font-plex-sans text-[12px] text-red-600">{erro}</p>}
          </div>

          <div className="flex-shrink-0">
            <div className="h-px bg-foreground/[0.08]" />
            <div className="px-8 py-6 flex flex-col gap-3">
              <button
                onClick={() => void adicionar()}
                disabled={enviando || !novaDescricao.trim() || !novoValor.trim()}
                className="w-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-[#10244D] px-4 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {enviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Adicionar lançamento
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
function AbaDesempenho({ ligaId }: { ligaId: string | null }) {
  const { data: rankingData } = useCachedFetch<RankingLiga[]>("/api/ranking");
  const { data: ligasData } = useCachedFetch<Liga[]>("/api/ligas");

  const ranking = rankingData ?? [];
  const ligas = ligasData ?? [];
  const minha = ligaId ? ranking.find((r) => r.liga_id === ligaId) : null;
  const ligaInfo = ligaId ? ligas.find((l) => l.id === ligaId) : null;

  const score = minha?.pontuacao ?? 0;
  const scoreMaxRanking = ranking.reduce((acc, r) => Math.max(acc, r.pontuacao ?? 0), 0);
  const scoreMax = Math.max(scoreMaxRanking, 1);
  const porcentagem = Math.round((score / scoreMax) * 100);
  const posicao = minha?.posicao ?? null;

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const resumo = [
    {
      label: "Projetos concluídos",
      valor: String(minha?.projetos_concluidos ?? 0),
      cor: "text-green-600",
    },
    {
      label: "Em andamento",
      valor: String(minha?.projetos_em_andamento ?? 0),
      cor: "text-blue-600",
    },
    {
      label: "Receita total",
      valor: formatarMoeda(Number(minha?.receita_total ?? 0)),
      cor: "text-amber-600",
    },
    {
      label: "Membros ativos",
      valor: String(ligaInfo?.total_membros ?? 0),
      cor: "text-navy",
    },
  ];

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

  return (
    <div className="space-y-8">
      {/* Score */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Score Atual"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
        />
        <div className="border border-navy/15 p-5 rounded-lg">
          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="font-display font-bold text-4xl text-navy">{score}</span>
              <span className="font-plex-sans text-lg text-navy/40 ml-1">pts</span>
            </div>
            {posicao !== null && (
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

      {/* KPIs */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Resumo"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
        />
        <KpiRow
          items={resumo.map((r) => ({ label: r.label, valor: r.valor }))}
          cols={resumo.length <= 3 ? 3 : 4}
        />
      </section>

      {/* Indicadores */}
      <section className="space-y-4">
        <SectionHeader
          titulo="Indicadores"
          tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue dark:text-white"
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
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

type Aba =
  | "Membros"
  | "Informações"
  | "Recursos"
  | "Receita"
  | "Presença"
  | "Contatos"
  | "Desempenho";

const ABAS: Aba[] = [
  "Membros",
  "Informações",
  "Recursos",
  "Receita",
  "Presença",
  "Contatos",
  "Desempenho",
];

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
        </p>
      </div>

      {/* Abas */}
      <AnimatedTabs
        tabs={ABAS}
        activeTab={abaAtiva}
        onChange={(aba) => setAbaAtiva(aba as Aba)}
        wrapperClassName="mb-8"
      />

      {/* Conteúdo da aba */}
      {abaAtiva === "Membros" && <AbaMembros ligaId={ligaId} />}
      {abaAtiva === "Informações" && <AbaInformacoes ligaId={ligaId} initialInfo={ligaInfo} />}
      {abaAtiva === "Recursos" && <AbaRecursos ligaId={ligaId} />}
      {abaAtiva === "Receita" && <AbaReceita ligaId={ligaId} />}
      {abaAtiva === "Presença" && <AbaPresenca ligaId={ligaId} />}
      {abaAtiva === "Contatos" && <AbaCRM ligaId={ligaId} />}
      {abaAtiva === "Desempenho" && <AbaDesempenho ligaId={ligaId} />}
    </div>
  );
}
