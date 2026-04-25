import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { EditorialTable, KpiRow, SectionHeader } from "@/pages/home/v1/primitives";
import { LigaSheet } from "@/pages/ligas/LigaSheet";

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

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  staff: "bg-brand-yellow text-navy",
  diretor: "bg-navy/10 text-navy",
  membro: "bg-navy/[0.05] text-navy/60",
  professor: "bg-blue-100 text-blue-700",
  estudante: "bg-navy/[0.03] text-navy/50",
};

const ROLE_LABEL: Record<UserRole, string> = {
  staff: "Staff",
  diretor: "Diretor",
  membro: "Membro",
  professor: "Professor",
  estudante: "Estudante",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "font-plex-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5",
        ROLE_BADGE_CLASS[role],
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

type Aba = "ligas" | "aprovacoes" | "usuarios";

export function SuperAdminPage() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("ligas");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [presencaMedia, setPresencaMedia] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
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

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()),
  );

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
    { id: "aprovacoes", label: "Aprovações" },
    { id: "usuarios", label: "Usuários" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Super Admin
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Gestão de usuários, ligas e visão geral da plataforma
        </p>
      </div>

      <div className="space-y-10">
        <KpiRow items={kpis} />

        {/* Navegação de abas */}
        <div className="border-b border-navy/15">
          <div className="flex">
            {ABAS.map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={cn(
                  "px-5 py-3 font-plex-mono text-[10px] uppercase tracking-[0.14em] transition-colors border-b-2 -mb-px flex items-center gap-2",
                  abaAtiva === aba.id
                    ? "border-navy text-navy"
                    : "border-transparent text-navy/40 hover:text-navy",
                )}
              >
                {aba.label}
                {aba.id === "aprovacoes" && totalPendentes > 0 && (
                  <span className="font-plex-mono text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5">
                    {totalPendentes}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Aba: Ligas */}
        {abaAtiva === "ligas" && (
          <div>
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
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
                >
                  + Nova Liga
                </button>
              }
            />

            {carregando ? (
              <p className="font-plex-sans text-[13px] text-navy/50">Carregando...</p>
            ) : ligas.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-navy/50">Nenhuma liga cadastrada.</p>
            ) : (
              <EditorialTable
                columns={["Liga", "Líder", "Projetos", "Status", "Ações"]}
                rows={ligas.map((l) => [
                  <span key="n" className="font-medium">
                    {l.nome}
                  </span>,
                  l.diretores && l.diretores.length > 0
                    ? l.diretores.map((d) => primeiroUltimoNome(d.nome)).join(", ")
                    : "—",
                  String(l.projetos_ativos ?? 0),
                  <span
                    key="s"
                    className="font-plex-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 bg-navy/10 text-navy"
                  >
                    ativa
                  </span>,
                  confirmarArquivoId === l.id ? (
                    <div key="conf" className="flex items-center gap-3">
                      <span className="font-plex-sans text-[12px] text-red-600">Arquivar?</span>
                      <button
                        onClick={() => void arquivarLiga(l.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-600 hover:text-red-800 transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmarArquivoId(null)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <div key="acoes" className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          setLigaParaEditar(l);
                          setSheetLigaOpen(true);
                        }}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setLigaMembros(l);
                          setSheetMembrosOpen(true);
                        }}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
                      >
                        Membros
                      </button>
                      <button
                        onClick={() => setConfirmarArquivoId(l.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-400 hover:text-red-700 transition-colors"
                      >
                        Arquivar
                      </button>
                    </div>
                  ),
                ])}
              />
            )}
          </div>
        )}

        {/* Aba: Aprovações */}
        {abaAtiva === "aprovacoes" && (
          <div>
            <SectionHeader numero="02" eyebrow="Pendências" titulo="Aprovações Pendentes" />

            {pendentes.projetos.length === 0 && pendentes.eventos.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-navy/50">
                Nenhuma aprovação pendente. Tudo em dia!
              </p>
            ) : (
              <EditorialTable
                columns={["Tipo", "Nome", "Liga", "Enviado em", "Ações"]}
                rows={[
                  ...pendentes.projetos.map((p) => [
                    <span
                      key="t"
                      className="font-plex-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 bg-navy/10 text-navy"
                    >
                      Projeto
                    </span>,
                    <span key="n" className="font-medium">
                      {p.titulo}
                    </span>,
                    p.liga?.nome ?? "—",
                    new Date(p.criado_em).toLocaleDateString("pt-BR"),
                    <div key="a" className="flex items-center gap-4">
                      <button
                        disabled={aprovando === p.id}
                        onClick={() => void aprovarProjeto(p.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-green-700 hover:text-green-900 transition-colors disabled:opacity-40"
                      >
                        Aprovar
                      </button>
                      <button
                        disabled={aprovando === p.id}
                        onClick={() => void rejeitarProjeto(p.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
                      >
                        Rejeitar
                      </button>
                    </div>,
                  ]),
                  ...pendentes.eventos.map((e) => [
                    <span
                      key="t"
                      className="font-plex-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 bg-navy/[0.05] text-navy/70"
                    >
                      {e.categoria}
                    </span>,
                    <span key="n" className="font-medium">
                      {e.titulo}
                    </span>,
                    e.liga?.nome ?? "—",
                    new Date(e.criado_em).toLocaleDateString("pt-BR"),
                    <div key="a" className="flex items-center gap-4">
                      <button
                        disabled={aprovando === e.id}
                        onClick={() => void aprovarEvento(e.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-green-700 hover:text-green-900 transition-colors disabled:opacity-40"
                      >
                        Aprovar
                      </button>
                      <button
                        disabled={aprovando === e.id}
                        onClick={() => void rejeitarEvento(e.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
                      >
                        Rejeitar
                      </button>
                    </div>,
                  ]),
                ]}
              />
            )}
          </div>
        )}

        {/* Aba: Usuários */}
        {abaAtiva === "usuarios" && (
          <div>
            <SectionHeader
              numero="03"
              eyebrow="Gestão"
              titulo="Usuários"
              acao={
                <button
                  onClick={() => {
                    setUsuarioParaEditar(undefined);
                    setSheetUsuarioOpen(true);
                  }}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
                >
                  + Novo Usuário
                </button>
              }
            />

            {/* Busca */}
            <div className="relative max-w-sm mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy/30" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 border border-navy/20 py-2.5 bg-white font-plex-sans text-[13px] text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy/60"
              />
            </div>

            {carregando ? (
              <p className="font-plex-sans text-[13px] text-navy/50">Carregando...</p>
            ) : usuariosFiltrados.length === 0 ? (
              <p className="font-plex-sans text-[13px] text-navy/50">Nenhum usuário encontrado.</p>
            ) : (
              <EditorialTable
                columns={["Nome", "Email", "Role", "Liga", "Ações"]}
                rows={usuariosFiltrados.map((u) => [
                  <span key="n" className="font-medium">
                    {u.nome}
                  </span>,
                  <span key="e" className="text-navy/60">
                    {u.email}
                  </span>,
                  <RoleBadge key="r" role={u.role} />,
                  u.liga_nome ?? "—",
                  confirmarRemocaoId === u.id ? (
                    <div key="conf" className="flex items-center gap-3">
                      <span className="font-plex-sans text-[12px] text-red-600">Confirmar?</span>
                      <button
                        onClick={() => void removerUsuario(u.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-600 hover:text-red-800 transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmarRemocaoId(null)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/40 hover:text-navy transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <div key="acoes" className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          setUsuarioParaEditar(u);
                          setSheetUsuarioOpen(true);
                        }}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-navy/60 hover:text-navy transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmarRemocaoId(u.id)}
                        className="font-plex-mono text-[10px] tracking-[0.14em] uppercase text-red-400 hover:text-red-700 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  ),
                ])}
              />
            )}
          </div>
        )}
      </div>

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
