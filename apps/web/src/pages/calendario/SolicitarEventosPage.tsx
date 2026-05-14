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
  };
}

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
      <div className="max-w-2xl mx-auto px-8 py-10">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
          Eventos · Link School of Business
        </p>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] mt-1 mb-4">
          Solicitação enviada!
        </h1>
        <p className="font-plex-sans text-[13px] text-foreground/60 mb-6">
          Sua solicitação foi recebida e será analisada pela equipe.
        </p>
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
          Solicitar evento
        </h1>
      </div>

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
          className="w-full py-3 bg-[#10244D] text-white rounded-full font-plex-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {salvando ? "Enviando..." : "Enviar solicitação"}
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
