import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { VisaoGeralTab } from "./tabs/VisaoGeralTab";
import { LiderTab } from "./tabs/LiderTab";
import { MembrosTab } from "./tabs/MembrosTab";
import { PresencaTab } from "./tabs/PresencaTab";
import { ProjetosTab } from "./tabs/ProjetosTab";
import { RecursosTab } from "./tabs/RecursosTab";

type AbaId = "visao-geral" | "lider" | "membros" | "presenca" | "projetos" | "recursos";

const ABAS: { id: AbaId; label: string }[] = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "lider", label: "Líder" },
  { id: "membros", label: "Membros" },
  { id: "presenca", label: "Presença" },
  { id: "projetos", label: "Projetos" },
  { id: "recursos", label: "Recursos" },
];

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [liga, setLiga] = useState<Liga | null>(null);
  const [minhaLigaId, setMinhaLigaId] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("visao-geral");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [ligaRes, minhaRes] = await Promise.all([
        fetch(`/api/ligas/${id}`, { headers }),
        fetch("/api/ligas/minha", { headers }),
      ]);

      if (ligaRes.ok) setLiga(await ligaRes.json());
      if (minhaRes.ok) {
        const minha = await minhaRes.json() as Liga;
        setMinhaLigaId(minha.id);
      }
      setCarregando(false);
    }
    carregar();
  }, [id]);

  if (carregando) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!liga) {
    return <div className="p-8 text-sm text-muted-foreground">Liga não encontrada.</div>;
  }

  const ehMinhaLiga = minhaLigaId === liga.id;
  const membros = (liga as Liga & { membros?: unknown[] }).membros ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Hero */}
      <div
        className="relative flex-shrink-0"
        style={{ height: "112px", background: "linear-gradient(135deg, #10284E 0%, #546484 100%)" }}
      >
        {liga.imagem_url && (
          <img
            src={liga.imagem_url}
            alt={liga.nome}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 to-transparent" />

        <button
          onClick={() => navigate("/home")}
          className="absolute top-3 left-4 z-10 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-md"
        >
          ← Home
        </button>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-3 flex items-end justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-white leading-tight">{liga.nome}</h1>
            <p className="text-xs text-white/70 mt-0.5">
              Líder: {liga.lider_email ?? "—"} · {membros.length} membros
            </p>
          </div>
          {ehMinhaLiga && (
            <span className="bg-brand-yellow text-navy text-xs font-bold px-3 py-1 rounded-md">
              Minha Liga
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-brand-gray flex overflow-x-auto flex-shrink-0 px-2">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={
              abaAtiva === aba.id
                ? "px-4 py-3 text-xs font-bold text-navy border-b-2 border-navy whitespace-nowrap"
                : "px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-navy whitespace-nowrap border-b-2 border-transparent transition-colors"
            }
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-y-auto p-6">
        {abaAtiva === "visao-geral" && <VisaoGeralTab ligaId={liga.id} />}
        {abaAtiva === "lider" && <LiderTab liga={liga} />}
        {abaAtiva === "membros" && <MembrosTab ligaId={liga.id} />}
        {abaAtiva === "presenca" && <PresencaTab ligaId={liga.id} />}
        {abaAtiva === "projetos" && <ProjetosTab ligaId={liga.id} />}
        {abaAtiva === "recursos" && <RecursosTab />}
      </div>
    </div>
  );
}
