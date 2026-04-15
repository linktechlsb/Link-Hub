import { useEffect, useState } from "react";
import type { Liga, UserRole } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Search, Users, Building2, FolderOpen, BarChart2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LigaSheet } from "@/pages/ligas/LigaSheet";
import { UsuarioSheet } from "./UsuarioSheet";
import { LigaMembrosSheet } from "./LigaMembrosSheet";

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

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const ROLE_BADGE: Record<UserRole, string> = {
  staff: "bg-brand-yellow text-navy",
  diretor: "bg-navy/10 text-navy",
  membro: "bg-link-blue/10 text-link-blue",
  professor: "bg-blue-100 text-blue-700",
  estudante: "bg-gray-100 text-gray-600",
};

const ROLE_LABEL: Record<UserRole, string> = {
  staff: "staff",
  diretor: "diretor",
  membro: "membro",
  professor: "professor",
  estudante: "estudante",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
        ROLE_BADGE[role]
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function SuperAdminPage() {
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

  async function carregarDados() {
    setCarregando(true);
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}` };

    const [resUsuarios, resLigas, resVisao] = await Promise.all([
      fetch("/api/usuarios", { headers }),
      fetch("/api/ligas", { headers }),
      fetch("/api/usuarios/visao-geral", { headers }),
    ]);

    if (resUsuarios.ok) setUsuarios(await resUsuarios.json());
    if (resLigas.ok) setLigas(await resLigas.json());
    if (resVisao.ok) {
      const visao: { presenca_pct?: number | null }[] = await resVisao.json();
      const comPresenca = visao.filter((u) => u.presenca_pct != null);
      setPresencaMedia(
        comPresenca.length > 0
          ? Math.round(comPresenca.reduce((acc, u) => acc + (u.presenca_pct ?? 0), 0) / comPresenca.length)
          : null
      );
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregarDados();
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

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const totalProjetos = ligas.reduce((acc, l) => acc + (l.projetos_ativos ?? 0), 0);

  // ─── Filtro de usuários ────────────────────────────────────────────────────

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-navy">Super Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerenciamento de usuários, ligas e visão geral da plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Usuários", value: carregando ? "—" : usuarios.length, icon: Users },
          { label: "Ligas Ativas", value: carregando ? "—" : ligas.length, icon: Building2 },
          { label: "Projetos Ativos", value: carregando ? "—" : totalProjetos, icon: FolderOpen },
          { label: "Presença Geral", value: carregando ? "—" : presencaMedia != null ? `${presencaMedia}%` : "—", icon: BarChart2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-brand-gray rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-link-blue" strokeWidth={1.5} />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
            </div>
            <p className="text-3xl font-display font-bold text-navy">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Gestão de Ligas ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
        <div className="p-6 border-b border-brand-gray flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-lg text-navy">Gestão de Ligas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Criar, editar, arquivar ligas e gerenciar membros</p>
          </div>
          <Button
            className="bg-navy hover:bg-navy/90 text-white font-semibold flex-shrink-0"
            onClick={() => {
              setLigaParaEditar(undefined);
              setSheetLigaOpen(true);
            }}
          >
            + Nova Liga
          </Button>
        </div>

        {carregando ? (
          <p className="text-sm text-muted-foreground p-6">Carregando...</p>
        ) : ligas.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">Nenhuma liga cadastrada.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gray/40 border-b border-brand-gray">
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Liga</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Líder</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Projetos</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ligas.map((l) => (
                <tr key={l.id} className="border-b border-brand-gray last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3 text-sm font-semibold text-navy">{l.nome}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{l.lider_email ?? "—"}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{l.projetos_ativos ?? 0}</td>
                  <td className="px-6 py-3">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-navy/10 text-navy">
                      ativa
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {confirmarArquivoId === l.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-medium">Arquivar?</span>
                        <button
                          onClick={() => arquivarLiga(l.id)}
                          className="text-xs font-semibold text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmarArquivoId(null)}
                          className="text-xs text-muted-foreground hover:text-navy"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setLigaParaEditar(l);
                            setSheetLigaOpen(true);
                          }}
                          className="text-xs font-medium text-link-blue border border-brand-gray px-2.5 py-1 rounded hover:border-link-blue/40 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setLigaMembros(l);
                            setSheetMembrosOpen(true);
                          }}
                          className="text-xs font-medium text-link-blue border border-brand-gray px-2.5 py-1 rounded hover:border-link-blue/40 transition-colors"
                        >
                          Membros
                        </button>
                        <button
                          onClick={() => setConfirmarArquivoId(l.id)}
                          className="text-xs font-medium text-red-500 border border-red-100 px-2.5 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Arquivar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Gestão de Usuários ────────────────────────────────────────────────── */}
      <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
        <div className="p-6 border-b border-brand-gray flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-lg text-navy">Gestão de Usuários</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Criar, editar e remover usuários da plataforma</p>
          </div>
          <Button
            className="bg-navy hover:bg-navy/90 text-white font-semibold flex-shrink-0"
            onClick={() => {
              setUsuarioParaEditar(undefined);
              setSheetUsuarioOpen(true);
            }}
          >
            + Novo Usuário
          </Button>
        </div>

        <div className="px-6 py-4 border-b border-brand-gray">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-brand-gray rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-muted-foreground p-6">Carregando...</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">Nenhum usuário encontrado.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-brand-gray/40 border-b border-brand-gray">
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Nome</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Email</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Role</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Liga</th>
                <th className="text-left text-xs font-bold text-link-blue uppercase tracking-wider px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr key={u.id} className="border-b border-brand-gray last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3 text-sm font-semibold text-navy">{u.nome}</td>
                  <td className="px-6 py-3 text-sm text-link-blue">{u.email}</td>
                  <td className="px-6 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{u.liga_nome ?? "—"}</td>
                  <td className="px-6 py-3">
                    {confirmarRemocaoId === u.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-medium">Confirmar?</span>
                        <button
                          onClick={() => removerUsuario(u.id)}
                          className="text-xs font-semibold text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmarRemocaoId(null)}
                          className="text-xs text-muted-foreground hover:text-navy"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setUsuarioParaEditar(u);
                            setSheetUsuarioOpen(true);
                          }}
                          className="text-xs font-medium text-link-blue border border-brand-gray px-2.5 py-1 rounded hover:border-link-blue/40 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmarRemocaoId(u.id)}
                          className="text-xs font-medium text-red-500 border border-red-100 px-2.5 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Sheets ────────────────────────────────────────────────────────────── */}
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
