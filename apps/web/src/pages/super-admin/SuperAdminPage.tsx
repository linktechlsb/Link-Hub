import {
  Archive,
  Check,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/pages/home/v1/primitives";
import { LigaSheet } from "@/pages/ligas/LigaSheet";

import { CriarUsuarioCard } from "./CriarUsuarioCard";
import { LigaMembrosSheet } from "./LigaMembrosSheet";
import { UsuarioSheet } from "./UsuarioSheet";

import type { Liga, UserRole } from "@link-leagues/types";

// ─── Tipos locais ──────────────────────────────────────────────────────────────

interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  liga_nome?: string;
  liga_id?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function primeiroUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  staff: { label: "Staff", className: "bg-brand-yellow/20 text-navy border-brand-yellow/30" },
  diretor: { label: "Diretor", className: "bg-navy/10 text-navy border-navy/15" },
  membro: {
    label: "Membro",
    className: "bg-foreground/[0.07] text-foreground/60 border-foreground/10",
  },
  professor: { label: "Professor", className: "bg-blue-50 text-blue-700 border-blue-100" },
  estudante: {
    label: "Estudante",
    className: "bg-foreground/[0.04] text-foreground/50 border-foreground/[0.07]",
  },
};

const ROLES: { value: UserRole | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os cargos" },
  { value: "staff", label: "Staff" },
  { value: "diretor", label: "Diretor" },
  { value: "membro", label: "Membro" },
  { value: "professor", label: "Professor" },
  { value: "estudante", label: "Estudante" },
];

function RoleBadge({ role }: { role: UserRole }) {
  const { label, className } = ROLE_BADGE[role];
  return (
    <span
      className={cn(
        "font-plex-mono text-[10px] font-semibold uppercase tracking-[0.08em] border px-2 py-0.5 rounded-full",
        className,
      )}
    >
      {label}
    </span>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

type Aba = "ligas" | "aprovacoes" | "usuarios";

export function SuperAdminPage() {
  const location = useLocation();
  const locationState = location.state as { aba?: Aba; abrirCriar?: boolean } | null;
  const estadoConsumido = useRef(false);

  const [abaAtiva, setAbaAtiva] = useState<Aba>(locationState?.aba ?? "ligas");
  const [cardCriarAberto, setCardCriarAberto] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [presencaMedia, setPresencaMedia] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
  const [filtroRole, setFiltroRole] = useState<UserRole | "todos">("todos");
  const [filtroLiga, setFiltroLiga] = useState<string>("todas");
  const [confirmarRemocaoId, setConfirmarRemocaoId] = useState<string | null>(null);
  const [confirmarArquivoId, setConfirmarArquivoId] = useState<string | null>(null);

  const [sheetUsuarioOpen, setSheetUsuarioOpen] = useState(false);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<UsuarioAdmin | undefined>(undefined);

  const [sheetLigaOpen, setSheetLigaOpen] = useState(false);
  const [ligaParaEditar, setLigaParaEditar] = useState<Liga | undefined>(undefined);

  const [sheetMembrosOpen, setSheetMembrosOpen] = useState(false);
  const [ligaMembros, setLigaMembros] = useState<Liga | null>(null);

  const [pendentes, setPendentes] = useState<{
    projetos: { id: string; titulo: string; liga?: { nome: string }; criado_em: string }[];
    eventos: {
      id: string;
      titulo: string;
      liga?: { nome: string };
      criado_em: string;
      categoria: string;
    }[];
  }>({ projetos: [], eventos: [] });
  const [aprovando, setAprovando] = useState<string | null>(null);

  async function carregarDados() {
    setCarregando(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [resUsuarios, resLigas, resVisao, resPendentes] = await Promise.all([
        fetch("/api/usuarios", { headers }),
        fetch("/api/ligas", { headers }),
        fetch("/api/usuarios/visao-geral", { headers }),
        fetch("/api/pendentes", { headers }),
      ]);

      if (resUsuarios.ok) setUsuarios(await resUsuarios.json());
      if (resLigas.ok) setLigas(await resLigas.json());
      if (resPendentes.ok) setPendentes(await resPendentes.json());
      if (resVisao.ok) {
        const visao: { presenca_pct?: number | null }[] = await resVisao.json();
        const comPresenca = visao.filter((u) => u.presenca_pct != null);
        setPresencaMedia(
          comPresenca.length > 0
            ? Math.round(
                comPresenca.reduce((acc, u) => acc + (u.presenca_pct ?? 0), 0) / comPresenca.length,
              )
            : null,
        );
      }
    } finally {
      setCarregando(false);
    }
  }

  async function aprovarProjeto(id: string) {
    setAprovando(id);
    const token = await getToken();
    await fetch(`/api/projetos/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "aprovado" }),
    });
    setPendentes((p) => ({ ...p, projetos: p.projetos.filter((x) => x.id !== id) }));
    setAprovando(null);
  }

  async function rejeitarProjeto(id: string) {
    setAprovando(id);
    const token = await getToken();
    await fetch(`/api/projetos/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "rejeitado" }),
    });
    setPendentes((p) => ({ ...p, projetos: p.projetos.filter((x) => x.id !== id) }));
    setAprovando(null);
  }

  async function aprovarEvento(id: string) {
    setAprovando(id);
    const token = await getToken();
    await fetch(`/api/eventos/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "aprovado" }),
    });
    setPendentes((p) => ({ ...p, eventos: p.eventos.filter((x) => x.id !== id) }));
    setAprovando(null);
  }

  async function rejeitarEvento(id: string) {
    setAprovando(id);
    const token = await getToken();
    await fetch(`/api/eventos/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "rejeitado" }),
    });
    setPendentes((p) => ({ ...p, eventos: p.eventos.filter((x) => x.id !== id) }));
    setAprovando(null);
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  useEffect(() => {
    if (!estadoConsumido.current && locationState?.abrirCriar) {
      estadoConsumido.current = true;
      setCardCriarAberto(true);
    }
  }, [locationState]);

  async function removerUsuario(id: string) {
    const token = await getToken();
    await fetch(`/api/usuarios/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    setConfirmarRemocaoId(null);
  }

  async function arquivarLiga(id: string) {
    const token = await getToken();
    await fetch(`/api/ligas/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setLigas((prev) => prev.filter((l) => l.id !== id));
    setConfirmarArquivoId(null);
  }

  const totalProjetos = ligas.reduce((acc, l) => acc + (l.projetos_ativos ?? 0), 0);
  const totalPendentes = pendentes.projetos.length + pendentes.eventos.length;

  const usuariosFiltrados = usuarios.filter((u) => {
    const buscaOk =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase());
    const roleOk = filtroRole === "todos" || u.role === filtroRole;
    const ligaOk = filtroLiga === "todas" || u.liga_id === filtroLiga;
    return buscaOk && roleOk && ligaOk;
  });

  const kpis = [
    { label: "Usuários", valor: carregando ? "—" : String(usuarios.length) },
    { label: "Ligas Ativas", valor: carregando ? "—" : String(ligas.length) },
    { label: "Projetos Ativos", valor: carregando ? "—" : String(totalProjetos) },
    {
      label: "Presença Geral",
      valor: carregando ? "—" : presencaMedia != null ? `${presencaMedia}%` : "—",
    },
  ];

  const ABAS: { id: Aba; label: string }[] = [
    { id: "ligas", label: "Ligas" },
    {
      id: "aprovacoes",
      label: totalPendentes > 0 ? `Aprovações (${totalPendentes})` : "Aprovações",
    },
    { id: "usuarios", label: "Usuários" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Super Admin
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mt-1">
          Gestão da Link Leagues
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border border-foreground/[0.08] rounded-lg px-5 py-4 bg-foreground/[0.01]"
          >
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 mb-1.5">
              {kpi.label}
            </p>
            <p className="font-display font-bold text-[26px] tracking-[-0.02em] text-navy leading-none">
              {kpi.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <AnimatedTabs
        tabs={ABAS.map(({ id, label }) => ({ id, label }))}
        activeTab={abaAtiva}
        onChange={(id) => setAbaAtiva(id as Aba)}
        wrapperClassName="border-foreground/[0.08] mb-8"
        activeTabClassName="text-navy"
        inactiveTabClassName="text-foreground/40 hover:text-foreground/60"
      />

      {/* ── Aba: Ligas ── */}
      {abaAtiva === "ligas" && (
        <div className="space-y-6">
          <SectionHeader
            numero="01"
            eyebrow="Gestão"
            titulo="Ligas"
            acao={
              <button
                onClick={() => {
                  setLigaParaEditar(undefined);
                  setSheetLigaOpen(true);
                }}
                className="font-plex-sans text-[11px] font-semibold text-foreground/45 border border-foreground/[0.15] px-3 py-1.5 rounded-full bg-transparent hover:border-foreground/30 transition-colors"
              >
                + Nova Liga
              </button>
            }
          />

          {carregando ? (
            <p className="font-plex-sans text-[13px] text-foreground/50">Carregando...</p>
          ) : ligas.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-foreground/50">
              Nenhuma liga cadastrada.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
                    Diretores
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden md:table-cell">
                    Projetos
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden md:table-cell">
                    Status
                  </th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {ligas.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                        {l.nome}
                      </span>
                      {l.descricao && (
                        <p className="font-plex-sans text-[11px] text-foreground/40 mt-0.5 leading-snug">
                          {l.descricao}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      {l.diretores && l.diretores.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {l.diretores.map((d) => (
                            <span
                              key={d.id}
                              className="font-plex-mono text-[10px] text-foreground/70 bg-foreground/[0.07] border border-foreground/[0.08] px-2 py-0.5 rounded-full"
                            >
                              {primeiroUltimoNome(d.nome)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-plex-mono text-[12px] text-foreground/25">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-plex-mono text-[13px] text-foreground/60 hidden md:table-cell">
                      {l.projetos_ativos ?? 0}
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      {confirmarArquivoId === l.id ? (
                        <div className="flex items-center gap-3">
                          <span className="font-plex-sans text-[12px] text-red-600">Arquivar?</span>
                          <button
                            onClick={() => void arquivarLiga(l.id)}
                            className="font-plex-sans text-[12px] font-semibold text-red-600 hover:text-red-800 transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmarArquivoId(null)}
                            className="font-plex-sans text-[12px] text-foreground/40 hover:text-foreground transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <span className="font-plex-mono text-[10px] font-semibold uppercase tracking-[0.08em] border border-foreground/[0.15] text-foreground/50 px-2 py-0.5 rounded-full">
                          Ativa
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      {confirmarArquivoId === l.id ? null : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                              <MoreHorizontal size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[150px]">
                            <DropdownMenuItem
                              className="text-[12px] cursor-pointer"
                              onClick={() => {
                                setLigaParaEditar(l);
                                setSheetLigaOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[12px] cursor-pointer"
                              onClick={() => {
                                setLigaMembros(l);
                                setSheetMembrosOpen(true);
                              }}
                            >
                              <Users className="h-3.5 w-3.5 mr-2" />
                              Membros
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                              onClick={() => setConfirmarArquivoId(l.id)}
                            >
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Aba: Aprovações ── */}
      {abaAtiva === "aprovacoes" && (
        <div className="space-y-6">
          <SectionHeader numero="02" eyebrow="Pendências" titulo="Aprovações Pendentes" />

          {pendentes.projetos.length === 0 && pendentes.eventos.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-foreground/50">
              Nenhuma aprovação pendente. Tudo em dia!
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Tipo
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
                    Liga
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden md:table-cell">
                    Enviado em
                  </th>
                  <th className="text-right py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendentes.projetos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="font-plex-mono text-[10px] font-semibold uppercase tracking-[0.08em] border border-foreground/[0.15] text-foreground/50 px-2 py-0.5 rounded-full">
                        Projeto
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                        {p.titulo}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-plex-sans text-[13px] text-foreground/60 hidden sm:table-cell">
                      {p.liga?.nome ?? "—"}
                    </td>
                    <td className="py-4 px-4 font-plex-mono text-[11px] text-foreground/50 hidden md:table-cell">
                      {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={aprovando === p.id}
                          onClick={() => void aprovarProjeto(p.id)}
                          className="font-plex-sans text-[11px] font-semibold text-white bg-navy px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          Aprovar
                        </button>
                        <button
                          disabled={aprovando === p.id}
                          onClick={() => void rejeitarProjeto(p.id)}
                          className="font-plex-sans text-[11px] font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendentes.eventos.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="font-plex-mono text-[10px] font-semibold uppercase tracking-[0.08em] border border-foreground/[0.15] text-foreground/50 px-2 py-0.5 rounded-full">
                        {e.categoria}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                        {e.titulo}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-plex-sans text-[13px] text-foreground/60 hidden sm:table-cell">
                      {e.liga?.nome ?? "—"}
                    </td>
                    <td className="py-4 px-4 font-plex-mono text-[11px] text-foreground/50 hidden md:table-cell">
                      {new Date(e.criado_em).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={aprovando === e.id}
                          onClick={() => void aprovarEvento(e.id)}
                          className="font-plex-sans text-[11px] font-semibold text-white bg-navy px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          Aprovar
                        </button>
                        <button
                          disabled={aprovando === e.id}
                          onClick={() => void rejeitarEvento(e.id)}
                          className="font-plex-sans text-[11px] font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Aba: Usuários ── */}
      {abaAtiva === "usuarios" && (
        <div className="space-y-6">
          <SectionHeader
            numero="03"
            eyebrow="Gestão"
            titulo="Usuários"
            acao={
              <button
                onClick={() => setCardCriarAberto(true)}
                className="font-plex-sans text-[11px] font-semibold text-foreground/45 border border-foreground/[0.15] px-3 py-1.5 rounded-full bg-transparent hover:border-foreground/30 transition-colors"
              >
                + Novo Usuário
              </button>
            }
          />

          {/* Barra de filtros */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 border border-border bg-muted/50 py-2.5 font-plex-sans text-[13px] text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-foreground/30 rounded"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 border border-border bg-muted/50 rounded text-foreground/50 hover:text-foreground/80 hover:border-foreground/30 transition-colors">
                  <SlidersHorizontal size={15} />
                  {(filtroRole !== "todos" || filtroLiga !== "todas") && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-navy" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel className="font-plex-mono text-[10px] uppercase tracking-[0.12em] text-foreground/40 font-normal">
                  Filtrar por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="font-plex-sans text-[13px] cursor-pointer">
                    Cargo
                    {filtroRole !== "todos" && (
                      <span className="ml-auto font-plex-mono text-[10px] text-foreground/50 capitalize">
                        {filtroRole}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {ROLES.map(({ value, label }) => (
                      <DropdownMenuItem
                        key={value}
                        className="font-plex-sans text-[13px] cursor-pointer"
                        onClick={() => setFiltroRole(value)}
                      >
                        <Check
                          className={cn(
                            "h-3.5 w-3.5 mr-2 shrink-0",
                            filtroRole === value ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="font-plex-sans text-[13px] cursor-pointer">
                    Liga
                    {filtroLiga !== "todas" && (
                      <span className="ml-auto font-plex-mono text-[10px] text-foreground/50 truncate max-w-[80px]">
                        {ligas.find((l) => l.id === filtroLiga)?.nome ?? ""}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      className="font-plex-sans text-[13px] cursor-pointer"
                      onClick={() => setFiltroLiga("todas")}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 mr-2 shrink-0",
                          filtroLiga === "todas" ? "opacity-100" : "opacity-0",
                        )}
                      />
                      Todas as ligas
                    </DropdownMenuItem>
                    {ligas.map((l) => (
                      <DropdownMenuItem
                        key={l.id}
                        className="font-plex-sans text-[13px] cursor-pointer"
                        onClick={() => setFiltroLiga(l.id)}
                      >
                        <Check
                          className={cn(
                            "h-3.5 w-3.5 mr-2 shrink-0",
                            filtroLiga === l.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {l.nome}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {(filtroRole !== "todos" || filtroLiga !== "todas") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="font-plex-sans text-[13px] cursor-pointer text-foreground/50"
                      onClick={() => {
                        setFiltroRole("todos");
                        setFiltroLiga("todas");
                      }}
                    >
                      Limpar filtros
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {carregando ? (
            <p className="font-plex-sans text-[13px] text-foreground/50">Carregando...</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="font-plex-sans text-[13px] text-foreground/50">
              Nenhum usuário encontrado.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/40 font-normal hidden md:table-cell">
                    Liga
                  </th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-foreground/[0.06] hover:bg-foreground/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="font-plex-sans font-semibold text-[13px] text-foreground">
                        {u.nome}
                      </span>
                      <span className="block font-plex-mono text-[10px] text-foreground/40 mt-0.5 sm:hidden">
                        {u.email}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-plex-sans text-[13px] text-foreground/60 hidden sm:table-cell">
                      {u.email}
                    </td>
                    <td className="py-4 px-4">
                      {confirmarRemocaoId === u.id ? (
                        <div className="flex items-center gap-3">
                          <span className="font-plex-sans text-[12px] text-red-600">Remover?</span>
                          <button
                            onClick={() => void removerUsuario(u.id)}
                            className="font-plex-sans text-[12px] font-semibold text-red-600 hover:text-red-800 transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmarRemocaoId(null)}
                            className="font-plex-sans text-[12px] text-foreground/40 hover:text-foreground transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td className="py-4 px-4 font-plex-sans text-[13px] text-foreground/60 hidden md:table-cell">
                      {u.liga_nome ?? "—"}
                    </td>
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      {confirmarRemocaoId === u.id ? null : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-foreground/[0.08] text-foreground/40 hover:text-foreground/70 transition-colors">
                              <MoreHorizontal size={14} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[140px]">
                            <DropdownMenuItem
                              className="text-[12px] cursor-pointer"
                              onClick={() => {
                                setUsuarioParaEditar(u);
                                setSheetUsuarioOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[12px] cursor-pointer text-red-500 focus:text-red-600"
                              onClick={() => setConfirmarRemocaoId(u.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Dialog — Criar Usuário */}
      <Dialog
        open={cardCriarAberto}
        onOpenChange={(o) => {
          if (!o) setCardCriarAberto(false);
        }}
      >
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <CriarUsuarioCard
            ligas={ligas}
            onSalvo={carregarDados}
            onFechar={() => setCardCriarAberto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Sheets */}
      <UsuarioSheet
        open={sheetUsuarioOpen}
        onOpenChange={setSheetUsuarioOpen}
        usuario={usuarioParaEditar}
        ligas={ligas}
        onSalvo={carregarDados}
      />

      <LigaSheet
        open={sheetLigaOpen}
        onOpenChange={setSheetLigaOpen}
        liga={ligaParaEditar}
        onSalvo={carregarDados}
      />

      <LigaMembrosSheet
        open={sheetMembrosOpen}
        onOpenChange={setSheetMembrosOpen}
        liga={ligaMembros}
        onSalvo={carregarDados}
      />
    </div>
  );
}
