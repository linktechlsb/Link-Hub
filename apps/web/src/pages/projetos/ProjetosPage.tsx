import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { ProjetosLiderView } from "./ProjetosLiderView";
import { ProjetosStaffView } from "./ProjetosStaffView";
import { ProjetosProfessorView } from "./ProjetosProfessorView";

// ID fixo do membro mockado que "participa" do projeto Landing page da liga
const MOCK_MEMBER_ID = "user-al";

const MOCK_PROJETOS = [
  {
    id: "1",
    nome: "Landing page da liga",
    liga: "Tech",
    descricao:
      "Página pública apresentando os membros, projetos e conquistas da Liga Tech...",
    receita: 2500,
    prazo: "2025-06-30",
    status: "aprovado",
    membros: [
      { id: "user-al", iniciais: "AL" },
      { id: "user-jr", iniciais: "JR" },
      { id: "user-pa", iniciais: "PA" },
    ],
  },
  {
    id: "2",
    nome: "Dashboard financeiro",
    liga: "Finanças",
    descricao: "Painel de controle para acompanhamento do orçamento das ligas.",
    receita: 6000,
    prazo: "2025-07-15",
    status: "aprovado",
    membros: [
      { id: "user-rc", iniciais: "RC" },
      { id: "user-ks", iniciais: "KS" },
    ],
  },
  {
    id: "3",
    nome: "Identidade visual",
    liga: "Marketing",
    descricao: "Rebranding completo da Liga Tech com novo manual de marca.",
    receita: 3500,
    prazo: "2025-08-01",
    status: "aprovado",
    membros: [{ id: "user-if", iniciais: "IF" }],
  },
];

function formatarReceita(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type Projeto = (typeof MOCK_PROJETOS)[number];

function AvatarStack({ membros }: { membros: Projeto["membros"] }) {
  return (
    <div className="flex -space-x-2">
      {membros.map((m) => (
        <div
          key={m.id}
          className="h-7 w-7 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center border-2 border-white"
          title={m.iniciais}
        >
          {m.iniciais}
        </div>
      ))}
    </div>
  );
}

function PainelDetalhes({
  projeto,
  onFechar,
}: {
  projeto: Projeto;
  onFechar: () => void;
}) {
  return (
    <div className="bg-white border border-brand-gray rounded-lg p-6 mx-1">
      <div className="flex items-start justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-navy">{projeto.nome}</h2>
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
          <p className="text-navy mt-0.5">{projeto.liga}</p>
        </div>
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Receita</span>
          <p className="text-navy mt-0.5">{formatarReceita(projeto.receita)}</p>
        </div>
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Prazo</span>
          <p className="text-navy mt-0.5">{formatarData(projeto.prazo)}</p>
        </div>
        <div>
          <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Status</span>
          <p className="mt-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
              Aprovado
            </span>
          </p>
        </div>
      </div>
      <div className="mb-4">
        <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Descrição</span>
        <p className="text-sm text-muted-foreground mt-0.5">{projeto.descricao}</p>
      </div>
      <div>
        <span className="text-xs font-bold text-link-blue uppercase tracking-wider">Membros</span>
        <div className="flex gap-2 mt-2 flex-wrap">
          {projeto.membros.map((m) => (
            <div
              key={m.id}
              className="h-8 w-8 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center"
              title={m.iniciais}
            >
              {m.iniciais}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjetosPage() {
  const { role } = useUser();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "meus">("todos");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const projetosFiltrados = MOCK_PROJETOS.filter((p) => {
    const passaFiltro =
      filtro === "meus"
        ? p.membros.some((m) => m.id === MOCK_MEMBER_ID)
        : true;
    const passaBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    return passaFiltro && passaBusca;
  }).sort((a, b) => {
    const da = a.prazo ?? "9999-99-99";
    const db = b.prazo ?? "9999-99-99";
    return da.localeCompare(db);
  });

  const meusProjetos = MOCK_PROJETOS.filter((p) =>
    p.membros.some((m) => m.id === MOCK_MEMBER_ID)
  );

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

  // Visão para estudante — não alterada
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

  const subtitulo =
    filtro === "meus"
      ? `${meusProjetos.length} ${meusProjetos.length === 1 ? "projeto que participo" : "projetos que participo"}`
      : `${MOCK_PROJETOS.length} projetos aprovados`;

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
        <button
          onClick={() => setFiltro(filtro === "meus" ? "todos" : "meus")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md border transition-colors",
            filtro === "meus"
              ? "bg-navy text-white border-navy"
              : "bg-white text-navy border-brand-gray hover:border-navy/40"
          )}
        >
          Meus projetos
        </button>
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
                Membros
              </th>
              <th className="text-left px-6 py-3 text-xs font-bold text-link-blue uppercase tracking-wider">
                Receita
              </th>
            </tr>
          </thead>
          <tbody>
            {projetosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">
                  Nenhum projeto encontrado.
                </td>
              </tr>
            ) : (
              projetosFiltrados.map((p) => {
                const isMeu = p.membros.some((m) => m.id === MOCK_MEMBER_ID);
                const isAberto = selecionado === p.id;
                return (
                  <>
                    <tr
                      key={p.id}
                      onClick={() => toggleSelecionado(p.id)}
                      className={cn(
                        "border-b border-brand-gray cursor-pointer transition-colors",
                        isMeu ? "bg-purple-50 hover:bg-purple-100/70" : "hover:bg-gray-50"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isMeu && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white shrink-0">
                              Meu
                            </span>
                          )}
                          <div>
                            <div className="font-bold text-navy">{p.nome}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                              {p.descricao}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-link-blue font-medium">{p.liga}</span>
                      </td>
                      <td className="px-6 py-4">
                        <AvatarStack membros={p.membros} />
                      </td>
                      <td className="px-6 py-4 font-medium text-navy">
                        {formatarReceita(p.receita)}
                      </td>
                    </tr>
                    {isAberto && (
                      <tr key={`${p.id}-detalhe`} className={isMeu ? "bg-purple-50" : "bg-white"}>
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
