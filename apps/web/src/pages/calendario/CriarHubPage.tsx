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

interface HubForm {
  liga_id: string;
  titulo: string;
  descricao: string;
  data: string;
  sala_id: string;
  hora_inicio: string;
  hora_fim: string;
}

function formVazio(): HubForm {
  const today = new Date();
  const data = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return {
    liga_id: "",
    titulo: "",
    descricao: "",
    data,
    sala_id: "",
    hora_inicio: "",
    hora_fim: "",
  };
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const fieldCls =
  "w-full font-plex-sans text-[13px] text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded";
const labelCls = "font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40";

export function CriarHubPage() {
  const navigate = useNavigate();
  const { role, usuarioId } = useUser();
  const [form, setForm] = useState<HubForm>(formVazio);
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [resLigas, resSalas] = await Promise.all([
        fetch("/api/ligas", { headers }),
        fetch("/api/salas", { headers }),
      ]);
      if (resLigas.ok) setLigas((await resLigas.json()) as Liga[]);
      if (resSalas.ok) setSalas((await resSalas.json()) as Sala[]);
    }
    void carregar();
  }, []);

  const ligasDisponiveis =
    role === "diretor" && usuarioId
      ? ligas.filter((l) => l.diretores?.some((d) => d.id === usuarioId))
      : ligas;

  async function handleSalvar() {
    if (!form.titulo.trim() || !form.liga_id) {
      setErro("Preencha o título e a liga.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: form.liga_id,
          titulo: form.titulo,
          descricao: form.descricao || undefined,
          categoria: "hub",
          data: form.data,
          sala_id: form.sala_id || undefined,
          hora_inicio: form.hora_inicio || undefined,
          hora_fim: form.hora_fim || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar hub.");
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10">
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
          Calendário · Link School of Business
        </p>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] mt-1 mb-6">
          Hub criado!
        </h1>
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
          Calendário · Link School of Business
        </p>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] mt-1">Criar Hub</h1>
      </div>

      <div className="space-y-6">
        <div>
          <p className={labelCls}>Liga *</p>
          <div className="mt-1">
            <Select value={form.liga_id} onValueChange={(v) => setForm({ ...form, liga_id: v })}>
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder="Selecione a liga" />
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

        <div>
          <p className={labelCls}>Título *</p>
          <input
            className={`${fieldCls} mt-1`}
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Nome do hub"
          />
        </div>

        <div>
          <p className={labelCls}>Data</p>
          <input
            type="date"
            className={`${fieldCls} mt-1`}
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={labelCls}>Início</p>
            <input
              type="time"
              className={`${fieldCls} mt-1`}
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
            />
          </div>
          <div>
            <p className={labelCls}>Fim</p>
            <input
              type="time"
              className={`${fieldCls} mt-1`}
              value={form.hora_fim}
              onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
            />
          </div>
        </div>

        <div>
          <p className={labelCls}>Sala</p>
          <div className="mt-1">
            <Select value={form.sala_id} onValueChange={(v) => setForm({ ...form, sala_id: v })}>
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder="Selecione a sala (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {salas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <p className={labelCls}>Descrição</p>
          <textarea
            className={`${fieldCls} mt-1 min-h-[80px] resize-none`}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Detalhes do hub (opcional)"
          />
        </div>

        {erro && <p className="font-plex-mono text-[11px] text-red-500">{erro}</p>}

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full py-3 bg-[#10244D] text-white rounded-full font-plex-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-50"
        >
          {salvando ? "Criando..." : "Criar Hub"}
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
