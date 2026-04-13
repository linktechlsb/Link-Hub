import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

// Dados fictícios — substituir quando a feature de destaques for implementada
const DESTAQUES_MOCK = [
  { id: "1", icon: "↑", label: "SCORE", titulo: "Liga de Marketing", sub: "+12pts essa semana" },
  { id: "2", icon: "✅", label: "PROJETO", titulo: "Análise de Mercado", sub: "Concluído ontem" },
  { id: "3", icon: "🏆", label: "RANKING", titulo: "#1 Liga de Finanças", sub: "Lidera a temporada" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const { data: sessionData } = await supabase.auth.getSession();
      const meta = sessionData.session?.user.user_metadata;
      const email = sessionData.session?.user.email ?? "";
      setNomeUsuario(
        (meta?.full_name as string | undefined) ?? email.split("@")[0] ?? "Usuário"
      );

      const [ligasRes, minhaRes] = await Promise.all([
        fetch("/api/ligas", { headers }),
        fetch("/api/ligas/minha", { headers }),
      ]);

      if (ligasRes.ok) setLigas(await ligasRes.json());
      if (minhaRes.ok) setMinhaLiga(await minhaRes.json());
    }
    carregar();
  }, []);

  // Auto-avanço do carrossel a cada 1,5 segundos
  useEffect(() => {
    if (ligas.length === 0) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 1500);
    return () => clearInterval(timerRef.current);
  }, [ligas.length]);

  function irPara(index: number) {
    clearInterval(timerRef.current);
    setCurrentIndex((index + ligas.length) % ligas.length);
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % ligas.length);
    }, 1500);
  }

  const ligaAtual = ligas[currentIndex];

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="font-display font-bold text-2xl text-navy">Olá, {nomeUsuario} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Explore as ligas da plataforma</p>
      </div>

      {/* Zona 1 — Carrossel de ligas */}
      {ligas.length > 0 && ligaAtual && (
        <div className="rounded-xl overflow-hidden border border-brand-gray">
          {/* Slide */}
          <div
            className="relative h-48 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #10284E 0%, #546484 100%)" }}
            onClick={() => navigate(`/ligas/${ligaAtual.id}`)}
          >
            {ligaAtual.imagem_url && (
              <img
                src={ligaAtual.imagem_url}
                alt={ligaAtual.nome}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />

            {/* Seta esquerda */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                irPara(currentIndex - 1);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/35 rounded-full p-1.5 text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Seta direita */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                irPara(currentIndex + 1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/35 rounded-full p-1.5 text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Conteúdo do card */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
              <div>
                <h2 className="font-display font-bold text-white text-lg leading-tight">
                  {ligaAtual.nome}
                </h2>
                <p className="text-white/70 text-xs mt-0.5">
                  Líder: {ligaAtual.lider_email ?? "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
                  <div className="text-brand-yellow font-bold text-sm">78</div>
                  <div className="text-white/70 text-xs">Score</div>
                </div>
                <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
                  <div className="text-brand-yellow font-bold text-sm">
                    {ligaAtual.projetos_ativos ?? 0}
                  </div>
                  <div className="text-white/70 text-xs">Projetos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 py-2.5 bg-white">
            {ligas.map((_, i) => (
              <button
                key={i}
                onClick={() => irPara(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIndex ? "w-4 bg-navy" : "w-1.5 bg-brand-gray"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Zona 2 — Minha Liga */}
      {minhaLiga && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
            Minha Liga
          </p>
          <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: "linear-gradient(90deg, #10284E, #546484)" }}
            >
              <div>
                <h3 className="font-bold text-white text-sm">{minhaLiga.nome}</h3>
                <p className="text-white/70 text-xs mt-0.5">
                  Líder: {minhaLiga.lider_email ?? "—"}
                </p>
              </div>
              <button
                onClick={() => navigate(`/ligas/${minhaLiga.id}`)}
                className="bg-brand-yellow text-navy text-xs font-bold px-3 py-1.5 rounded-md"
              >
                Ver detalhes →
              </button>
            </div>
            <div className="grid grid-cols-4 divide-x divide-brand-gray">
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-amber-500 text-lg">78</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Score
                </div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-navy text-lg">
                  {minhaLiga.projetos_ativos ?? 0}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Projetos
                </div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-green-600 text-lg">—</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Presença
                </div>
              </div>
              <div className="px-3 py-3 text-center">
                <div className="font-bold text-navy text-lg">—</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  Próx. Evento
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zona 3 — Destaques da semana (fictícios) */}
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
          Destaques da Semana
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DESTAQUES_MOCK.map((d) => (
            <div key={d.id} className="bg-white border border-brand-gray rounded-lg p-3">
              <div className="text-amber-500 text-xs font-bold mb-1">
                {d.icon} {d.label}
              </div>
              <div className="font-bold text-navy text-sm">{d.titulo}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
