import { Camera } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";
import { splitLigaTitle } from "@/pages/home/v1/splitLigaTitle";

import { MembrosTab } from "./tabs/MembrosTab";
import { PresencaTab } from "./tabs/PresencaTab";
import { ProjetosTab } from "./tabs/ProjetosTab";
import { RecursosTab } from "./tabs/RecursosTab";
import { VisaoGeralTab } from "./tabs/VisaoGeralTab";

import type { Liga } from "@link-leagues/types";

type AbaId = "visao-geral" | "membros" | "presenca" | "projetos" | "recursos";

function primeiroUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

const ABAS_COMPLETAS: { id: AbaId; label: string }[] = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "membros", label: "Membros" },
  { id: "presenca", label: "Presença" },
  { id: "projetos", label: "Projetos" },
  { id: "recursos", label: "Recursos" },
];

const ABAS_RESTRITAS: { id: AbaId; label: string }[] = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "membros", label: "Membros" },
];

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function LigaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: liga, carregando } = useCachedFetch<Liga>(id ? `/api/ligas/${id}` : null);
  const { data: minhaLiga } = useCachedFetch<Liga>("/api/ligas/minha");
  const minhaLigaId = minhaLiga?.id ?? null;
  const [ligaLocal, setLigaLocal] = useState<Liga | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("visao-geral");
  const [uploadandoImagem, setUploadandoImagem] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ligaExibida = ligaLocal ?? liga;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessao }) => {
      const email = sessao.session?.user.email;
      if (!email) return;
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("role")
        .eq("email", email)
        .single();
      setRole(usuario?.role ?? null);
    });
  }, []);

  async function handleImagemUpload(file: File) {
    if (!ligaExibida) return;
    setUploadandoImagem(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("imagem", file);
      const res = await fetch(`/api/ligas/${ligaExibida.id}/imagem`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const ligaAtualizada = (await res.json()) as Liga;
        setLigaLocal((prev) =>
          prev ? { ...prev, imagem_url: ligaAtualizada.imagem_url } : ligaAtualizada,
        );
      }
    } finally {
      setUploadandoImagem(false);
    }
  }

  const podeEditarImagem =
    role === "staff" || (role === "diretor" && minhaLigaId === ligaExibida?.id);

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <p className="font-plex-sans text-[13px] text-navy/50">Carregando...</p>
      </div>
    );
  }
  if (!ligaExibida) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <p className="font-plex-sans text-[13px] text-navy/50">Liga não encontrada.</p>
      </div>
    );
  }

  const ehMinhaLiga = minhaLigaId === ligaExibida.id;
  const membros = (ligaExibida as Liga & { membros?: unknown[] }).membros ?? [];
  const temAcessoCompleto = ehMinhaLiga || role === "staff" || role === "professor";
  const abasVisiveis = temAcessoCompleto ? ABAS_COMPLETAS : ABAS_RESTRITAS;
  const abaAtualVisivel = abasVisiveis.some((a) => a.id === abaAtiva)
    ? abaAtiva
    : abasVisiveis[0]!.id;

  const segments = splitLigaTitle(ligaExibida.nome);
  const diretoresNomes =
    ligaExibida.diretores && ligaExibida.diretores.length > 0
      ? ligaExibida.diretores.map((d) => primeiroUltimoNome(d.nome)).join(", ")
      : "—";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header editorial */}
      <div className="flex-shrink-0">
        <div className="max-w-5xl mx-auto px-8 pt-8 pb-6">
          <button
            onClick={() => navigate("/ligas")}
            className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/50 hover:text-navy transition-colors"
          >
            ← Ligas
          </button>

          <h1 className="font-display font-bold text-[32px] tracking-[-0.035em] leading-[0.95] text-navy mt-4">
            {segments.map((seg, i) => (
              <span
                key={i}
                className={[seg.em ? "italic" : "", seg.lowercase ? "lowercase" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {seg.text}
                {i < segments.length - 1 ? " " : ""}
              </span>
            ))}
          </h1>

          <p className="font-plex-mono text-[11px] tracking-[0.14em] text-navy/60 mt-2">
            {diretoresNomes !== "—" ? `Diretor — ${diretoresNomes}` : "Sem diretor"} ·{" "}
            {membros.length} membros
          </p>

          <div className="flex items-center gap-4 mt-3">
            {ehMinhaLiga && (
              <span className="font-plex-mono text-[9px] uppercase tracking-[0.2em] text-navy border border-navy px-2 py-1">
                Minha Liga
              </span>
            )}
            {podeEditarImagem && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadandoImagem}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy/50 hover:text-navy transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  {uploadandoImagem ? (
                    <div className="h-3 w-3 border border-navy border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
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
          </div>
        </div>

        {/* Abas */}
        <div className="max-w-5xl mx-auto px-8 flex overflow-x-auto">
          {abasVisiveis.map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={
                abaAtualVisivel === aba.id
                  ? "px-4 py-3 font-plex-mono text-[11px] tracking-[0.18em] uppercase text-navy border-b-2 border-navy whitespace-nowrap"
                  : "px-4 py-3 font-plex-mono text-[11px] tracking-[0.18em] uppercase text-navy/40 hover:text-navy/70 whitespace-nowrap border-b-2 border-transparent transition-colors"
              }
            >
              {aba.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 pb-10 space-y-12">
          {abaAtualVisivel === "visao-geral" && <VisaoGeralTab ligaId={ligaExibida.id} />}
          {abaAtualVisivel === "membros" && <MembrosTab ligaId={ligaExibida.id} />}
          {abaAtualVisivel === "presenca" && temAcessoCompleto && (
            <PresencaTab ligaId={ligaExibida.id} />
          )}
          {abaAtualVisivel === "projetos" && temAcessoCompleto && (
            <ProjetosTab ligaId={ligaExibida.id} />
          )}
          {abaAtualVisivel === "recursos" && temAcessoCompleto && (
            <RecursosTab ligaId={ligaExibida.id} />
          )}
        </div>
      </div>
    </div>
  );
}
