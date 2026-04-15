import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { Camera } from "lucide-react";
import { VisaoGeralTab } from "./tabs/VisaoGeralTab";
import { MembrosTab } from "./tabs/MembrosTab";
import { PresencaTab } from "./tabs/PresencaTab";
import { ProjetosTab } from "./tabs/ProjetosTab";
import { RecursosTab } from "./tabs/RecursosTab";

type AbaId = "visao-geral" | "membros" | "presenca" | "projetos" | "recursos";

function primeiroUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

const ABAS: { id: AbaId; label: string }[] = [
  { id: "visao-geral", label: "Visão Geral" },
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
  const [role, setRole] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("visao-geral");
  const [carregando, setCarregando] = useState(true);
  const [uploadandoImagem, setUploadandoImagem] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [ligaRes, minhaRes, sessionData] = await Promise.all([
        fetch(`/api/ligas/${id}`, { headers }),
        fetch("/api/ligas/minha", { headers }),
        supabase.auth.getSession(),
      ]);

      if (ligaRes.ok) setLiga(await ligaRes.json());
      if (minhaRes.ok) {
        const minha = await minhaRes.json() as Liga;
        setMinhaLigaId(minha.id);
      }

      const email = sessionData.data.session?.user.email;
      if (email) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("role")
          .eq("email", email)
          .single();
        setRole(usuario?.role ?? null);
      }

      setCarregando(false);
    }
    carregar();
  }, [id]);

  async function handleImagemUpload(file: File) {
    if (!liga) return;
    setUploadandoImagem(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("imagem", file);
      const res = await fetch(`/api/ligas/${liga.id}/imagem`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const ligaAtualizada = await res.json() as Liga;
        setLiga((prev) => prev ? { ...prev, imagem_url: ligaAtualizada.imagem_url } : prev);
      }
    } finally {
      setUploadandoImagem(false);
    }
  }

  const podeEditarImagem = role === "staff" || role === "diretor";

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

        {podeEditarImagem && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadandoImagem}
              className="absolute top-3 right-4 z-10 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {uploadandoImagem ? (
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {uploadandoImagem ? "Enviando..." : "Foto"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImagemUpload(file);
                e.target.value = "";
              }}
            />
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-3 flex items-end justify-between">
          <div>
            <h1 className="font-display font-bold text-lg text-white leading-tight">{liga.nome}</h1>
            <p className="text-xs text-white/70 mt-0.5">
              Diretor: {liga.diretores && liga.diretores.length > 0 ? liga.diretores.map((d) => primeiroUltimoNome(d.nome)).join(", ") : "—"} · {membros.length} membros
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
        {abaAtiva === "visao-geral" && <VisaoGeralTab ligaId={liga.id} diretores={liga.diretores ?? []} />}
        {abaAtiva === "membros" && <MembrosTab ligaId={liga.id} />}
        {abaAtiva === "presenca" && <PresencaTab ligaId={liga.id} />}
        {abaAtiva === "projetos" && <ProjetosTab ligaId={liga.id} />}
        {abaAtiva === "recursos" && <RecursosTab ligaId={liga.id} />}
      </div>
    </div>
  );
}
