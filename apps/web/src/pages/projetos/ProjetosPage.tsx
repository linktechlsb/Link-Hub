import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { ProjetosLiderView } from "./ProjetosLiderView";
import { ProjetosStaffView } from "./ProjetosStaffView";
import { ProjetosProfessorView } from "./ProjetosProfessorView";

type ProjetoAPI = {
  id: string;
  liga_id: string;
  liga?: { id: string; nome: string };
  titulo: string;
  descricao?: string;
  responsavel_id: string;
  status: string;
  prazo?: string;
  percentual_concluido: number;
  aprovacao_professor: string;
  aprovacao_staff: string;
  criado_em: string;
};

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function PainelDetalhes({
  projeto,
  onFechar,
}: {
  projeto: ProjetoAPI;
  onFechar: () => void;
}) {
  return (
    <div className="bg-white border border-brand-gray rounded-lg p-6 mx-1">
      <div className="flex items-start justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-navy">{projeto.titulo}</h2>
        <button
          onClick={onFechar}
          className="text-muted-foreground hover:text-navy transition-colors ml-4"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-4">
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Liga</span>
          <p className="text-navy mt-0.5">{projeto.liga?.nome ?? "—"}</p>
        </div>
        {projeto.prazo && (
          <div>
            <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Prazo</span>
            <p className="text-navy mt-0.5">{formatarData(projeto.prazo)}</p>
          </div>
        )}
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Status</span>
          <p className="mt-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 capitalize">
              {projeto.status.replace("_", " ")}
            </span>
          </p>
        </div>
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Progresso</span>
          <p className="text-navy mt-0.5">{projeto.percentual_concluido}%</p>
        </div>
      </div>
      {projeto.descricao && (
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Descrição</span>
          <p className="text-sm text-muted-foreground mt-0.5">{projeto.descricao}</p>
        </div>
      )}
    </div>
  );
}

export function ProjetosPage() {
  const { role } = useUser();
  const [projetos, setProjetos] = useState<ProjetoAPI[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/projetos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setProjetos(await res.json() as ProjetoAPI[]);
        }
      } finally {
        setLoadingProjetos(false);
      }
    }
    void carregar();
  }, []);

  // Aguarda carregar o role do Supabase
  if (role === null) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Visão do staff (admin)
  if (role === "staff") {
    return <ProjetosStaffView />;
  }

  // Visão do professor
  if (role === "professor") {
    return <ProjetosProfessorView />;
  }

  // Visão do diretor
  if (role === "diretor") {
    return <ProjetosLiderView />;
  }

  // Visão para outros roles não reconhecidos
  if (role !== "membro") {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-navy">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Criação, aprovação e acompanhamento de projetos
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Módulo em desenvolvimento.</p>
      </div>
    );
  }

  // Visão do membro — dados reais da API
  const projetosFiltrados = projetos
    .filter((p) => p.titulo.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      const da = a.prazo ?? "9999-99-99";
      const db = b.prazo ?? "9999-99-99";
      return da.localeCompare(db);
    });

  const subtitulo = loadingProjetos
    ? "Carregando..."
    : `${projetosFiltrados.length} ${projetosFiltrados.length === 1 ? "projeto" : "projetos"}`;

  function toggleSelecionado(id: string) {
    setSelecionado((prev) => (prev === id ? null : id));
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Projetos</h1>
        <p className="text-muted-foreground text-sm mt-1">{subtitulo}</p>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar projeto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-brand-gray rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
          />
        </div>
      </div>

      {/* Tabela */}
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
                Progresso
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingProjetos ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">
                  Carregando projetos...
                </td>
              </tr>
            ) : projetosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">
                  Nenhum projeto encontrado.
                </td>
              </tr>
            ) : (
              projetosFiltrados.map((p) => {
                const isAberto = selecionado === p.id;
                return (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => toggleSelecionado(p.id)}
                      className={cn(
                        "border-b border-brand-gray cursor-pointer transition-colors hover:bg-gray-50"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-navy">{p.titulo}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                            {p.descricao}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-link-blue font-medium">{p.liga?.nome ?? "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 capitalize">
                          {p.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-navy">
                        {p.percentual_concluido}%
                      </td>
                    </tr>
                    {isAberto && (
                      <tr key={`${p.id}-detalhe`} className="bg-white">
                        <td colSpan={4} className="px-4 pb-4 pt-0">
                          <PainelDetalhes
                            projeto={p}
                            onFechar={() => setSelecionado(null)}
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
    </div>
  );
}
