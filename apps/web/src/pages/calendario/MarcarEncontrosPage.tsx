import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import type { Liga, Sala } from "@link-leagues/types";

interface MarcarForm {
  nome_solicitante: string;
  liga_id: string;
  categoria: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  sala: string;
  descricao: string;
}

interface EventoMarcado {
  titulo: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  liga_id: string;
  descricao: string;
}

interface Membro {
  id: string;
  nome: string;
  email: string;
  role?: string;
}

function formVazio(): MarcarForm {
  return {
    nome_solicitante: "",
    liga_id: "",
    categoria: "",
    data: "",
    hora_inicio: "",
    hora_fim: "",
    sala: "",
    descricao: "",
  };
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function buildGCalUrl(evento: EventoMarcado, membros: Membro[], selecionados: Set<string>): string {
  const dateStr = evento.data.replace(/-/g, "");
  const startTime = evento.hora_inicio.replace(":", "") + "00";
  const endTime = evento.hora_fim ? evento.hora_fim.replace(":", "") + "00" : startTime;
  const dates = `${dateStr}T${startTime}/${dateStr}T${endTime}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates,
  });
  if (evento.descricao) params.set("details", evento.descricao);

  let url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  for (const m of membros.filter((m) => selecionados.has(m.id))) {
    url += `&add=${encodeURIComponent(m.email)}`;
  }
  return url;
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const fieldCls =
  "w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded";
const labelCls = "font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40";

const SALAS_FIXAS = ["5_01", "6_03", "6_04", "Externo", "Online"];

export function MarcarEncontrosPage() {
  const navigate = useNavigate();
  const { role, usuarioId } = useUser();
  const [form, setForm] = useState<MarcarForm>(formVazio);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const [eventoMarcado, setEventoMarcado] = useState<EventoMarcado | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [membrosSelecionados, setMembrosSelecionados] = useState<Set<string>>(new Set());
  const [carregandoMembros, setCarregandoMembros] = useState(false);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [resMe, resLigas, resSalas] = await Promise.all([
        fetch("/api/usuarios/me", { headers }),
        fetch("/api/ligas", { headers }),
        fetch("/api/salas", { headers }),
      ]);
      if (resMe.ok) {
        const me = (await resMe.json()) as { nome?: string };
        setForm((prev) => ({ ...prev, nome_solicitante: me.nome ?? "" }));
      }
      if (resLigas.ok) setLigas((await resLigas.json()) as Liga[]);
      if (resSalas.ok) setSalas((await resSalas.json()) as Sala[]);
    }
    void carregar();
  }, []);

  const ligasDisponiveis =
    role === "diretor" && usuarioId
      ? ligas.filter((l) => l.diretores?.some((d) => d.id === usuarioId))
      : ligas;

  function getSalaId(salaNome: string): string | undefined {
    return salas.find((s) => s.nome === salaNome)?.id;
  }

  function toggleMembro(id: string) {
    setMembrosSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (membrosSelecionados.size === membros.length) {
      setMembrosSelecionados(new Set());
    } else {
      setMembrosSelecionados(new Set(membros.map((m) => m.id)));
    }
  }

  async function handleSalvar() {
    if (!form.liga_id || !form.categoria || !form.data || !form.hora_inicio) {
      setErro("Preencha comunidade, categoria, data e hora de início.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const token = await getToken();

      const ligaNome = ligas.find((l) => l.id === form.liga_id)?.nome ?? "";
      const titulo = `${form.categoria.charAt(0).toUpperCase() + form.categoria.slice(1)} — ${ligaNome}`;

      const salaId = form.sala ? getSalaId(form.sala) : undefined;
      const salaNaDescricao = form.sala && !salaId ? `Sala: ${form.sala}` : "";
      const descricaoFinal = [form.descricao, salaNaDescricao].filter(Boolean).join("\n");

      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: form.liga_id,
          titulo,
          descricao: descricaoFinal || undefined,
          categoria: form.categoria,
          data: form.data,
          sala_id: salaId,
          hora_inicio: form.hora_inicio,
          hora_fim: form.hora_fim || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Erro ao marcar encontro.");
      }

      setEventoMarcado({
        titulo,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        liga_id: form.liga_id,
        descricao: descricaoFinal,
      });
      setSucesso(true);

      // Busca membros para o convite do Google Calendar
      setCarregandoMembros(true);
      try {
        const resMembros = await fetch(`/api/ligas/${form.liga_id}/membros`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resMembros.ok) {
          const ms = (await resMembros.json()) as Membro[];
          setMembros(ms);
          setMembrosSelecionados(new Set(ms.map((m) => m.id)));
        }
      } finally {
        setCarregandoMembros(false);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  }

  if (sucesso && eventoMarcado) {
    const todosSelecionados = membros.length > 0 && membrosSelecionados.size === membros.length;

    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
          Eventos · Link School of Business
        </p>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] mt-1 mb-1">
          Encontro marcado!
        </h1>
        <p className="font-plex-sans text-[13px] text-foreground/60 mb-8">
          O encontro foi adicionado ao calendário.
        </p>

        {/* Google Calendar */}
        <div className="border border-border rounded-lg p-5 mb-6">
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-3">
            Adicionar ao Google Calendar
          </p>

          {carregandoMembros ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted/60 rounded animate-pulse" />
              ))}
            </div>
          ) : membros.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="font-plex-sans text-[13px] text-foreground/70">
                  Selecione os membros para convidar
                </p>
                <button
                  onClick={toggleTodos}
                  className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-foreground/50 hover:text-foreground transition-colors"
                >
                  {todosSelecionados ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>

              <div className="space-y-1 max-h-52 overflow-y-auto pr-1 mb-4">
                {membros.map((m) => {
                  const selecionado = membrosSelecionados.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMembro(m.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                        selecionado
                          ? "bg-navy/8 border border-navy/20"
                          : "border border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded shrink-0 border flex items-center justify-center transition-colors ${
                          selecionado ? "bg-navy border-navy" : "border-border"
                        }`}
                      >
                        {selecionado && (
                          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M2 5l2.5 2.5L8 3"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="h-7 w-7 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-navy">{iniciais(m.nome)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-plex-sans text-[13px] text-foreground truncate">
                          {m.nome}
                        </p>
                        <p className="font-plex-sans text-[11px] text-foreground/40 truncate">
                          {m.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="font-plex-sans text-[13px] text-foreground/40 mb-4">
              Nenhum membro encontrado para convidar.
            </p>
          )}

          <button
            onClick={() =>
              window.open(buildGCalUrl(eventoMarcado, membros, membrosSelecionados), "_blank")
            }
            className="w-full py-2.5 border border-foreground/30 rounded-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/70 hover:border-foreground/60 hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 2v4M16 2v4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {membrosSelecionados.size > 0
              ? `Abrir no Google Calendar (${membrosSelecionados.size} convidado${membrosSelecionados.size !== 1 ? "s" : ""})`
              : "Abrir no Google Calendar"}
          </button>
        </div>

        <button
          onClick={() => navigate("/calendario")}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase border border-foreground/40 px-4 py-2 rounded-full"
        >
          Ver Calendário
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-10">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
          Eventos · Link School of Business
        </p>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] mt-1">
          Marcar encontro
        </h1>
      </div>

      <div className="space-y-6">
        {/* Nome completo */}
        <div>
          <p className={labelCls}>Nome completo</p>
          <input
            className={`${fieldCls} mt-1`}
            value={form.nome_solicitante}
            onChange={(e) => setForm({ ...form, nome_solicitante: e.target.value })}
            placeholder="Seu nome"
          />
        </div>

        {/* Comunidade responsável */}
        <div>
          <p className={labelCls}>Comunidade responsável *</p>
          <div className="mt-1">
            <Select value={form.liga_id} onValueChange={(v) => setForm({ ...form, liga_id: v })}>
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder="Selecione a comunidade" />
              </SelectTrigger>
              <SelectContent>
                {ligasDisponiveis.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <p className={labelCls}>Categoria *</p>
          <div className="mt-1">
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm({ ...form, categoria: v })}
            >
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aula">Aula</SelectItem>
                <SelectItem value="cowork">Cowork</SelectItem>
                <SelectItem value="encontro">Encontro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data e horário */}
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
          <div>
            <p className={labelCls}>Data do encontro *</p>
            <input
              type="date"
              className={`${fieldCls} mt-1`}
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </div>
          <div>
            <p className={labelCls}>Hora de início *</p>
            <input
              type="time"
              className={`${fieldCls} mt-1`}
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
            />
          </div>
          <div>
            <p className={labelCls}>Hora de fim</p>
            <input
              type="time"
              className={`${fieldCls} mt-1`}
              value={form.hora_fim}
              onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
            />
          </div>
        </div>

        {/* Sala */}
        <div>
          <p className={labelCls}>Sala</p>
          <div className="mt-1">
            <Select value={form.sala} onValueChange={(v) => setForm({ ...form, sala: v })}>
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder="Selecione a sala (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {SALAS_FIXAS.map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <p className={labelCls}>Descrição (opcional)</p>
          <textarea
            className={`${fieldCls} mt-1 min-h-[80px] resize-none`}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Informações adicionais sobre o encontro"
          />
        </div>

        {erro && <p className="font-plex-mono text-[11px] text-red-500">{erro}</p>}

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full py-3 bg-[#10244D] text-white rounded-full font-plex-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Marcar encontro"}
        </button>
        <button
          onClick={() => navigate("/calendario")}
          className="w-full py-3 border border-foreground/20 rounded-full font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
