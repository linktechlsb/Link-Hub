import {
  ArrowLeft,
  Copy,
  ExternalLink,
  MoreHorizontal,
  PowerOff,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import { TallyPreview } from "./components/TallyPreview";

import type { KpiItem } from "@/pages/home/v1/primitives";
import type {
  FormularioComCampos,
  FormularioResposta,
  FormularioStatus,
  ResultadosFormulario,
  RespostaStatus,
  TallyAnswer,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_RESP_LABELS: Record<RespostaStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};
const STATUS_RESP_BADGE: Record<RespostaStatus, string> = {
  pendente: "bg-amber-100 text-amber-700",
  aprovado: "bg-green-100 text-green-700",
  reprovado: "bg-red-100 text-red-600",
};
const STATUS_FORM_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};
const STATUS_FORM_BADGE: Record<FormularioStatus, string> = {
  rascunho: "bg-brand-yellow/20 text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-navy/10 text-navy/60",
};

type FiltroStatus = RespostaStatus | "todos";

function renderAnswer(answer: TallyAnswer | undefined): string {
  if (!answer) return "—";
  const v = answer.value;
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(String).join(", ");
  return JSON.stringify(v);
}

export function FormularioDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState<FormularioComCampos | null>(null);
  const [resultados, setResultados] = useState<ResultadosFormulario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [respostaAberta, setRespostaAberta] = useState<FormularioResposta | null>(null);
  const [deletando, setDeletando] = useState(false);
  const [reativando, setReativando] = useState(false);
  const [confirmandoDeletar, setConfirmandoDeletar] = useState(false);

  useEffect(() => {
    if (id) void carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const token = await getToken();
      const [resForm, resRes] = await Promise.all([
        fetch(`/api/formularios/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/formularios/${id}/resultados`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!resForm.ok) throw new Error();
      setFormulario(await resForm.json());
      if (resRes.ok) setResultados(await resRes.json());
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
      const res = await fetch(`/api/formularios/${id}/sincronizar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const dados = (await res.json()) as { sincronizados: number };
      toast.success(`${dados.sincronizados} nova(s) resposta(s) sincronizada(s).`);
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
      const res = await fetch(`/api/formularios/${id}/encerrar`, {
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

  async function reativar() {
    if (!id) return;
    try {
      setReativando(true);
      const token = await getToken();
      const res = await fetch(`/api/formularios/${id}/reativar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Formulário reativado.");
      await carregarDados();
    } catch {
      toast.error("Erro ao reativar formulário");
    } finally {
      setReativando(false);
    }
  }

  async function confirmarDeletar() {
    if (!id) return;
    try {
      setDeletando(true);
      const token = await getToken();
      const res = await fetch(`/api/formularios/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Formulário deletado.");
      navigate("/formularios");
    } catch {
      toast.error("Erro ao deletar formulário");
    } finally {
      setDeletando(false);
      setConfirmandoDeletar(false);
    }
  }

  function exportarCSV() {
    if (!resultados || !formulario) return;
    const headerCols = formulario.scoring_enabled
      ? ["Nome", "Email", "Pontuação", "Status", "Submissão", "Motivo"]
      : ["Nome", "Email", "Submissão"];
    const linhas = [
      headerCols,
      ...resultados.respostas.map((r) =>
        formulario.scoring_enabled
          ? [
              r.nome,
              r.email,
              String(r.pontuacao_total ?? ""),
              STATUS_RESP_LABELS[r.status],
              new Date(r.submitted_at).toLocaleString("pt-BR"),
              r.motivo_reprovacao ?? "",
            ]
          : [r.nome, r.email, new Date(r.submitted_at).toLocaleString("pt-BR")],
      ),
    ];
    const csv = linhas.map((l) => l.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respostas-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (carregando) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/40 text-[13px]">
        Carregando...
      </div>
    );
  }
  if (!formulario) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-10 text-center text-navy/40 text-[13px]">
        Formulário não encontrado.
      </div>
    );
  }

  const respostasFiltradas =
    resultados?.respostas.filter((r) => filtroStatus === "todos" || r.status === filtroStatus) ??
    [];

  const scoring = formulario.scoring_enabled;
  const kpis: KpiItem[] = scoring
    ? [
        { label: "Total", valor: String(resultados?.total ?? 0) },
        { label: "Aprovados", valor: String(resultados?.aprovados ?? 0) },
        { label: "Reprovados", valor: String(resultados?.reprovados ?? 0) },
        { label: "Pendentes", valor: String(resultados?.pendentes ?? 0) },
      ]
    : [{ label: "Total de respostas", valor: String(resultados?.total ?? 0) }];

  const total = resultados?.total ?? 0;
  const pctAprovados = scoring && total > 0 ? Math.round((resultados!.aprovados / total) * 100) : 0;
  const pctReprovados =
    scoring && total > 0 ? Math.round((resultados!.reprovados / total) * 100) : 0;
  const pctPendentes = scoring && total > 0 ? 100 - pctAprovados - pctReprovados : 0;

  const filtrosStatus: { valor: FiltroStatus; label: string }[] = scoring
    ? [
        { valor: "todos", label: "Todos" },
        { valor: "aprovado", label: "Aprovados" },
        { valor: "pendente", label: "Pendentes" },
        { valor: "reprovado", label: "Reprovados" },
      ]
    : [{ valor: "todos", label: "Todos" }];

  const formularioComLiga = formulario as FormularioComCampos & { liga_nome?: string };

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <button
        onClick={() => navigate("/formularios")}
        className="flex items-center gap-1.5 text-[12px] text-navy/50 hover:text-navy mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Formulários
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
              {formulario.nome}
            </h1>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_FORM_BADGE[formulario.status]}`}
            >
              {STATUS_FORM_LABELS[formulario.status]}
            </span>
          </div>
          {formularioComLiga.liga_nome && (
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mt-1">
              {formularioComLiga.liga_nome}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-navy/20 text-navy w-8 px-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {formulario.tally_form_url && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(formulario.tally_form_url ?? "");
                      toast.success("Link copiado!");
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(formulario.tally_form_url ?? "", "_blank", "noopener,noreferrer")
                    }
                    className="gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir formulário
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={sincronizar}
                disabled={sincronizando}
                className="gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? "animate-spin" : ""}`} />
                {sincronizando ? "Sincronizando..." : "Sincronizar respostas"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {formulario.status === "aberto" && (
                <DropdownMenuItem
                  onClick={encerrar}
                  disabled={encerrando}
                  className="gap-2 cursor-pointer text-amber-600 focus:text-amber-600"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  {encerrando ? "Encerrando..." : "Encerrar formulário"}
                </DropdownMenuItem>
              )}
              {formulario.status === "encerrado" && (
                <DropdownMenuItem
                  onClick={reativar}
                  disabled={reativando}
                  className="gap-2 cursor-pointer text-green-600 focus:text-green-600"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {reativando ? "Reativando..." : "Reativar formulário"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmandoDeletar(true)}
                className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Deletar formulário
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="respostas">
        <TabsList>
          <TabsTrigger value="respostas">Respostas</TabsTrigger>
          {formulario.tally_form_id && <TabsTrigger value="preview">Preview</TabsTrigger>}
        </TabsList>

        <TabsContent value="respostas" className="mt-6">
          <section>
            <SectionHeader
              titulo={scoring ? "Visão Geral" : "Resumo"}
              tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
            />

            {scoring && resultados && resultados.total > 0 && (
              <div className="mb-6">
                <div className="flex h-2 rounded-full overflow-hidden bg-navy/10 mb-3">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${pctAprovados}%` }}
                  />
                  <div
                    className="bg-red-400 transition-all"
                    style={{ width: `${pctReprovados}%` }}
                  />
                  <div
                    className="bg-amber-400 transition-all"
                    style={{ width: `${pctPendentes}%` }}
                  />
                </div>
                <div className="flex gap-6 text-[11px] text-navy/60">
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 align-middle" />
                    Aprovados ({resultados.aprovados})
                  </span>
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1.5 align-middle" />
                    Reprovados ({resultados.reprovados})
                  </span>
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
                    Pendentes ({resultados.pendentes})
                  </span>
                </div>
              </div>
            )}

            <KpiRow items={kpis} cols={scoring ? 4 : 2} />
          </section>

          <section className="mt-12">
            <SectionHeader
              titulo="Respostas"
              tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
              acao={
                resultados && resultados.total > 0 ? (
                  <button
                    onClick={exportarCSV}
                    className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-foreground hover:text-background transition-colors"
                  >
                    Exportar CSV
                  </button>
                ) : null
              }
            />

            {scoring && (
              <div className="flex gap-2 mb-5">
                {filtrosStatus.map(({ valor, label }) => (
                  <button
                    key={valor}
                    onClick={() => setFiltroStatus(valor)}
                    className={
                      filtroStatus === valor
                        ? "bg-navy text-white px-3 py-1 rounded-full text-[11px] font-semibold"
                        : "border border-navy/20 text-navy/60 px-3 py-1 rounded-full text-[11px] font-semibold hover:border-navy/40"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {respostasFiltradas.length === 0 ? (
              <div className="border border-dashed border-navy/20 rounded-lg py-16 text-center">
                <p className="text-[13px] text-navy/40">
                  {resultados?.total === 0
                    ? "Nenhuma resposta ainda. Clique em Sincronizar para buscar."
                    : "Nenhuma resposta neste filtro."}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-foreground/[0.08]">
                    {(scoring
                      ? ["Nome", "Email", "Pontuação", "Status", "Data"]
                      : ["Nome", "Email", "Data"]
                    ).map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40 font-normal"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {respostasFiltradas.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setRespostaAberta(r)}
                      className="border-b border-foreground/[0.06] hover:bg-navy/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                        {r.nome || "—"}
                      </td>
                      <td className="py-3 px-4 font-plex-sans text-[13px] text-navy/60">
                        {r.email || "—"}
                      </td>
                      {scoring && (
                        <>
                          <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                            {r.pontuacao_total ?? "—"}/100
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_RESP_BADGE[r.status]}`}
                            >
                              {STATUS_RESP_LABELS[r.status]}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 font-plex-mono text-[11px] text-navy/40">
                        {new Date(r.submitted_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </TabsContent>

        {formulario.tally_form_id && (
          <TabsContent value="preview" className="mt-6">
            <TallyPreview tallyFormId={formulario.tally_form_id} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog
        open={confirmandoDeletar}
        onOpenChange={(aberto) => !aberto && setConfirmandoDeletar(false)}
      >
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1">
              Formulários
            </p>
            <DialogTitle className="font-display font-bold text-[18px] tracking-[-0.02em] text-foreground">
              Deletar formulário
            </DialogTitle>
            <DialogDescription className="font-plex-sans text-[13px] text-foreground/60 mt-1">
              Tem certeza que deseja deletar{" "}
              <span className="font-semibold text-foreground">{formulario.nome}</span>? Todas as
              respostas serão removidas permanentemente. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="h-px bg-foreground/[0.08]" />
          <div className="px-6 py-4 flex items-center gap-2">
            <button
              onClick={() => setConfirmandoDeletar(false)}
              disabled={deletando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/20 px-4 py-3 rounded-full hover:bg-foreground/[0.06] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarDeletar}
              disabled={deletando}
              className="flex-1 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-white bg-red-500 hover:bg-red-600 px-4 py-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deletando ? "Deletando..." : "Deletar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!respostaAberta} onOpenChange={(open) => !open && setRespostaAberta(null)}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle className="font-display font-bold text-[16px] text-navy">
              {respostaAberta?.nome || "Resposta"}
            </SheetTitle>
          </SheetHeader>
          {respostaAberta && (
            <div className="mt-4 space-y-4 overflow-y-auto">
              {scoring && (
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_RESP_BADGE[respostaAberta.status]}`}
                  >
                    {STATUS_RESP_LABELS[respostaAberta.status]}
                  </span>
                  <span className="font-plex-sans text-[13px] text-navy font-semibold">
                    {respostaAberta.pontuacao_total ?? "—"}/100
                  </span>
                </div>
              )}
              <p className="font-plex-sans text-[12px] text-navy/50">{respostaAberta.email}</p>
              {scoring && respostaAberta.motivo_reprovacao && (
                <div className="bg-red-50 border border-red-100 p-3 text-[12px] text-red-600 rounded">
                  {respostaAberta.motivo_reprovacao}
                </div>
              )}
              <div className="space-y-3 mt-4">
                <p className="font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40">
                  Respostas
                </p>
                {formulario.campos.map((campo, i) => {
                  const answer = campo.tally_question_id
                    ? respostaAberta.respostas[campo.tally_question_id]
                    : undefined;
                  return (
                    <div key={i} className="border-b border-navy/[0.08] pb-3">
                      <p className="font-plex-mono text-[10px] uppercase tracking-[0.1em] text-navy/40 mb-0.5">
                        {campo.titulo}
                      </p>
                      <p className="font-plex-sans text-[13px] text-navy">{renderAnswer(answer)}</p>
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
