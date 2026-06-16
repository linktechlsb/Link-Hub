import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MultiSelectLigas } from "@/components/ui/multi-select-ligas";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import type { Liga } from "@link-leagues/types";

interface SolicitarForm {
  nome_solicitante: string;
  liga_id: string;
  tipo_evento: string;
  participantes_info: string;
  tema: string;
  descricao_tema: string;
  nome_palestrante: string;
  linkedin_palestrante: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  veiculo_info: string;
  observacoes: string;
  local: string;
  mudanca_layout: string;
  coffee_break: string;
  cenografia: string;
  apoio_infraestrutura: string;
  criacao_mkt: string;
  audio_visual: string;
}

function formVazio(): SolicitarForm {
  return {
    nome_solicitante: "",
    liga_id: "",
    tipo_evento: "",
    participantes_info: "",
    tema: "",
    descricao_tema: "",
    nome_palestrante: "",
    linkedin_palestrante: "",
    data: "",
    hora_inicio: "",
    hora_fim: "",
    veiculo_info: "",
    observacoes: "",
    local: "",
    mudanca_layout: "",
    coffee_break: "",
    cenografia: "",
    apoio_infraestrutura: "",
    criacao_mkt: "",
    audio_visual: "",
  };
}

const GRUPOS_LOCAL: { grupo: string; salas: string[] }[] = [
  {
    grupo: "Primeiro andar",
    salas: ["1.01 – 50 pessoas", "1.02 – 50 pessoas", "1.03 – 50 pessoas", "1.04 – 50 pessoas"],
  },
  {
    grupo: "Terceiro andar",
    salas: [
      "3.01 – 64 pessoas",
      "3.02 – 56 pessoas",
      "3.03 – 58 pessoas",
      "3.04 – 50 pessoas",
      "3.05 – 63 pessoas",
    ],
  },
  {
    grupo: "Quarto andar",
    salas: [
      "4.01 – 55 pessoas",
      "4.02 – 50 pessoas",
      "4.03 – 58 pessoas",
      "4.04 – 50 pessoas",
      "4.05 – 55 pessoas",
    ],
  },
  {
    grupo: "Quinto andar",
    salas: [
      "5.01 – 55 pessoas",
      "5.02 – 48 pessoas",
      "5.03 – 58 pessoas",
      "5.04 – 50 pessoas",
      "5.05 – 56 pessoas",
    ],
  },
  {
    grupo: "Sexto andar",
    salas: ["6.01 – 60 pessoas"],
  },
  {
    grupo: "Rooftop",
    salas: ["Courage Space – 50 pessoas"],
  },
  {
    grupo: "Externo",
    salas: ["Externo"],
  },
];

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const fieldCls =
  "w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded";
const labelCls = "font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40";

export function SolicitarEventosPage() {
  const navigate = useNavigate();
  const { role, usuarioId } = useUser();
  const [form, setForm] = useState<SolicitarForm>(formVazio);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [ligasParticipantes, setLigasParticipantes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [resMe, resLigas] = await Promise.all([
        fetch("/api/usuarios/me", { headers }),
        fetch("/api/ligas", { headers }),
      ]);
      if (resMe.ok) {
        const me = (await resMe.json()) as { nome?: string };
        setForm((prev) => ({ ...prev, nome_solicitante: me.nome ?? "" }));
      }
      if (resLigas.ok) setLigas((await resLigas.json()) as Liga[]);
    }
    void carregar();
  }, []);

  const ligasDisponiveis =
    role === "diretor" && usuarioId
      ? ligas.filter((l) => l.diretores?.some((d) => d.id === usuarioId))
      : ligas;

  const mostrarParticipantes =
    form.tipo_evento === "painel" || form.tipo_evento === "workshop_aberto";

  async function handleSalvar() {
    if (!form.nome_solicitante.trim() || !form.tipo_evento || !form.tema.trim()) {
      setErro("Preencha nome, tipo de evento e tema.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome_solicitante: form.nome_solicitante,
          liga_id: form.liga_id || undefined,
          tipo_evento: form.tipo_evento,
          participantes_info: form.participantes_info || undefined,
          tema: form.tema,
          descricao_tema: form.descricao_tema || undefined,
          nome_palestrante: form.nome_palestrante || undefined,
          linkedin_palestrante: form.linkedin_palestrante || undefined,
          data_inicio:
            form.data && form.hora_inicio
              ? `${form.data}T${form.hora_inicio}`
              : form.data || undefined,
          data_fim: form.data && form.hora_fim ? `${form.data}T${form.hora_fim}` : undefined,
          veiculo_info: form.veiculo_info || undefined,
          observacoes: form.observacoes || undefined,
          local: form.local || undefined,
          mudanca_layout: form.mudanca_layout || undefined,
          coffee_break: form.coffee_break || undefined,
          cenografia: form.cenografia || undefined,
          apoio_infraestrutura: form.apoio_infraestrutura || undefined,
          criacao_mkt: form.criacao_mkt || undefined,
          audio_visual: form.audio_visual || undefined,
          ligas_participantes:
            ligasParticipantes.length > 0
              ? ligas
                  .filter((l) => ligasParticipantes.includes(l.id))
                  .map((l) => ({ id: l.id, nome: l.nome }))
              : undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao enviar solicitação.");
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Solicitação enviada!</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Sua solicitação foi recebida e será analisada pela equipe.
          </p>
        </div>
        <button
          onClick={() => navigate("/calendario")}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Ver Calendário
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Solicitar Evento</h1>
        <p className="mt-1 text-sm text-foreground/50">
          Solicite a organização de um evento pela equipe
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-6">
          {/* Nome completo */}
          <div>
            <p className={labelCls}>Nome completo *</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.nome_solicitante}
              onChange={(e) => setForm({ ...form, nome_solicitante: e.target.value })}
              placeholder="Seu nome"
            />
          </div>

          {/* Comunidade responsável */}
          <div>
            <p className={labelCls}>Comunidade responsável</p>
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

          {/* Participação em conjunto */}
          <div>
            <p className={labelCls}>Participação em conjunto</p>
            <div className="mt-1">
              <MultiSelectLigas
                ligas={ligas}
                selecionadas={ligasParticipantes}
                onChange={setLigasParticipantes}
                excluirId={form.liga_id}
                placeholder="Outras ligas em conjunto..."
              />
            </div>
          </div>

          {/* Tipo de evento */}
          <div>
            <p className={labelCls}>Tipo de evento *</p>
            <div className="mt-1">
              <Select
                value={form.tipo_evento}
                onValueChange={(v) => setForm({ ...form, tipo_evento: v })}
              >
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hub">Hub</SelectItem>
                  <SelectItem value="painel">Painel</SelectItem>
                  <SelectItem value="workshop_aberto">Workshop aberto</SelectItem>
                  <SelectItem value="evento_externo">Evento externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Local */}
          <div>
            <p className={labelCls}>Local</p>
            <div className="mt-1">
              <Select value={form.local} onValueChange={(v) => setForm({ ...form, local: v })}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {GRUPOS_LOCAL.map((g, i) => (
                    <SelectGroup key={g.grupo}>
                      {i > 0 && <SelectSeparator />}
                      <SelectLabel>{g.grupo}</SelectLabel>
                      {g.salas.map((sala) => (
                        <SelectItem key={sala} value={sala}>
                          {sala}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campo condicional: participantes/salas */}
          {mostrarParticipantes && (
            <div>
              <p className={labelCls}>Quantidade de participantes e salas desejadas</p>
              <textarea
                className={`${fieldCls} mt-1 min-h-[80px] resize-none`}
                value={form.participantes_info}
                onChange={(e) => setForm({ ...form, participantes_info: e.target.value })}
                placeholder="Ex: 30 participantes, preferência pela sala 6_03"
              />
            </div>
          )}

          {/* Tema */}
          <div>
            <p className={labelCls}>Tema do encontro *</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.tema}
              onChange={(e) => setForm({ ...form, tema: e.target.value })}
              placeholder="Tema principal do evento"
            />
          </div>

          {/* Descrição do tema */}
          <div>
            <p className={labelCls}>Descrição do tema</p>
            <textarea
              className={`${fieldCls} mt-1 min-h-[80px] resize-none`}
              value={form.descricao_tema}
              onChange={(e) => setForm({ ...form, descricao_tema: e.target.value })}
              placeholder="Descreva o tema com mais detalhes"
            />
          </div>

          {/* Nome do palestrante */}
          <div>
            <p className={labelCls}>Nome do palestrante</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.nome_palestrante}
              onChange={(e) => setForm({ ...form, nome_palestrante: e.target.value })}
              placeholder="Nome completo do palestrante"
            />
          </div>

          {/* LinkedIn */}
          <div>
            <p className={labelCls}>LinkedIn do palestrante</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.linkedin_palestrante}
              onChange={(e) => setForm({ ...form, linkedin_palestrante: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          {/* Data e horário */}
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
            <div>
              <p className={labelCls}>Data do encontro</p>
              <input
                type="date"
                className={`${fieldCls} mt-1`}
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div>
              <p className={labelCls}>Hora de início</p>
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

          {/* Veículo */}
          <div>
            <p className={labelCls}>Placa, modelo e cor do veículo (opcional)</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.veiculo_info}
              onChange={(e) => setForm({ ...form, veiculo_info: e.target.value })}
              placeholder="Ex: ABC-1234, Civic preto"
            />
          </div>

          {/* Mudança de layout */}
          <div>
            <p className={labelCls}>Será necessário mudança de layout?</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.mudanca_layout}
              onChange={(e) => setForm({ ...form, mudanca_layout: e.target.value })}
              placeholder="Descreva a necessidade"
            />
          </div>

          {/* Coffee break */}
          <div>
            <p className={labelCls}>Será necessário coffee break?</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.coffee_break}
              onChange={(e) => setForm({ ...form, coffee_break: e.target.value })}
              placeholder="Descreva a necessidade"
            />
          </div>

          {/* Cenografia */}
          <div>
            <p className={labelCls}>Será necessário cenografia?</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.cenografia}
              onChange={(e) => setForm({ ...form, cenografia: e.target.value })}
              placeholder="Descreva a necessidade"
            />
          </div>

          {/* Apoio de infraestrutura */}
          <div>
            <p className={labelCls}>Será necessário apoio de infraestrutura?</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.apoio_infraestrutura}
              onChange={(e) => setForm({ ...form, apoio_infraestrutura: e.target.value })}
              placeholder="Descreva a necessidade"
            />
          </div>

          {/* Criação do MKT */}
          <div>
            <p className={labelCls}>Será necessário criação do MKT?</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.criacao_mkt}
              onChange={(e) => setForm({ ...form, criacao_mkt: e.target.value })}
              placeholder="Descreva a necessidade"
            />
          </div>

          {/* Áudio visual */}
          <div>
            <p className={labelCls}>Será necessário áudio visual?</p>
            <input
              className={`${fieldCls} mt-1`}
              value={form.audio_visual}
              onChange={(e) => setForm({ ...form, audio_visual: e.target.value })}
              placeholder="Descreva a necessidade"
            />
          </div>

          {/* Observações */}
          <div>
            <p className={labelCls}>Outras observações (opcional)</p>
            <textarea
              className={`${fieldCls} mt-1 min-h-[80px] resize-none`}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Informações adicionais"
            />
          </div>

          {erro && <p className="font-plex-mono text-[11px] text-red-500">{erro}</p>}

          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="w-full py-3 bg-primary text-primary-foreground rounded-full text-xs font-medium uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {salvando ? "Enviando..." : "Enviar solicitação"}
          </button>
          <button
            onClick={() => navigate("/calendario")}
            className="w-full py-3 rounded-full border border-border text-xs font-medium uppercase tracking-widest text-foreground/60 hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
