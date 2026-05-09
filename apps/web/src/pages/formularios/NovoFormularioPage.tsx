import { ArrowLeft, ArrowRight, Check, Copy, GripVertical, Info, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";

import type {
  CreatePerguntaInput,
  CreateFormularioInput,
  PerguntaTipo,
  FormularioComPerguntas,
  TemaFormulario,
} from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

interface LigaOpcao {
  id: string;
  nome: string;
}

const TIPO_LABELS: Record<PerguntaTipo, string> = {
  texto: "Texto livre",
  multipla_escolha: "Múltipla escolha",
  nota_1_10: "Nota (1–10)",
  sim_nao: "Sim / Não",
};

const ETAPA_LABELS = ["Informações", "Perguntas", "Personalização", "Revisão"];

const TEMA_DEFAULT: TemaFormulario = {
  cor_fundo: "#10284E",
  cor_pergunta: "#FFFFFF",
  cor_botao: "#FEC641",
};

function TypeformMockup({ tema }: { tema: TemaFormulario }) {
  const bgStyle: React.CSSProperties = tema.imagem_fundo_url
    ? {
        backgroundImage: `url(${tema.imagem_fundo_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: tema.cor_fundo };

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg w-full max-w-[280px] mx-auto select-none"
      style={bgStyle}
    >
      {tema.logo_url && (
        <div className="flex items-center justify-center pt-5 pb-2">
          <img
            src={tema.logo_url}
            alt="Logo"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      <div className="px-6 py-8 space-y-4">
        <p className="text-[13px] font-semibold leading-snug" style={{ color: tema.cor_pergunta }}>
          Como você soube sobre nossa liga?
        </p>

        <div className="space-y-2">
          {["Redes sociais", "Indicação", "Site da faculdade"].map((opt) => (
            <div
              key={opt}
              className="border rounded px-3 py-2 text-[11px]"
              style={{ borderColor: `${tema.cor_pergunta}40`, color: tema.cor_pergunta }}
            >
              {opt}
            </div>
          ))}
        </div>

        <button
          className="mt-4 px-4 py-2 rounded text-[11px] font-bold w-full"
          style={{ backgroundColor: tema.cor_botao, color: tema.cor_fundo }}
        >
          OK →
        </button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-navy/20 cursor-pointer p-0.5 bg-white"
      />
      <div className="flex-1">
        <Label className="text-[11px] font-medium text-navy mb-0.5 block">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-navy/20 text-[12px] h-7 font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function ImageUrlField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (url: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-medium text-navy block">{label} (opcional)</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="border-navy/20 text-[12px]"
      />
      {value && (
        <div className="flex items-center gap-2">
          <img
            src={value}
            alt=""
            className="h-8 w-8 object-cover rounded border border-navy/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            onClick={() => onChange("")}
            className="text-[10px] text-navy/40 hover:text-red-500 transition-colors"
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

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

  // Etapa 1
  const [ligaId, setLigaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  // Etapa 2
  const [perguntas, setPerguntas] = useState<CreatePerguntaInput[]>([]);
  const [somaPesos, setSomaPesos] = useState(0);

  // Etapa 3
  const [tema, setTema] = useState<TemaFormulario>({ ...TEMA_DEFAULT });

  useEffect(() => {
    if (role === "diretor") {
      carregarMinhaLiga();
    } else if (role === "staff") {
      void carregarLigas();
    }
  }, [role]);

  useEffect(() => {
    const soma = perguntas.reduce((acc, p) => acc + (p.peso || 0), 0);
    setSomaPesos(soma);
  }, [perguntas]);

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
      const res = await fetch("/api/ligas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      setLigas(dados.map((l: { id: string; nome: string }) => ({ id: l.id, nome: l.nome })));
    } catch {
      toast.error("Erro ao carregar ligas");
    }
  }

  function atualizarTema(parcial: Partial<TemaFormulario>) {
    setTema((prev) => ({ ...prev, ...parcial }));
  }

  function adicionarPergunta(tipo: PerguntaTipo) {
    const novaPergunta: CreatePerguntaInput = {
      titulo: "",
      tipo,
      peso: 0,
      eliminatoria: false,
      nota_minima: tipo === "nota_1_10" ? 5 : undefined,
      opcoes: tipo === "multipla_escolha" ? ["", ""] : undefined,
      opcoes_eliminatorias: tipo === "multipla_escolha" ? [] : undefined,
      ordem: perguntas.length,
    };
    setPerguntas([...perguntas, novaPergunta]);
  }

  function atualizarPergunta(index: number, dados: Partial<CreatePerguntaInput>) {
    setPerguntas((prev) =>
      prev.map((p, i): CreatePerguntaInput => {
        if (i !== index) return p;
        return {
          titulo: dados.titulo ?? p.titulo,
          tipo: dados.tipo ?? p.tipo,
          peso: dados.peso ?? p.peso,
          eliminatoria: dados.eliminatoria !== undefined ? dados.eliminatoria : p.eliminatoria,
          nota_minima: dados.nota_minima !== undefined ? dados.nota_minima : p.nota_minima,
          opcoes: dados.opcoes !== undefined ? dados.opcoes : p.opcoes,
          opcoes_eliminatorias:
            dados.opcoes_eliminatorias !== undefined
              ? dados.opcoes_eliminatorias
              : p.opcoes_eliminatorias,
          ordem: dados.ordem ?? p.ordem,
        };
      }),
    );
  }

  function removerPergunta(index: number) {
    setPerguntas((prev) =>
      prev.filter((_, i) => i !== index).map((p, i): CreatePerguntaInput => ({ ...p, ordem: i })),
    );
  }

  function atualizarOpcao(perguntaIndex: number, opcaoIndex: number, valor: string) {
    setPerguntas((prev) =>
      prev.map((p, i): CreatePerguntaInput => {
        if (i !== perguntaIndex) return p;
        const opcoes = [...(p.opcoes ?? [])];
        opcoes[opcaoIndex] = valor;
        return { ...p, opcoes };
      }),
    );
  }

  function adicionarOpcao(perguntaIndex: number) {
    setPerguntas((prev) =>
      prev.map((p, i): CreatePerguntaInput => {
        if (i !== perguntaIndex) return p;
        return { ...p, opcoes: [...(p.opcoes ?? []), ""] };
      }),
    );
  }

  function toggleOpcaoEliminatoria(perguntaIndex: number, opcao: string) {
    setPerguntas((prev) =>
      prev.map((p, i): CreatePerguntaInput => {
        if (i !== perguntaIndex) return p;
        const eliminatorias = p.opcoes_eliminatorias ?? [];
        const jaEsta = eliminatorias.includes(opcao);
        return {
          ...p,
          opcoes_eliminatorias: jaEsta
            ? eliminatorias.filter((o) => o !== opcao)
            : [...eliminatorias, opcao],
        };
      }),
    );
  }

  async function criarFormulario(publicar: boolean) {
    if (!ligaId || !nome || perguntas.length === 0) {
      toast.error("Preencha todas as informações obrigatórias.");
      return;
    }

    const perguntasComPeso = perguntas.filter((p) => p.tipo !== "texto");
    if (perguntasComPeso.length > 0 && somaPesos !== 100) {
      toast.error(`A soma dos pesos deve ser exatamente 100. Atual: ${somaPesos}.`);
      return;
    }

    try {
      setSalvando(true);
      const token = await getToken();
      const payload: CreateFormularioInput = {
        liga_id: ligaId,
        nome,
        descricao: descricao || undefined,
        perguntas,
        tema,
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

      const formulario = (await res.json()) as FormularioComPerguntas;
      setFormularioId(formulario.id);

      if (publicar) {
        await fetch(`/api/formularios/${formulario.id}/publicar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setLinkCriado(formulario.google_form_url ?? null);
      setEtapa(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar formulário");
    } finally {
      setSalvando(false);
    }
  }

  if (etapa === 5 && linkCriado) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="text-center py-12 border border-navy/15">
          <Check className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="font-display font-bold text-[20px] text-navy mb-2">
            Formulário criado com sucesso!
          </h2>
          <p className="text-[13px] text-navy/60 mb-6">
            Compartilhe o link abaixo com os candidatos.
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
                Ver resultados
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
                    ${ativa ? "bg-navy text-white" : concluida ? "bg-navy/20 text-navy" : "bg-brand-gray text-navy/40"}`}
                >
                  {concluida ? <Check className="w-3 h-3" /> : num}
                </div>
                <span className={`text-[12px] font-medium ${ativa ? "text-navy" : "text-navy/40"}`}>
                  {label}
                </span>
              </div>
              {i < ETAPA_LABELS.length - 1 && <div className="w-8 h-px bg-navy/15 mx-3" />}
            </div>
          );
        })}
      </div>

      {/* Etapa 1 — Informações */}
      {etapa === 1 && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <Label className="text-[12px] font-medium text-navy mb-1.5 block">Liga *</Label>
            {role === "diretor" ? (
              carregandoLiga ? (
                <p className="text-[13px] text-navy/40">Carregando...</p>
              ) : (
                <div className="border border-navy/20 px-3 py-2 bg-navy/5">
                  <p className="text-[13px] text-navy font-medium">
                    {ligaFixa?.nome ?? "Sua liga"}
                  </p>
                </div>
              )
            ) : (
              <Select value={ligaId} onValueChange={setLigaId}>
                <SelectTrigger className="border-navy/20 text-navy">
                  <SelectValue placeholder="Selecione a liga" />
                </SelectTrigger>
                <SelectContent>
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
            <Label className="text-[12px] font-medium text-navy mb-1.5 block">
              Nome do formulário *
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Processo Seletivo 2026.1"
              className="border-navy/20"
            />
          </div>

          <div>
            <Label className="text-[12px] font-medium text-navy mb-1.5 block">Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o formulário..."
              className="border-navy/20 resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (!ligaId || !nome) {
                  toast.error("Liga e nome são obrigatórios.");
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

      {/* Etapa 2 — Perguntas */}
      {etapa === 2 && (
        <div className="space-y-5 max-w-2xl">
          {perguntas.some((p) => p.tipo !== "texto") && (
            <div
              className={`text-[12px] p-3 border ${somaPesos === 100 ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
            >
              Soma dos pesos: {somaPesos}/100
              {somaPesos !== 100 && " — deve totalizar exatamente 100%"}
            </div>
          )}

          <div className="space-y-4">
            {perguntas.map((pergunta, index) => (
              <div key={index} className="border border-navy/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-navy/30 flex-shrink-0" />
                  <Badge className="text-[10px] bg-brand-gray text-navy px-2 py-0.5 flex-shrink-0">
                    {TIPO_LABELS[pergunta.tipo]}
                  </Badge>
                  <button
                    onClick={() => removerPergunta(index)}
                    className="ml-auto text-navy/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <Label className="text-[11px] text-navy/50 mb-1 block">Pergunta *</Label>
                  <Input
                    value={pergunta.titulo}
                    onChange={(e) => atualizarPergunta(index, { titulo: e.target.value })}
                    placeholder="Digite a pergunta..."
                    className="border-navy/20 text-[13px]"
                  />
                </div>

                {pergunta.tipo === "multipla_escolha" && (
                  <div className="space-y-2">
                    <Label className="text-[11px] text-navy/50 block">Opções</Label>
                    {(pergunta.opcoes ?? []).map((opcao, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(pergunta.opcoes_eliminatorias ?? []).includes(opcao)}
                          onChange={() => toggleOpcaoEliminatoria(index, opcao)}
                          className="accent-red-500 flex-shrink-0"
                          title="Marcar como eliminatória"
                        />
                        <Input
                          value={opcao}
                          onChange={(e) => atualizarOpcao(index, oi, e.target.value)}
                          placeholder={`Opção ${oi + 1}`}
                          className="border-navy/20 text-[12px]"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-navy/40">☑ marcado = opção eliminatória</p>
                    <button
                      onClick={() => adicionarOpcao(index)}
                      className="text-[11px] text-navy/50 hover:text-navy transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar opção
                    </button>
                  </div>
                )}

                {pergunta.tipo === "nota_1_10" && (
                  <div className="flex items-center gap-4">
                    <div>
                      <Label className="text-[11px] text-navy/50 mb-1 block">Nota mínima</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={pergunta.nota_minima ?? 5}
                        onChange={(e) =>
                          atualizarPergunta(index, { nota_minima: Number(e.target.value) })
                        }
                        className="border-navy/20 w-20 text-[12px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        id={`elim-${index}`}
                        checked={pergunta.eliminatoria}
                        onChange={(e) =>
                          atualizarPergunta(index, { eliminatoria: e.target.checked })
                        }
                        className="accent-red-500"
                      />
                      <Label htmlFor={`elim-${index}`} className="text-[11px] text-navy/60">
                        Eliminatória
                      </Label>
                    </div>
                  </div>
                )}

                {pergunta.tipo === "sim_nao" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`elim-sn-${index}`}
                      checked={pergunta.eliminatoria}
                      onChange={(e) => atualizarPergunta(index, { eliminatoria: e.target.checked })}
                      className="accent-red-500"
                    />
                    <Label htmlFor={`elim-sn-${index}`} className="text-[11px] text-navy/60">
                      {`Eliminatória se responder "Não"`}
                    </Label>
                  </div>
                )}

                {pergunta.tipo !== "texto" && (
                  <div>
                    <Label className="text-[11px] text-navy/50 mb-1 block">
                      Peso na pontuação: {pergunta.peso}%
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pergunta.peso}
                      onChange={(e) => atualizarPergunta(index, { peso: Number(e.target.value) })}
                      className="w-full accent-navy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border border-dashed border-navy/20 p-4">
            <p className="text-[11px] text-navy/50 mb-3 font-medium">Adicionar pergunta</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TIPO_LABELS) as [PerguntaTipo, string][]).map(([tipo, label]) => (
                <button
                  key={tipo}
                  onClick={() => adicionarPergunta(tipo)}
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
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground hover:border-foreground/40 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <button
              onClick={() => {
                if (perguntas.length === 0) {
                  toast.error("Adicione pelo menos uma pergunta.");
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

      {/* Etapa 3 — Personalização */}
      {etapa === 3 && (
        <div className="flex gap-8">
          {/* Controles */}
          <div className="flex-1 space-y-6 max-w-sm">
            <div>
              <h3 className="font-display font-bold text-[14px] text-navy mb-4">Cores</h3>
              <div className="space-y-4">
                <ColorField
                  label="Cor de fundo"
                  value={tema.cor_fundo}
                  onChange={(v) => atualizarTema({ cor_fundo: v })}
                />
                <ColorField
                  label="Cor das perguntas"
                  value={tema.cor_pergunta}
                  onChange={(v) => atualizarTema({ cor_pergunta: v })}
                />
                <ColorField
                  label="Cor dos botões"
                  value={tema.cor_botao}
                  onChange={(v) => atualizarTema({ cor_botao: v })}
                />
              </div>
            </div>

            <div>
              <h3 className="font-display font-bold text-[14px] text-navy mb-4">Imagens</h3>
              <div className="flex items-start gap-2 p-3 border border-amber-200 bg-amber-50 mb-4">
                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  Logo e imagem de fundo não são aplicadas automaticamente pelo Google Forms API.
                  Após publicar, edite o formulário no Google para adicioná-las manualmente.
                </p>
              </div>
              <div className="space-y-5">
                <ImageUrlField
                  label="Logo"
                  value={tema.logo_url}
                  onChange={(url) => atualizarTema({ logo_url: url || undefined })}
                />
                <ImageUrlField
                  label="Imagem de fundo"
                  value={tema.imagem_fundo_url}
                  onChange={(url) => atualizarTema({ imagem_fundo_url: url || undefined })}
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setEtapa(2)}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground hover:border-foreground/40 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTema({ ...TEMA_DEFAULT });
                    setEtapa(4);
                  }}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/40 hover:text-foreground transition-colors px-2"
                >
                  Pular
                </button>
                <button
                  onClick={() => setEtapa(4)}
                  className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors flex items-center gap-1.5"
                >
                  Próximo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col items-center">
            <p className="text-[11px] text-navy/40 mb-4 font-medium uppercase tracking-wide">
              Preview
            </p>
            <TypeformMockup tema={tema} />
          </div>
        </div>
      )}

      {/* Etapa 4 — Revisão */}
      {etapa === 4 && (
        <div className="space-y-6 max-w-2xl">
          <div className="border border-navy/15 p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-navy">Informações</h3>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <span className="text-navy/50">Nome:</span>{" "}
                <span className="text-navy font-medium">{nome}</span>
              </div>
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
              Perguntas ({perguntas.length})
            </h3>
            <div className="space-y-2">
              {perguntas.map((p, i) => (
                <div key={i} className="flex items-start gap-3 text-[13px]">
                  <span className="text-navy/40 w-5 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <span className="text-navy">{p.titulo || "(sem título)"}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="text-[10px] bg-brand-gray text-navy px-1.5 py-0">
                        {TIPO_LABELS[p.tipo]}
                      </Badge>
                      {p.peso > 0 && <span className="text-[10px] text-navy/40">{p.peso}%</span>}
                      {p.eliminatoria && (
                        <span className="text-[10px] text-red-500">eliminatória</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-navy/15 p-5 space-y-3">
            <h3 className="font-display font-bold text-[15px] text-navy">Personalização</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-full border border-navy/10"
                  style={{ backgroundColor: tema.cor_fundo }}
                  title="Fundo"
                />
                <div
                  className="w-7 h-7 rounded-full border border-navy/10"
                  style={{ backgroundColor: tema.cor_pergunta }}
                  title="Pergunta"
                />
                <div
                  className="w-7 h-7 rounded-full border border-navy/10"
                  style={{ backgroundColor: tema.cor_botao }}
                  title="Botão"
                />
              </div>
              {tema.logo_url && (
                <img
                  src={tema.logo_url}
                  alt="Logo"
                  className="h-7 w-auto object-contain rounded border border-navy/10"
                />
              )}
              {tema.imagem_fundo_url && (
                <img
                  src={tema.imagem_fundo_url}
                  alt="Fundo"
                  className="h-7 w-12 object-cover rounded border border-navy/10"
                />
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setEtapa(3)}
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground hover:border-foreground/40 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => criarFormulario(false)}
                disabled={salvando}
                className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/50 border border-foreground/20 px-3 py-1.5 rounded-full hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
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
