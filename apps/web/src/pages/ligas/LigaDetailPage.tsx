import { ArrowLeft, Camera, Users } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { supabase } from "@/lib/supabase";

import { LigaMembrosAvatars, type MembroAvatar } from "./components/LigaMembrosAvatars";
import { CrmTab } from "./tabs/CrmTab";
import { MembrosTab } from "./tabs/MembrosTab";
import { PresencaTab } from "./tabs/PresencaTab";
import { ProjetosTab } from "./tabs/ProjetosTab";
import { RecursosTab } from "./tabs/RecursosTab";
import { VisaoGeralTab } from "./tabs/VisaoGeralTab";

import type { Liga } from "@link-leagues/types";

type AbaId = "visao-geral" | "membros" | "presenca" | "projetos" | "recursos" | "crm";

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
  { id: "crm", label: "Contatos" },
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
  const { data: membrosLista } = useCachedFetch<MembroAvatar[]>(
    id ? `/api/ligas/${id}/membros` : null,
  );
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
  const podeEditarCrm = role === "staff" || (role === "diretor" && minhaLigaId === ligaExibida?.id);

  if (carregando) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <p className="text-sm text-foreground/50">Carregando...</p>
      </div>
    );
  }
  if (!ligaExibida) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <p className="text-sm text-foreground/50">Liga não encontrada.</p>
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

  const diretoresNomes =
    ligaExibida.diretores && ligaExibida.diretores.length > 0
      ? ligaExibida.diretores.map((d) => primeiroUltimoNome(d.nome)).join(", ")
      : "";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="mx-auto max-w-5xl px-8 pb-6 pt-8">
          <button
            onClick={() => navigate("/ligas")}
            className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Ligas
          </button>

          {/* Banner de capa */}
          <div className="relative mt-4 h-48 w-full overflow-hidden rounded-2xl border border-border bg-muted">
            {ligaExibida.imagem_url ? (
              <img
                src={ligaExibida.imagem_url}
                alt={ligaExibida.nome}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Users className="size-10 text-foreground/15" />
              </div>
            )}

            {podeEditarImagem && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadandoImagem}
                  className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/70 backdrop-blur transition-colors hover:text-foreground disabled:opacity-40"
                >
                  {uploadandoImagem ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-foreground border-t-transparent" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  {uploadandoImagem ? "Enviando..." : "Trocar foto"}
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

          {/* Título + meta + avatares dos membros */}
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {ligaExibida.nome}
                </h1>
                {ehMinhaLiga && (
                  <span className="rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-brand-yellow">
                    Minha liga
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-foreground/50">
                {diretoresNomes ? `Diretores · ${diretoresNomes}` : "Sem diretor"} ·{" "}
                {membros.length} {membros.length === 1 ? "membro" : "membros"}
              </p>
            </div>
            <LigaMembrosAvatars membros={membrosLista ?? []} />
          </div>
        </div>

        {/* Abas */}
        <div className="mx-auto max-w-5xl overflow-x-auto px-8">
          <AnimatedTabs
            tabs={abasVisiveis}
            activeTab={abaAtualVisivel}
            onChange={(id) => setAbaAtiva(id as typeof abaAtiva)}
            tabClassName="px-0 py-3"
            innerClassName="gap-6"
            wrapperClassName="border-border"
            activeTabClassName="text-foreground"
            inactiveTabClassName="text-foreground/40 hover:text-foreground"
            indicatorClassName="bg-foreground"
          />
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-12 px-8 pb-10 pt-6">
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
          {abaAtualVisivel === "crm" && temAcessoCompleto && (
            <CrmTab ligaId={ligaExibida.id} podeEditar={podeEditarCrm} />
          )}
        </div>
      </div>
    </div>
  );
}
