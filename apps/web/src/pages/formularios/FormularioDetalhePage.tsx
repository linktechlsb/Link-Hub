import { ArrowLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

import type {
  FormularioCandidato,
  FormularioComPerguntas,
  ResultadosFormulario,
  CandidatoStatus,
  FormularioStatus,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_CANDIDATO_LABELS: Record<CandidatoStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_CANDIDATO_COLORS: Record<CandidatoStatus, string> = {
  pendente: "bg-amber-100 text-amber-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-600",
};

const STATUS_FORMULARIO_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

export function FormularioDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState<FormularioComPerguntas | null>(null);
  const [resultados, setResultados] = useState<ResultadosFormulario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<CandidatoStatus | "todos">("todos");
  const [candidatoAberto, setCandidatoAberto] = useState<FormularioCandidato | null>(null);

  useEffect(() => {
    if (id) {
      carregarDados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const token = await getToken();

      const [resFormulario, resResultados] = await Promise.all([
        fetch(`http://localhost:3001/api/formularios/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:3001/api/formularios/${id}/resultados`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!resFormulario.ok) throw new Error("Formulário não encontrado");
      const dadosFormulario = await resFormulario.json();
      setFormulario(dadosFormulario);

      if (resResultados.ok) {
        const dadosResultados = await resResultados.json();
        setResultados(dadosResultados);
      }
    } catch {
      toast.error("Erro ao carregar formulário");
    } finally {
      setCarregando(false);
    }
  }

  async function sincronizar() {
    if (!id) return;
    try {
      setSincronizando(true);
      const token = await getToken();
      const res = await fetch(`http://localhost:3001/api/formularios/${id}/sincronizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      toast.success(
        `${(dados as { sincronizados: number }).sincronizados} novo(s) candidato(s) sincronizado(s).`,
      );
      await carregarDados();
    } catch {
      toast.error("Erro ao sincronizar respostas");
    } finally {
      setSincronizando(false);
    }
  }

  async function encerrar() {
    if (!id) return;
    try {
      setEncerrando(true);
      const token = await getToken();
      const res = await fetch(`http://localhost:3001/api/formularios/${id}/encerrar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Formulário encerrado.");
      await carregarDados();
    } catch {
      toast.error("Erro ao encerrar formulário");
    } finally {
      setEncerrando(false);
    }
  }

  function exportarCSV() {
    if (!resultados) return;
    const linhas = [
      ["Nome", "Email", "Pontuação", "Status", "Data de submissão", "Motivo reprovação"],
      ...resultados.candidatos.map((c) => [
        c.nome,
        c.email,
        String(c.pontuacao_total),
        STATUS_CANDIDATO_LABELS[c.status],
        new Date(c.submitted_at).toLocaleString("pt-BR"),
        c.motivo_reprovacao ?? "",
      ]),
    ];
    const csv = linhas.map((l) => l.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidatos-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const candidatosFiltrados =
    resultados?.candidatos.filter((c) => filtroStatus === "todos" || c.status === filtroStatus) ??
    [];

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/50 text-sm">
        Carregando...
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/50 text-sm">
        Formulário não encontrado.
      </div>
    );
  }

  const formularioComLiga = formulario as FormularioComPerguntas & { liga_nome?: string };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-6">
        <button
          onClick={() => navigate("/formularios")}
          className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
                {formulario.nome}
              </h1>
              <Badge className="text-[10px] px-2 py-0.5 bg-brand-gray text-navy">
                {STATUS_FORMULARIO_LABELS[formulario.status]}
              </Badge>
            </div>
            {formularioComLiga.liga_nome && (
              <p className="text-[12px] text-navy/50">{formularioComLiga.liga_nome}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {formulario.typeform_form_url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-navy/20 text-navy gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(formulario.typeform_form_url ?? "");
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar link
                </Button>
                <a href={formulario.typeform_form_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-navy/20 text-navy gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir form
                  </Button>
                </a>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={sincronizar}
              disabled={sincronizando}
              className="border-navy/20 text-navy gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? "animate-spin" : ""}`} />
              {sincronizando ? "Sincronizando..." : "Sincronizar"}
            </Button>
            {formulario.status === "aberto" && (
              <Button
                variant="outline"
                size="sm"
                onClick={encerrar}
                disabled={encerrando}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                {encerrando ? "Encerrando..." : "Encerrar"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {resultados && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", valor: resultados.total, cor: "text-navy" },
            { label: "Aprovados", valor: resultados.aprovados, cor: "text-green-700" },
            { label: "Reprovados", valor: resultados.reprovados, cor: "text-red-600" },
            { label: "Pendentes", valor: resultados.pendentes, cor: "text-amber-700" },
          ].map(({ label, valor, cor }) => (
            <div key={label} className="border border-navy/15 p-4 text-center">
              <div className={`font-display font-bold text-[28px] ${cor}`}>{valor}</div>
              <div className="text-[11px] text-navy/50 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {(["todos", "aprovado", "pendente", "reprovado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`text-[11px] px-3 py-1.5 border transition-colors
                ${filtroStatus === s ? "border-navy bg-navy text-white" : "border-navy/20 text-navy/60 hover:border-navy/40"}`}
            >
              {s === "todos" ? "Todos" : STATUS_CANDIDATO_LABELS[s]}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportarCSV}
          className="border-navy/20 text-navy text-[11px]"
        >
          Exportar CSV
        </Button>
      </div>

      {candidatosFiltrados.length === 0 ? (
        <div className="border border-navy/15 p-10 text-center text-[13px] text-navy/40">
          {resultados?.total === 0
            ? "Nenhum candidato ainda. Clique em Sincronizar para buscar respostas."
            : "Nenhum candidato neste filtro."}
        </div>
      ) : (
        <div className="border border-navy/15">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy/10">
                {["Nome", "Email", "Pontuação", "Status", "Data"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium text-navy/50 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidatosFiltrados.map((candidato) => (
                <tr
                  key={candidato.id}
                  className="border-b border-navy/5 hover:bg-navy/[0.02] cursor-pointer transition-colors"
                  onClick={() => setCandidatoAberto(candidato)}
                >
                  <td className="px-4 py-3 text-[13px] font-medium text-navy">{candidato.nome}</td>
                  <td className="px-4 py-3 text-[12px] text-navy/60">{candidato.email}</td>
                  <td className="px-4 py-3 text-[13px] text-navy font-medium">
                    {candidato.pontuacao_total}/100
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-[10px] px-2 py-0.5 ${STATUS_CANDIDATO_COLORS[candidato.status]}`}
                    >
                      {STATUS_CANDIDATO_LABELS[candidato.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-navy/40">
                    {new Date(candidato.submitted_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!candidatoAberto} onOpenChange={(open) => !open && setCandidatoAberto(null)}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle className="font-display font-bold text-[16px] text-navy">
              {candidatoAberto?.nome}
            </SheetTitle>
          </SheetHeader>
          {candidatoAberto && (
            <div className="mt-4 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-3">
                <Badge
                  className={`text-[11px] px-2 py-0.5 ${STATUS_CANDIDATO_COLORS[candidatoAberto.status]}`}
                >
                  {STATUS_CANDIDATO_LABELS[candidatoAberto.status]}
                </Badge>
                <span className="text-[13px] text-navy font-medium">
                  {candidatoAberto.pontuacao_total}/100
                </span>
              </div>
              <p className="text-[12px] text-navy/50">{candidatoAberto.email}</p>
              {candidatoAberto.motivo_reprovacao && (
                <div className="bg-red-50 border border-red-100 p-3 text-[12px] text-red-600">
                  {candidatoAberto.motivo_reprovacao}
                </div>
              )}
              <div className="space-y-3 mt-4">
                <h4 className="text-[12px] font-medium text-navy/50 uppercase tracking-wider">
                  Respostas
                </h4>
                {formulario.perguntas.map((pergunta, i) => {
                  type RespostaItem = {
                    field: { ref: string };
                    text?: string;
                    number?: number;
                    boolean?: boolean;
                    choice?: { label: string };
                    email?: string;
                  };
                  const respostas = candidatoAberto.respostas as unknown as RespostaItem[];
                  const resp = respostas?.find((r) => r.field?.ref === pergunta.typeform_field_id);
                  const valor =
                    resp?.email ??
                    resp?.text ??
                    resp?.choice?.label ??
                    resp?.number?.toString() ??
                    (resp?.boolean !== undefined ? (resp.boolean ? "Sim" : "Não") : "—");

                  return (
                    <div key={i} className="border-b border-navy/[0.08] pb-3">
                      <p className="text-[11px] text-navy/50 mb-0.5">{pergunta.titulo}</p>
                      <p className="text-[13px] text-navy">{valor}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
