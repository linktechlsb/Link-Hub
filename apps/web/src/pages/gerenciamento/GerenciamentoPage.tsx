import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { GerenciamentoStaffPage } from "./GerenciamentoStaffPage";
import {
  Check,
  X,
  Pencil,
  Trash2,
  Plus,
  Link,
  FileText,
  Image,
  Globe,
} from "lucide-react";

// ─── tipos ────────────────────────────────────────────────────────────────────

type Cargo = "Membro" | "Diretor";

interface ConvitePendente {
  id: string;
  email: string;
  cargo: Cargo;
  diasAtras: number;
}

interface MembroAtivo {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  iniciais: string;
  cor: string;
  novo?: boolean;
}

interface Recurso {
  id: string;
  nome: string;
  tipo: string;
  url: string;
}

interface InfoLiga {
  nome: string;
  area: string;
  descricao: string;
  semestre: string;
  emailContato: string;
  instagram: string;
  linkedin: string;
  bannerUrl: string;
}

// ─── mock ─────────────────────────────────────────────────────────────────────

const CORES = ["#10284E", "#546484", "#FEC641", "#6366f1", "#14b8a6", "#f97316"];

const MOCK_CONVITES: ConvitePendente[] = [
  { id: "c1", email: "marcos.silva@faculdade.edu", cargo: "Membro", diasAtras: 2 },
  { id: "c2", email: "julia.ramos@faculdade.edu", cargo: "Membro", diasAtras: 5 },
];

const MOCK_MEMBROS: MembroAtivo[] = [
  { id: "m1", nome: "Ana Lima", email: "ana.lima@faculdade.edu", cargo: "Diretor", iniciais: "AL", cor: CORES[0] },
  { id: "m2", nome: "Carlos Mota", email: "carlos.mota@faculdade.edu", cargo: "Membro", iniciais: "CM", cor: CORES[1] },
  { id: "m3", nome: "Julia Ramos", email: "julia.r@faculdade.edu", cargo: "Membro", iniciais: "JR", cor: CORES[2] },
  { id: "m4", nome: "Pedro Alves", email: "pedro.alves@faculdade.edu", cargo: "Membro", iniciais: "PA", cor: CORES[3] },
  { id: "m5", nome: "Marina Santos", email: "marina.s@faculdade.edu", cargo: "Membro", iniciais: "MS", cor: CORES[4], novo: true },
];

const MOCK_RECURSOS: Recurso[] = [
  { id: "r1", nome: "Notion da Liga", tipo: "Documento", url: "https://notion.so" },
  { id: "r2", nome: "Google Drive", tipo: "Armazenamento", url: "https://drive.google.com" },
  { id: "r3", nome: "Figma", tipo: "Design", url: "https://figma.com" },
];

const MOCK_INFO: InfoLiga = {
  nome: "Liga Tech",
  area: "Tecnologia e Inovação",
  descricao: "Liga acadêmica voltada para o desenvolvimento de habilidades técnicas e projetos de impacto.",
  semestre: "2023.1",
  emailContato: "liga.tech@faculdade.edu",
  instagram: "@ligatech",
  linkedin: "liga-tech-faculdade",
  bannerUrl: "",
};

const MOCK_PROFESSOR_MENTOR = "Prof. Dr. Ricardo Oliveira";

// ─── helpers ──────────────────────────────────────────────────────────────────

function cargoBadgeClass(cargo: Cargo) {
  if (cargo === "Diretor") return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-600";
}

function recursoIcone(tipo: string) {
  const t = tipo.toLowerCase();
  if (t.includes("design")) return <Image className="h-4 w-4 text-white" />;
  if (t.includes("doc")) return <FileText className="h-4 w-4 text-white" />;
  if (t.includes("armazen")) return <Globe className="h-4 w-4 text-white" />;
  return <Link className="h-4 w-4 text-white" />;
}

function inicialCor(nome: string): string {
  const idx = nome.charCodeAt(0) % CORES.length;
  return CORES[idx];
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

// ─── sub-componentes de aba ───────────────────────────────────────────────────

// ── Membros ──
function AbaMembros() {
  const [convites, setConvites] = useState<ConvitePendente[]>(MOCK_CONVITES);
  const [membros, setMembros] = useState<MembroAtivo[]>(MOCK_MEMBROS);
  const [emailConvite, setEmailConvite] = useState("");
  const [cargoConvite, setCargoConvite] = useState<Cargo>("Membro");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoCargoEdit, setNovoCargoEdit] = useState<Cargo>("Membro");
  const [confirmandoRemoverId, setConfirmandoRemoverId] = useState<string | null>(null);

  function convidar() {
    if (!emailConvite.trim()) return;
    const novo: ConvitePendente = {
      id: crypto.randomUUID(),
      email: emailConvite.trim(),
      cargo: cargoConvite,
      diasAtras: 0,
    };
    setConvites((prev) => [...prev, novo]);
    setEmailConvite("");
  }

  function cancelarConvite(id: string) {
    setConvites((prev) => prev.filter((c) => c.id !== id));
  }

  function iniciarEdicao(membro: MembroAtivo) {
    setEditandoId(membro.id);
    setNovoCargoEdit(membro.cargo);
  }

  function salvarEdicao(id: string) {
    setMembros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, cargo: novoCargoEdit } : m))
    );
    setEditandoId(null);
  }

  function remover(id: string) {
    setMembros((prev) => prev.filter((m) => m.id !== id));
    setConfirmandoRemoverId(null);
  }

  const diretor = membros.find((m) => m.cargo === "Diretor");

  return (
    <div className="space-y-8">
      {/* Convidar */}
      <section className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Convidar Novo Membro
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="E-mail institucional..."
            value={emailConvite}
            onChange={(e) => setEmailConvite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && convidar()}
            className="flex-1 border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <select
            value={cargoConvite}
            onChange={(e) => setCargoConvite(e.target.value as Cargo)}
            className="border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
          >
            <option>Membro</option>
            <option>Diretor</option>
          </select>
          <button
            onClick={convidar}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Convidar
          </button>
        </div>
      </section>

      {/* Pendentes */}
      {convites.length > 0 && (
        <section className="bg-white border border-brand-gray rounded-xl p-5">
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Pendentes ({convites.length})
          </p>
          <div className="divide-y divide-brand-gray">
            {convites.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-gray flex items-center justify-center text-link-blue font-bold text-sm">
                    ?
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{c.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.diasAtras === 0 ? "Enviado agora" : `Enviado há ${c.diasAtras} dia${c.diasAtras > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", cargoBadgeClass(c.cargo))}>
                    {c.cargo}
                  </span>
                  <button
                    onClick={() => cancelarConvite(c.id)}
                    className="text-xs border border-red-300 text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Membros ativos */}
      <section className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Membros Ativos ({membros.length})
        </p>
        <div className="divide-y divide-brand-gray">
          {membros.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: m.cor }}
                >
                  {m.iniciais}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-navy">{m.nome}</p>
                    {m.novo && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                        Novo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editandoId === m.id ? (
                  <>
                    <select
                      value={novoCargoEdit}
                      onChange={(e) => setNovoCargoEdit(e.target.value as Cargo)}
                      className="border border-brand-gray rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy/20 bg-white"
                    >
                      <option>Membro</option>
                      <option>Diretor</option>
                    </select>
                    <button
                      onClick={() => salvarEdicao(m.id)}
                      className="text-green-600 hover:bg-green-50 p-1.5 rounded-md transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-gray-400 hover:bg-gray-50 p-1.5 rounded-md transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", cargoBadgeClass(m.cargo))}>
                      {m.cargo}
                    </span>
                    <button
                      onClick={() => iniciarEdicao(m)}
                      className="text-xs border border-brand-gray text-link-blue hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors"
                    >
                      Editar cargo
                    </button>
                    {m.id !== diretor?.id && (
                      confirmandoRemoverId === m.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-500">Confirmar?</span>
                          <button
                            onClick={() => remover(m.id)}
                            className="text-xs bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmandoRemoverId(null)}
                            className="text-xs border border-gray-300 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmandoRemoverId(m.id)}
                          className="text-xs border border-red-300 text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                        >
                          Remover
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Informações ──
function AbaInformacoes() {
  const [original] = useState<InfoLiga>(MOCK_INFO);
  const [form, setForm] = useState<InfoLiga>(MOCK_INFO);
  const [salvo, setSalvo] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string>(MOCK_INFO.bannerUrl);

  const alterado = JSON.stringify(form) !== JSON.stringify(original) || bannerPreview !== original.bannerUrl;

  function salvar() {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBannerPreview(url);
    setForm((prev) => ({ ...prev, bannerUrl: url }));
  }

  const inputClass = "w-full border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20";

  return (
    <div className="space-y-4">
      {/* Dados gerais */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
          Dados Gerais
        </p>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Nome da liga</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Área de atuação</label>
          <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            rows={3}
            className={cn(inputClass, "resize-none")}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Semestre de fundação</label>
          <input value={form.semestre} onChange={(e) => setForm({ ...form, semestre: e.target.value })} placeholder="ex: 2023.1" className={inputClass} />
        </div>
      </div>

      {/* Foto / Banner */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
          Foto / Banner da Liga
        </p>
        {bannerPreview ? (
          <div className="relative rounded-lg overflow-hidden border border-brand-gray h-36">
            <img src={bannerPreview} alt="Banner da liga" className="w-full h-full object-cover" />
            <button
              onClick={() => { setBannerPreview(""); setForm((prev) => ({ ...prev, bannerUrl: "" })); }}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 rounded-full p-1 transition-colors"
              title="Remover imagem"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-brand-gray rounded-lg h-36 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Image className="h-6 w-6" />
            <span className="text-xs">Nenhuma imagem selecionada</span>
          </div>
        )}
        <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-brand-gray text-navy text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
          <Plus className="h-3.5 w-3.5" />
          {bannerPreview ? "Trocar imagem" : "Selecionar imagem"}
          <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </label>
      </div>

      {/* Contatos */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
          Contatos da Liga
        </p>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">E-mail de contato</label>
          <input
            type="email"
            value={form.emailContato}
            onChange={(e) => setForm({ ...form, emailContato: e.target.value })}
            placeholder="contato@faculdade.edu"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">Instagram</label>
          <input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@ligatech"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy mb-1 block">LinkedIn</label>
          <input
            value={form.linkedin}
            onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
            placeholder="liga-tech-faculdade"
            className={inputClass}
          />
        </div>
      </div>

      {/* Professor mentor */}
      <div className="bg-white border border-brand-gray rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
          Professor Mentor
        </p>
        <input
          value={MOCK_PROFESSOR_MENTOR}
          readOnly
          className="w-full border border-brand-gray rounded-lg px-3 py-2 text-sm bg-gray-50 text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">
          Para trocar o professor mentor, entre em contato com o Staff.
        </p>
      </div>

      {/* Botão salvar */}
      {alterado && (
        <div className="flex items-center gap-3">
          <button
            onClick={salvar}
            className="bg-navy hover:bg-navy/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Salvar alterações
          </button>
          {salvo && <span className="text-sm text-green-600">Salvo com sucesso!</span>}
        </div>
      )}
    </div>
  );
}

// ── Recursos ──
function AbaRecursos() {
  const [recursos, setRecursos] = useState<Recurso[]>(MOCK_RECURSOS);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("Documento");
  const [novoUrl, setNovoUrl] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Recurso>>({});

  function adicionar() {
    if (!novoNome.trim() || !novoUrl.trim()) return;
    const novo: Recurso = {
      id: crypto.randomUUID(),
      nome: novoNome.trim(),
      tipo: novoTipo,
      url: novoUrl.trim(),
    };
    setRecursos((prev) => [...prev, novo]);
    setNovoNome("");
    setNovoUrl("");
  }

  function remover(id: string) {
    setRecursos((prev) => prev.filter((r) => r.id !== id));
  }

  function iniciarEdicao(r: Recurso) {
    setEditandoId(r.id);
    setEditForm({ nome: r.nome, tipo: r.tipo, url: r.url });
  }

  function salvarEdicao(id: string) {
    setRecursos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...editForm } as Recurso : r))
    );
    setEditandoId(null);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Recursos ({recursos.length})
        </p>
        <div className="divide-y divide-brand-gray">
          {recursos.map((r) => (
            <div key={r.id} className="py-3">
              {editandoId === r.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editForm.nome ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    placeholder="Nome"
                    className="border border-brand-gray rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <div className="flex gap-2">
                    <input
                      value={editForm.url ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      placeholder="URL"
                      className="flex-1 border border-brand-gray rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                    <select
                      value={editForm.tipo ?? "Documento"}
                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                      className="border border-brand-gray rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      <option>Documento</option>
                      <option>Armazenamento</option>
                      <option>Design</option>
                      <option>Link</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => salvarEdicao(r.id)}
                      className="bg-navy text-white text-xs px-3 py-1.5 rounded-lg hover:bg-navy/90 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="border border-brand-gray text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: inicialCor(r.nome) }}
                    >
                      {recursoIcone(r.tipo)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">{r.tipo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => iniciarEdicao(r)}
                      className="text-link-blue hover:bg-gray-50 p-1.5 rounded-md transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remover(r.id)}
                      className="text-red-400 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar novo recurso */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Adicionar Recurso
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do recurso"
            className="flex-1 min-w-[140px] border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <input
            value={novoUrl}
            onChange={(e) => setNovoUrl(e.target.value)}
            placeholder="URL"
            className="flex-1 min-w-[160px] border border-brand-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <select
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            className="border border-brand-gray rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            <option>Documento</option>
            <option>Armazenamento</option>
            <option>Design</option>
            <option>Link</option>
          </select>
          <button
            onClick={adicionar}
            className="flex items-center gap-1.5 bg-navy hover:bg-navy/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Desempenho ──
function AbaDesempenho() {
  const score = 840;
  const scoreMax = 1000;
  const porcentagem = Math.round((score / scoreMax) * 100);

  const resumo = [
    { label: "Projetos concluídos", valor: "4", cor: "text-green-600" },
    { label: "Em andamento", valor: "2", cor: "text-blue-600" },
    { label: "Receita total", valor: "R$ 3.200", cor: "text-amber-600" },
    { label: "Frequência média", valor: "87%", cor: "text-purple-600" },
    { label: "Membros ativos", valor: "5", cor: "text-navy" },
  ];

  const composicao = [
    { label: "Projetos", formula: "4 projetos × 50 pts", valor: 200, cor: "bg-green-500" },
    { label: "Presenças", formula: "32 presenças × 10 pts", valor: 320, cor: "bg-blue-500" },
    { label: "Receita", formula: "R$ 3.200 × 0,015 pts", valor: 48, cor: "bg-amber-500" },
    { label: "Feed", formula: "54 publicações × 5 pts", valor: 272, cor: "bg-purple-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Score e ranking */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-4">
          Score Atual
        </p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="font-display font-bold text-4xl text-navy">{score}</span>
            <span className="text-lg text-muted-foreground ml-1">pts</span>
          </div>
          <div className="text-right">
            <span className="bg-brand-yellow text-navy text-xs font-bold px-2.5 py-1 rounded-full">
              🏆 1º lugar
            </span>
          </div>
        </div>
        <div className="w-full bg-brand-gray rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${porcentagem}%`,
              background: "linear-gradient(90deg, #10284E, #546484)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span>0 pts</span>
          <span>{porcentagem}% do máximo</span>
          <span>{scoreMax} pts</span>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Resumo
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {resumo.map((r) => (
            <div key={r.label} className="bg-gray-50 rounded-lg p-3">
              <p className={cn("font-display font-bold text-xl", r.cor)}>{r.valor}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Composição do score */}
      <div className="bg-white border border-brand-gray rounded-xl p-5">
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Composição do Score
        </p>
        <div className="space-y-3">
          {composicao.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-semibold text-navy">{c.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{c.formula}</span>
                </div>
                <span className="text-sm font-bold text-navy">{c.valor} pts</span>
              </div>
              <div className="w-full bg-brand-gray rounded-full h-2 overflow-hidden">
                <div
                  className={cn("h-2 rounded-full", c.cor)}
                  style={{ width: `${Math.round((c.valor / score) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

type Aba = "Membros" | "Informações" | "Recursos" | "Desempenho";

const ABAS: Aba[] = ["Membros", "Informações", "Recursos", "Desempenho"];

export function GerenciamentoPage() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("Membros");
  const [ligaNome, setLigaNome] = useState("Liga Tech");
  const [diretorNome, setDiretorNome] = useState("Ana Lima");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        const token = await getToken();
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        // detecta role via tabela usuarios (mesmo padrão do AppLayout)
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user.email;
        if (email) {
          const { data: usuario } = await supabase
            .from("usuarios")
            .select("role")
            .eq("email", email)
            .single();
          if (usuario?.role) setRole(usuario.role as string);
        }

        const res = await fetch("/api/ligas/minha", { headers });
        if (res.ok) {
          const liga = await res.json();
          if (liga?.nome) setLigaNome(liga.nome);
          if (liga?.lider_nome) setDiretorNome(liga.lider_nome);
        }
      } catch {
        // fallback nos dados mockados
      }
    }
    carregarDados();
  }, []);

  // perfil Staff (admin) → página própria com todas as ligas
  if (role === "admin") return <GerenciamentoStaffPage />;

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Gerenciamento</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ligaNome} · Diretor: {diretorNome}
        </p>
      </div>

      {/* Abas */}
      <div className="border-b border-brand-gray mb-6">
        <div className="flex gap-1">
          {ABAS.map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                abaAtiva === aba
                  ? "border-[#7C3AED] text-[#7C3AED]"
                  : "border-transparent text-muted-foreground hover:text-navy"
              )}
            >
              {aba}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da aba */}
      {abaAtiva === "Membros" && <AbaMembros />}
      {abaAtiva === "Informações" && <AbaInformacoes />}
      {abaAtiva === "Recursos" && <AbaRecursos />}
      {abaAtiva === "Desempenho" && <AbaDesempenho />}
    </div>
  );
}
