import { ArrowLeft, ArrowRight, Check, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import type {
  CampoTipo,
  CreateCampoInput,
  CreateFormularioInput,
  FormularioComCampos,
  FormularioTipo,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface LigaOpcao {
  id: string;
  nome: string;
}

const CAMPO_LABELS: Record<CampoTipo, string> = {
  texto: "Texto livre",
  multipla_escolha: "Múltipla escolha",
  nota_1_10: "Nota (1–10)",
  sim_nao: "Sim / Não",
};

const TIPO_LABELS: Record<FormularioTipo, string> = {
  generico: "Genérico",
  processo_seletivo: "Processo Seletivo",
  pesquisa: "Pesquisa",
  inscricao: "Inscrição",
  feedback: "Feedback",
};

const ETAPA_LABELS = ["Informações", "Campos", "Revisão"];

export function NovoFormularioPage() {
  const navigate = useNavigate();
  const { role } = useUser();
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [linkCriado, setLinkCriado] = useState<string | null>(null);
  const [formularioId, setFormularioId] = useState<string | null>(null);
  const [ligas, setLigas] = useState<LigaOpcao[]>([]);
  const [ligaFixa, setLigaFixa] = useState<LigaOpcao | null>(null);
  const [carregandoLiga, setCarregandoLiga] = useState(false);

  // Etapa 1 — Informações
  const [tipo, setTipo] = useState<FormularioTipo>("generico");
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [pontuacaoMinima, setPontuacaoMinima] = useState(60);
  const [ligaId, setLigaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  // Etapa 2 — Campos
  const [campos, setCampos] = useState<CreateCampoInput[]>([]);
  const [somaPesos, setSomaPesos] = useState(0);

  useEffect(() => {
    if (role === "diretor") void carregarMinhaLiga();
    else if (role === "staff") void carregarLigas();
  }, [role]);

  useEffect(() => {
    setSomaPesos(campos.reduce((acc, c) => acc + (c.peso || 0), 0));
  }, [campos]);

  // Quando tipo muda, sugere scoring default
  useEffect(() => {
    setScoringEnabled(tipo === "processo_seletivo");
  }, [tipo]);

  async function carregarMinhaLiga() {
    try {
      setCarregandoLiga(true);
      const token = await getToken();
      const res = await fetch("/api/formularios/minha-liga", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const liga = (await res.json()) as LigaOpcao;
      setLigaFixa(liga);
      setLigaId(liga.id);
    } catch {
      toast.error("Erro ao carregar sua liga.");
    } finally {
      setCarregandoLiga(false);
    }
  }

  async function carregarLigas() {
    try {
      const token = await getToken();
      const res = await fetch("/api/ligas", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      setLigas(dados.map((l: { id: string; nome: string }) => ({ id: l.id, nome: l.nome })));
    } catch {
      toast.error("Erro ao carregar ligas");
    }
  }

  function adicionarCampo(t: CampoTipo) {
    const novo: CreateCampoInput = {
      titulo: "",
      tipo: t,
      ordem: campos.length,
      peso: 0,
      eliminatoria: false,
      nota_minima: t === "nota_1_10" ? 5 : undefined,
      opcoes: t === "multipla_escolha" ? ["", ""] : undefined,
      opcoes_eliminatorias: t === "multipla_escolha" ? [] : undefined,
    };
    setCampos([...campos, novo]);
  }

  function atualizarCampo(index: number, dados: Partial<CreateCampoInput>) {
    setCampos((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        return { ...c, ...dados };
      }),
    );
  }

  function removerCampo(index: number) {
    setCampos((prev) => prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, ordem: i })));
  }

  function atualizarOpcao(campoIndex: number, opcaoIndex: number, valor: string) {
    setCampos((prev) =>
      prev.map((c, i) => {
        if (i !== campoIndex) return c;
        const opcoes = [...(c.opcoes ?? [])];
        opcoes[opcaoIndex] = valor;
        return { ...c, opcoes };
      }),
    );
  }

  function adicionarOpcao(campoIndex: number) {
    setCampos((prev) =>
      prev.map((c, i) => (i === campoIndex ? { ...c, opcoes: [...(c.opcoes ?? []), ""] } : c)),
    );
  }

  function toggleOpcaoEliminatoria(campoIndex: number, opcao: string) {
    setCampos((prev) =>
      prev.map((c, i) => {
        if (i !== campoIndex) return c;
        const eliminatorias = c.opcoes_eliminatorias ?? [];
        const jaEsta = eliminatorias.includes(opcao);
        return {
          ...c,
          opcoes_eliminatorias: jaEsta
            ? eliminatorias.filter((o) => o !== opcao)
            : [...eliminatorias, opcao],
        };
      }),
    );
  }

  async function criarFormulario(publicar: boolean) {
    // Validações
    if (!tipo || !nome || campos.length === 0) {
      toast.error("Preencha todas as informações obrigatórias.");
      return;
    }
    if (tipo === "processo_seletivo" && !ligaId) {
      toast.error("Processo Seletivo requer uma liga.");
      return;
    }
    if (scoringEnabled) {
      const camposComPeso = campos.filter((c) => c.tipo !== "texto");
      if (camposComPeso.length > 0 && somaPesos !== 100) {
        toast.error(`A soma dos pesos deve ser exatamente 100. Atual: ${somaPesos}.`);
        return;
      }
    }

    try {
      setSalvando(true);
      const token = await getToken();
      const payload: CreateFormularioInput = {
        liga_id: ligaId || undefined,
        tipo,
        nome,
        descricao: descricao || undefined,
        scoring_enabled: scoringEnabled,
        pontuacao_minima_aprovacao: scoringEnabled ? pontuacaoMinima : undefined,
        campos,
      };

      const res = await fetch("/api/formularios", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? "Erro ao criar formulário");
      }

      const formulario = (await res.json()) as FormularioComCampos;
      setFormularioId(formulario.id);

      if (publicar) {
        const pubRes = await fetch(`/api/formularios/${formulario.id}/publicar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pubRes.ok) {
          const err = await pubRes.json();
          toast.warning(
            `Formulário criado, mas não publicado: ${(err as { error?: string }).error ?? "erro"}`,
          );
        }
      }

      setLinkCriado(formulario.tally_form_url ?? null);
      setEtapa(4); // tela de sucesso
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar formulário");
    } finally {
      setSalvando(false);
    }
  }

  // ============== TELA DE SUCESSO ==============
  if (etapa === 4 && linkCriado) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="text-center py-12 border border-navy/15">
          <Check className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="font-display font-bold text-[20px] text-navy mb-2">
            Formulário criado com sucesso!
          </h2>
          <p className="text-[13px] text-navy/60 mb-6">
            Compartilhe o link abaixo com os respondentes.
          </p>
          <div className="flex items-center gap-2 border border-navy/20 p-3 mx-auto max-w-sm">
            <span className="text-[12px] text-navy/60 truncate flex-1">{linkCriado}</span>
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(linkCriado);
                toast.success("Link copiado!");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-center gap-3 mt-8">
            <Button
              variant="outline"
              onClick={() => navigate("/formularios")}
              className="border-navy/20 text-navy"
            >
              Ver todos os formulários
            </Button>
            {formularioId && (
              <Button
                onClick={() => navigate(`/formularios/${formularioId}`)}
                className="bg-navy text-white hover:bg-navy/90"
              >
                Ver respostas
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-8">
        <button
          onClick={() => navigate("/formularios")}
          className="flex items-center gap-1 text-[12px] text-navy/50 hover:text-navy mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Formulários
        </button>
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Criar Formulário
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mt-1">
          Novo Formulário
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto">
        {ETAPA_LABELS.map((label, i) => {
          const num = i + 1;
          const ativa = etapa === num;
          const concluida = etapa > num;
          return (
            <div key={num} className="flex items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                    ${ativa ? "bg-navy text-white" : concluida ? "bg-navy/20 text-navy dark:bg-white/20 dark:text-white" : "bg-brand-gray text-navy/40 dark:bg-[#666666] dark:text-white"}`}
                >
                  {concluida ? <Check className="w-3 h-3" /> : num}
                </div>
                <span className={`text-[12px] font-medium ${ativa ? "text-navy" : "text-navy/40"}`}>
                  {label}
                </span>
              </div>
              {i < ETAPA_LABELS.length - 1 && (
                <div className="w-8 h-px bg-navy/15 dark:bg-[#666666] mx-3" />
              )}
            </div>
          );
        })}
      </div>

      {/* ETAPA 1 — Informações */}
      {etapa === 1 && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Tipo de formulário *
            </label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as FormularioTipo)}>
              <SelectTrigger className="border-border bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TIPO_LABELS) as [FormularioTipo, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 p-3 border border-border bg-muted/30 rounded">
            <input
              type="checkbox"
              id="scoring"
              checked={scoringEnabled}
              onChange={(e) => setScoringEnabled(e.target.checked)}
              className="accent-navy"
            />
            <label htmlFor="scoring" className="text-[13px] text-navy flex-1">
              <span className="font-semibold">Habilitar pontuação automática</span>
              <span className="block text-[11px] text-navy/50 mt-0.5">
                Permite definir pesos e critérios eliminatórios para cada campo.
              </span>
            </label>
          </div>

          {scoringEnabled && (
            <div>
              <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
                Pontuação mínima para aprovação *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={pontuacaoMinima}
                onChange={(e) => setPontuacaoMinima(Number(e.target.value))}
                className="w-32 px-3 py-2 border border-border bg-muted/50 text-[13px] rounded"
              />
              <span className="ml-2 text-[12px] text-navy/50">/ 100</span>
            </div>
          )}

          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Liga {tipo === "processo_seletivo" ? "*" : ""}
            </label>
            {role === "diretor" ? (
              carregandoLiga ? (
                <p className="text-[13px] text-foreground/40">Carregando...</p>
              ) : (
                <div className="border border-border px-3 py-2 bg-muted/50 rounded">
                  <p className="text-[13px] text-foreground font-medium">
                    {ligaFixa?.nome ?? "Sua liga"}
                  </p>
                </div>
              )
            ) : (
              <Select
                value={ligaId || "none"}
                onValueChange={(v) => setLigaId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="border-border bg-muted/50">
                  <SelectValue
                    placeholder={tipo === "processo_seletivo" ? "Selecione a liga" : "Sem liga"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {tipo !== "processo_seletivo" && <SelectItem value="none">Sem liga</SelectItem>}
                  {ligas.map((liga) => (
                    <SelectItem key={liga.id} value={liga.id}>
                      {liga.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Nome do formulário *
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Processo Seletivo 2026.1"
              className="w-full px-3 py-2.5 border border-border bg-muted/50 text-[13px] rounded placeholder:text-foreground/20"
            />
          </div>

          <div>
            <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o formulário..."
              rows={3}
              className="w-full px-3 py-2.5 border border-border bg-muted/50 text-[13px] rounded placeholder:text-foreground/20 resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (!nome) {
                  toast.error("Nome é obrigatório.");
                  return;
                }
                if (tipo === "processo_seletivo" && !ligaId) {
                  toast.error("Processo Seletivo requer uma liga.");
                  return;
                }
                setEtapa(2);
              }}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors flex items-center gap-1.5"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2 — Campos */}
      {etapa === 2 && (
        <div className="space-y-5 max-w-2xl">
          {scoringEnabled && campos.some((c) => c.tipo !== "texto") && (
            <div
              className={`text-[12px] p-3 border ${
                somaPesos === 100
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              Soma dos pesos: {somaPesos}/100
              {somaPesos !== 100 && " — deve totalizar exatamente 100%"}
            </div>
          )}

          <div className="space-y-4">
            {campos.map((campo, index) => (
              <div key={index} className="border border-navy/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-navy/30 dark:text-white/50 flex-shrink-0" />
                  <Badge className="text-[10px] bg-brand-gray text-navy dark:bg-white/10 dark:text-white/70 px-2 py-0.5">
                    {CAMPO_LABELS[campo.tipo]}
                  </Badge>
                  <button
                    onClick={() => removerCampo(index)}
                    className="ml-auto text-navy/30 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  value={campo.titulo}
                  onChange={(e) => atualizarCampo(index, { titulo: e.target.value })}
                  placeholder="Digite a pergunta..."
                  className="w-full px-3 py-2.5 border border-border bg-muted/50 text-[13px] rounded"
                />

                {campo.tipo === "multipla_escolha" && (
                  <div className="space-y-2">
                    <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40">
                      Opções
                    </label>
                    {(campo.opcoes ?? []).map((opcao, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        {scoringEnabled && (
                          <input
                            type="checkbox"
                            checked={(campo.opcoes_eliminatorias ?? []).includes(opcao)}
                            onChange={() => toggleOpcaoEliminatoria(index, opcao)}
                            className="accent-red-500"
                            title="Marcar como eliminatória"
                          />
                        )}
                        <input
                          value={opcao}
                          onChange={(e) => atualizarOpcao(index, oi, e.target.value)}
                          placeholder={`Opção ${oi + 1}`}
                          className="w-full px-3 py-2 border border-border bg-muted/50 text-[12px] rounded"
                        />
                      </div>
                    ))}
                    {scoringEnabled && (
                      <p className="text-[10px] text-navy/40">☑ marcado = opção eliminatória</p>
                    )}
                    <button
                      onClick={() => adicionarOpcao(index)}
                      className="text-[11px] text-navy/50 hover:text-navy transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar opção
                    </button>
                  </div>
                )}

                {scoringEnabled && campo.tipo === "nota_1_10" && (
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
                        Nota mínima
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={campo.nota_minima ?? 5}
                        onChange={(e) =>
                          atualizarCampo(index, { nota_minima: Number(e.target.value) })
                        }
                        className="w-20 px-3 py-2 border border-border bg-muted/50 text-[12px] rounded"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        checked={campo.eliminatoria}
                        onChange={(e) => atualizarCampo(index, { eliminatoria: e.target.checked })}
                        className="accent-red-500"
                      />
                      <label className="text-[11px] text-foreground/60">Eliminatória</label>
                    </div>
                  </div>
                )}

                {scoringEnabled && campo.tipo === "sim_nao" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={campo.eliminatoria}
                      onChange={(e) => atualizarCampo(index, { eliminatoria: e.target.checked })}
                      className="accent-red-500"
                    />
                    <label className="text-[11px] text-foreground/60">
                      {`Eliminatória se responder "Não"`}
                    </label>
                  </div>
                )}

                {scoringEnabled && campo.tipo !== "texto" && (
                  <div>
                    <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
                      Peso na pontuação: {campo.peso}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={campo.peso}
                      onChange={(e) => atualizarCampo(index, { peso: Number(e.target.value) })}
                      className="w-full accent-navy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border border-dashed border-navy/20 dark:border-white/40 p-4">
            <p className="text-[11px] text-navy/50 mb-3 font-medium">Adicionar campo</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CAMPO_LABELS) as [CampoTipo, string][]).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => adicionarCampo(t)}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/60 border border-foreground/30 px-3 py-1.5 rounded-full hover:text-foreground hover:border-foreground/50 transition-colors"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa(1)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <button
              onClick={() => {
                if (campos.length === 0) {
                  toast.error("Adicione pelo menos um campo.");
                  return;
                }
                setEtapa(3);
              }}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors flex items-center gap-1.5"
            >
              Próximo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3 — Revisão */}
      {etapa === 3 && (
        <div className="space-y-6 max-w-2xl">
          <div className="border border-navy/15 p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-navy">Informações</h3>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <span className="text-navy/50">Tipo:</span>{" "}
                <span className="text-navy font-medium">{TIPO_LABELS[tipo]}</span>
              </div>
              <div>
                <span className="text-navy/50">Scoring:</span>{" "}
                <span className="text-navy font-medium">{scoringEnabled ? "Sim" : "Não"}</span>
              </div>
              <div>
                <span className="text-navy/50">Nome:</span>{" "}
                <span className="text-navy font-medium">{nome}</span>
              </div>
              {scoringEnabled && (
                <div>
                  <span className="text-navy/50">Mínima:</span>{" "}
                  <span className="text-navy font-medium">{pontuacaoMinima}/100</span>
                </div>
              )}
              {descricao && (
                <div className="col-span-2">
                  <span className="text-navy/50">Descrição:</span>{" "}
                  <span className="text-navy">{descricao}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border border-navy/15 p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-navy">
              Campos ({campos.length})
            </h3>
            <div className="space-y-2">
              {campos.map((c, i) => (
                <div key={i} className="flex items-start gap-3 text-[13px]">
                  <span className="text-navy/40 w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="text-navy">{c.titulo || "(sem título)"}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="text-[10px] bg-brand-gray text-navy dark:bg-white/10 dark:text-white/70 px-1.5 py-0">
                        {CAMPO_LABELS[c.tipo]}
                      </Badge>
                      {scoringEnabled && c.peso > 0 && (
                        <span className="text-[10px] text-navy/40">{c.peso}%</span>
                      )}
                      {scoringEnabled && c.eliminatoria && (
                        <span className="text-[10px] text-red-500">eliminatória</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa(2)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => criarFormulario(false)}
                disabled={salvando}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground transition-colors disabled:opacity-40"
              >
                {salvando ? "Criando..." : "Salvar como rascunho"}
              </button>
              <button
                onClick={() => criarFormulario(true)}
                disabled={salvando}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors disabled:opacity-40"
              >
                {salvando ? "Criando..." : "Criar e publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
