import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, AlertTriangle, Trophy, TrendingUp, CheckCircle2, Medal, Users, FolderKanban, Activity, CalendarX, Clock, UserCheck, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

// ─── mock lider ───────────────────────────────────────────────────────────────

const METRICAS_MINHA_LIGA = [
  { label: "Projetos ativos", valor: "3", cor: "text-blue-600" },
  { label: "Receita", valor: "R$ 2.000", cor: "text-green-600" },
  { label: "Membros", valor: "24", cor: "text-navy" },
  { label: "Score", valor: "840 pts", cor: "text-purple-600" },
];

const METRICAS_GLOBAL = [
  { label: "Projetos ativos", valor: "12", cor: "text-blue-600" },
  { label: "Receita total", valor: "R$ 8.700", cor: "text-green-600" },
  { label: "Membros", valor: "94", cor: "text-navy" },
  { label: "Score médio", valor: "663 pts", cor: "text-purple-600" },
];

const ALERTAS_MOCK = [
  { id: "a1", projeto: "App de presenças", motivo: "recusado pelo professor" },
  { id: "a2", projeto: "Dashboard financeiro", motivo: "aguardando Staff há 3 dias" },
];

const SALA_MOCK = { sala: "Sala 204", data: "Sex 18/04", horario: "19h" };

const RANKING_MOCK = [
  { id: "r1", nome: "Liga Tech", score: 840, minhaLiga: true },
  { id: "r2", nome: "Link Finance", score: 710, minhaLiga: false },
  { id: "r3", nome: "Marketing", score: 620, minhaLiga: false },
  { id: "r4", nome: "RH", score: 480, minhaLiga: false },
];

// ─── mock professor ───────────────────────────────────────────────────────────

const FILA_PROFESSOR = [
  { id: "f1", nome: "App de presenças", diasAguardando: 9 },
  { id: "f2", nome: "API de integração", diasAguardando: 2 },
  { id: "f3", nome: "Sistema de feedback", diasAguardando: 1 },
];

const EVENTOS_PROFESSOR = [
  { id: "e1", nome: "Reunião semanal", data: "Sex 18/04", hora: "19h" },
  { id: "e2", nome: "Workshop de produto", data: "Ter 22/04", hora: "18h" },
];

const METRICAS_PROFESSOR = [
  { label: "Score", valor: "840 pts", cor: "text-purple-600" },
  { label: "Projetos ativos", valor: "5", cor: "text-navy" },
  { label: "Membros", valor: "24", cor: "text-navy" },
  { label: "Frequência", valor: "87%", cor: "text-navy" },
];

// ─── mock membro ──────────────────────────────────────────────────────────────

const METRICAS_MEMBRO = [
  { label: "Meu score", valor: "72 pts", cor: "text-navy" },
  { label: "Minha frequência", valor: "87%", cor: "text-navy" },
  { label: "Projetos que participo", valor: "2", cor: "text-navy" },
  { label: "Próxima reunião", valor: "Sex 18/04", sub: "às 19h", cor: "text-navy" },
];

const RANKING_MEMBRO = [
  { id: "r1", nome: "Liga Tech", score: 840, minhaLiga: true },
  { id: "r2", nome: "Link Finance", score: 710, minhaLiga: false },
  { id: "r3", nome: "Marketing", score: 620, minhaLiga: false },
  { id: "r4", nome: "RH", score: 480, minhaLiga: false },
];

// ─── mock staff ───────────────────────────────────────────────────────────────

const METRICAS_STAFF = [
  { label: "Ligas ativas", valor: "4", cor: "text-navy", Icon: Users },
  { label: "Membros", valor: "96", cor: "text-navy", Icon: UserCheck },
  { label: "Projetos ativos", valor: "8", cor: "text-navy", Icon: FolderKanban },
  { label: "Engajamento geral", valor: "78%", cor: "text-navy", Icon: Activity },
];

const METRICAS_ENGAJAMENTO_STAFF = [
  { label: "Média de presença", valor: "71%", cor: "text-blue-600" },
  { label: "Reuniões no mês", valor: "14", cor: "text-navy" },
  { label: "Eventos ativos", valor: "3", cor: "text-purple-600" },
  { label: "Receita total", valor: "R$ 8.700", cor: "text-green-600" },
];

// ordenados por urgência: menor engajamento primeiro
const ALERTAS_STAFF = [
  { id: "s1", titulo: "Liga RH", descricao: "Engajamento em 32% — abaixo do mínimo", rota: "/gerenciamento", Icon: Activity },
  { id: "s3", titulo: "Liga Marketing", descricao: "Sem reunião registrada há 2 semanas", rota: "/gerenciamento", Icon: CalendarX },
];

const RANKING_PRESENCA_STAFF = [
  { id: "p1", nome: "Liga Tech", presenca: 94 },
  { id: "p2", nome: "Link Finance", presenca: 87 },
  { id: "p3", nome: "Marketing", presenca: 72 },
  { id: "p4", nome: "RH", presenca: 32 },
];

// ─── destaques ────────────────────────────────────────────────────────────────

// Dados fictícios — substituir quando a feature de destaques for implementada
const DESTAQUES_MOCK = [
  { id: "1", Icon: TrendingUp, label: "SCORE", titulo: "Liga de Marketing", sub: "+12pts essa semana" },
  { id: "2", Icon: CheckCircle2, label: "PROJETO", titulo: "Análise de Mercado", sub: "Concluído ontem" },
  { id: "3", Icon: Medal, label: "RANKING", titulo: "#1 Liga de Finanças", sub: "Lidera a temporada" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [minhaLiga, setMinhaLiga] = useState<Liga | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [role, setRole] = useState<string | null>(null);
  const [visao, setVisao] = useState<"minha" | "global">("minha");
  const [pendentes, setPendentes] = useState<{ projetos: { id: string; titulo: string; liga?: { nome: string } }[]; eventos: { id: string; titulo: string; liga?: { nome: string } }[] }>({ projetos: [], eventos: [] });

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user.email ?? "";

      // busca nome e role da tabela de usuários
      if (email) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("nome, role")
          .eq("email", email)
          .single();
        if (usuario?.nome) setNomeUsuario(usuario.nome as string);
        else setNomeUsuario(email.split("@")[0] ?? "Usuário");
        if (usuario?.role) setRole(usuario.role as string);

        // Carregar pendentes para staff
        if (usuario?.role === "staff") {
          const pendentesRes = await fetch("/api/pendentes", { headers });
          if (pendentesRes.ok) setPendentes(await pendentesRes.json());
        }
      }

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
        <h1 className="font-display font-bold text-2xl text-navy">Olá, {nomeUsuario}</h1>
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
                  Diretor: {ligaAtual.diretores && ligaAtual.diretores.length > 0
                    ? ligaAtual.diretores.map(d => d.nome).join(", ")
                    : "—"}
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
                  Diretor: {minhaLiga.diretores && minhaLiga.diretores.length > 0
                    ? minhaLiga.diretores.map(d => d.nome).join(", ")
                    : "—"}
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

      {/* Zona 3 — Destaques da semana (fictícios) — oculto para professor */}
      {role === "staff" && <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
          Destaques da Semana
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DESTAQUES_MOCK.map((d) => (
            <div key={d.id} className="bg-white border border-brand-gray rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {d.label}
              </div>
              <div className="font-bold text-navy text-sm">{d.titulo}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d.sub}</div>
            </div>
          ))}
        </div>
      </div>}

      {/* ── Seções exclusivas do perfil Líder ── */}
      {role === "diretor" && (
        <>
          {/* Toggle Minha liga / Visão global */}
          <div>
            <div className="inline-flex rounded-lg border border-brand-gray bg-white p-1 mb-4">
              <button
                onClick={() => setVisao("minha")}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  visao === "minha"
                    ? "bg-navy text-white"
                    : "text-muted-foreground hover:text-navy"
                )}
              >
                Minha liga
              </button>
              <button
                onClick={() => setVisao("global")}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  visao === "global"
                    ? "bg-navy text-white"
                    : "text-muted-foreground hover:text-navy"
                )}
              >
                Visão global
              </button>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-3">
              {(visao === "minha" ? METRICAS_MINHA_LIGA : METRICAS_GLOBAL).map((m) => (
                <div key={m.label} className="bg-white border border-brand-gray rounded-xl p-4">
                  <p className={cn("font-display font-bold text-2xl", m.cor)}>{m.valor}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas — só em "Minha liga" e se houver itens */}
          {visao === "minha" && ALERTAS_MOCK.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
                  Ação Necessária
                </p>
                <button
                  onClick={() => navigate("/projetos")}
                  className="text-xs text-purple-600 font-semibold hover:underline"
                >
                  Ver todos
                </button>
              </div>
              <div className="space-y-2">
                {ALERTAS_MOCK.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate("/projetos")}
                    className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-navy">{a.projeto}</p>
                      <p className="text-xs text-amber-700 mt-0.5 first-letter:uppercase">{a.motivo}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Próxima sala reservada */}
          {visao === "minha" && SALA_MOCK && (
            <div>
              <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
                Próxima Sala Reservada
              </p>
              <div className="bg-white border border-brand-gray rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg border border-brand-gray flex items-center justify-center font-bold text-sm text-purple-600 bg-white shrink-0">
                  {SALA_MOCK.sala.replace("Sala ", "")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{SALA_MOCK.sala}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {SALA_MOCK.data} às {SALA_MOCK.horario}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ranking geral — fixo em ambas as visões */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
              Ranking Geral
            </p>
            <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
              {RANKING_MOCK.map((r, i) => {
                const pct = Math.round((r.score / 1000) * 100);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i < RANKING_MOCK.length - 1 && "border-b border-brand-gray",
                      r.minhaLiga && "bg-navy/5"
                    )}
                  >
                    <span className={cn("text-xs font-bold w-5 text-center shrink-0", r.minhaLiga ? "text-navy" : "text-muted-foreground")}>
                      {i + 1}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-sm font-semibold truncate", r.minhaLiga ? "text-navy" : "text-gray-700")}>
                          {r.nome}
                          {r.minhaLiga && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold bg-navy text-white px-1.5 py-0.5 rounded-full align-middle">
                              <Trophy className="h-2.5 w-2.5" />
                              minha
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-bold text-purple-600 ml-3 shrink-0">
                          {r.score} pts
                        </span>
                      </div>
                      <div className="w-full bg-brand-gray rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: r.minhaLiga
                              ? "linear-gradient(90deg, #10284E, #546484)"
                              : "#CBCBCB",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Seções exclusivas do perfil Staff ── */}
      {role === "staff" && (
        <>
          {/* Métricas globais */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
              Métricas Globais
            </p>
            <div className="grid grid-cols-2 gap-3">
              {METRICAS_STAFF.map((m) => (
                <div key={m.label} className="bg-white border border-brand-gray rounded-xl p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 border border-brand-gray flex items-center justify-center shrink-0">
                    <m.Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className={cn("font-display font-bold text-2xl leading-none", m.cor)}>{m.valor}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas de atenção */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
                Alertas de Atenção
              </p>
              <button
                onClick={() => navigate("/super-admin")}
                className="text-xs text-purple-600 font-semibold hover:underline"
              >
                Ver todos
              </button>
            </div>
            <div className="space-y-2">
              {/* Alertas de engajamento (mock) */}
              {ALERTAS_STAFF.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(a.rota)}
                  className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-navy">{a.titulo}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{a.descricao}</p>
                  </div>
                </button>
              ))}

              {/* Projetos aguardando aprovação */}
              {pendentes.projetos.length > 0 && (
                <button
                  onClick={() => navigate("/super-admin")}
                  className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors"
                >
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {pendentes.projetos.length} projeto{pendentes.projetos.length > 1 ? "s" : ""} aguardando aprovação
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">Clique para revisar e aprovar</p>
                  </div>
                </button>
              )}

              {/* Eventos aguardando aprovação */}
              {pendentes.eventos.length > 0 && (
                <button
                  onClick={() => navigate("/super-admin")}
                  className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors"
                >
                  <CalendarX className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {pendentes.eventos.length} evento{pendentes.eventos.length > 1 ? "s" : ""} aguardando aprovação
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">Clique para revisar e aprovar</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Ranking de presença */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
              Ranking de Presença
            </p>
            <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
              {RANKING_PRESENCA_STAFF.map((r, i) => {
                const baixa = r.presenca < 50;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i < RANKING_PRESENCA_STAFF.length - 1 && "border-b border-brand-gray",
                      baixa && "bg-red-50"
                    )}
                  >
                    <span className={cn("text-xs font-bold w-5 text-center shrink-0", baixa ? "text-red-500" : "text-muted-foreground")}>
                      {i + 1}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-sm font-semibold", baixa ? "text-red-600" : "text-gray-700")}>
                          {r.nome}
                          {baixa && (
                            <span className="ml-2 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full align-middle">
                              baixa
                            </span>
                          )}
                        </span>
                        <span className={cn("text-xs font-bold ml-3 shrink-0", baixa ? "text-red-600" : "text-navy")}>
                          {r.presenca}%
                        </span>
                      </div>
                      <div className="w-full bg-brand-gray rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${r.presenca}%`,
                            background: baixa ? "#ef4444" : "linear-gradient(90deg, #10284E, #546484)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Métricas de engajamento global */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
              Engajamento Global
            </p>
            <div className="grid grid-cols-2 gap-3">
              {METRICAS_ENGAJAMENTO_STAFF.map((m) => (
                <div key={m.label} className="bg-white border border-brand-gray rounded-xl p-4">
                  <p className={cn("font-display font-bold text-2xl", m.cor)}>{m.valor}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Seções exclusivas do perfil Professor ── */}
      {role === "professor" && (
        <>
          {/* Fila de aprovação */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
                Fila de Aprovação
              </p>
              <button
                onClick={() => navigate("/projetos")}
                className="text-xs text-purple-600 font-semibold hover:underline"
              >
                Ver todos
              </button>
            </div>
            <div className="bg-white border border-brand-gray rounded-xl divide-y divide-brand-gray">
              {FILA_PROFESSOR.map((p) => {
                const urgente = p.diasAguardando > 7;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate("/projetos")}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold text-navy truncate">{p.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-muted-foreground">
                        há {p.diasAguardando} dia{p.diasAguardando > 1 ? "s" : ""}
                      </span>
                      <span className={urgente
                        ? "text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full"
                        : "text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"
                      }>
                        {urgente ? "Urgente" : "Aguardando"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Próximos eventos */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
              Próximos Eventos da Liga
            </p>
            <div className="bg-white border border-brand-gray rounded-xl divide-y divide-brand-gray">
              {EVENTOS_PROFESSOR.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">{e.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{e.data} às {e.hora}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Métricas da liga */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
              Métricas da Liga
            </p>
            <div className="grid grid-cols-2 gap-3">
              {METRICAS_PROFESSOR.map((m) => (
                <div key={m.label} className="bg-white border border-brand-gray rounded-xl p-4">
                  <p className={cn("font-display font-bold text-2xl", m.cor)}>{m.valor}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Seções exclusivas do perfil Membro ── */}
      {role === "membro" && (
        <>
          {/* Minha liga — metric cards */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
              Meu Desempenho
            </p>
            <div className="grid grid-cols-2 gap-3">
              {METRICAS_MEMBRO.map((m) => (
                <div key={m.label} className="bg-white border border-brand-gray rounded-xl p-4">
                  <p className={cn("font-display font-bold text-2xl leading-none", m.cor)}>{m.valor}</p>
                  {"sub" in m && m.sub && (
                    <p className={cn("text-sm font-semibold mt-0.5", m.cor)}>{m.sub}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking geral */}
          <div>
            <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
              Ranking Geral
            </p>
            <div className="bg-white border border-brand-gray rounded-xl overflow-hidden">
              {RANKING_MEMBRO.map((r, i) => {
                const pct = Math.round((r.score / 1000) * 100);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i < RANKING_MEMBRO.length - 1 && "border-b border-brand-gray",
                      r.minhaLiga && "bg-navy/5"
                    )}
                  >
                    <span className={cn("text-xs font-bold w-5 text-center shrink-0", r.minhaLiga ? "text-navy" : "text-muted-foreground")}>
                      {i + 1}º
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-sm font-semibold truncate", r.minhaLiga ? "text-navy" : "text-gray-700")}>
                          {r.nome}
                          {r.minhaLiga && (
                            <span className="ml-2 text-[10px] font-bold bg-navy text-white px-1.5 py-0.5 rounded-full align-middle">
                              minha
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-bold text-purple-600 ml-3 shrink-0">
                          {r.score} pts
                        </span>
                      </div>
                      <div className="w-full bg-brand-gray rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: r.minhaLiga
                              ? "linear-gradient(90deg, #10284E, #546484)"
                              : "#CBCBCB",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
