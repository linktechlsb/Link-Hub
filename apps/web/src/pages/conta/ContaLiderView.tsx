import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Eye, EyeOff, Save, Bell, Lock, GraduationCap,
  User, AlertTriangle, X, Camera,
} from "lucide-react";
import { carregarUsuarioMe, salvarPerfilMe, uploadAvatarMe } from "@/lib/conta";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aba = "perfil" | "academico" | "seguranca" | "notificacoes";

type DadosUsuario = {
  nome: string;
  email: string;
  bio: string;
  instagram: string;
  linkedin: string;
  curso: string;
  semestre: string;
  liga: string;
  cargo: string;
};

type Notificacoes = {
  eventos: boolean;
  projetos: boolean;
  ranking: boolean;
  presenca: boolean;
  novosMembros: boolean;
  projetosAguardando: boolean;
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

const LIGA_CORES: Record<string, string> = {
  Tech: "bg-blue-100 text-blue-700",
  Finanças: "bg-emerald-100 text-emerald-700",
  Marketing: "bg-pink-100 text-pink-700",
  RH: "bg-violet-100 text-violet-700",
};

function ligaBadgeClass(liga: string) {
  return LIGA_CORES[liga] ?? "bg-gray-100 text-gray-700";
}

function gerarIniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-link-blue uppercase tracking-wider mb-1">
      {children}
    </label>
  );
}

function Dica({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>;
}

function Campo({
  label,
  dica,
  children,
}: {
  label: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {dica && <Dica>{dica}</Dica>}
    </div>
  );
}

function InputTexto({
  value,
  onChange,
  placeholder,
  readOnly = false,
  maxLength,
  prefix,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  maxLength?: number;
  prefix?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center border border-brand-gray rounded-md overflow-hidden",
        readOnly && "bg-gray-50"
      )}
    >
      {prefix && (
        <span className="px-3 py-2 text-sm text-muted-foreground bg-gray-50 border-r border-brand-gray select-none shrink-0">
          {prefix}
        </span>
      )}
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-navy/20",
          readOnly && "text-muted-foreground cursor-default"
        )}
      />
    </div>
  );
}

function BotaoSalvar({ onClick, label = "Salvar alterações" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-md bg-navy text-white hover:bg-navy/90 transition-colors"
    >
      <Save className="h-4 w-4" />
      {label}
    </button>
  );
}

function Toast({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-navy text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg">
      {mensagem}
      <button onClick={onFechar} className="text-white/70 hover:text-white transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Toggle({ ativo, onToggle }: { ativo: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={ativo}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-navy/30",
        ativo ? "bg-navy" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform",
          ativo ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ─── Aba: Perfil ──────────────────────────────────────────────────────────────

function AbaPerfil({
  dados,
  avatarUrl,
  uploadandoAvatar,
  onChange,
  onSalvar,
  onAvatarChange,
}: {
  dados: DadosUsuario;
  avatarUrl: string | null;
  uploadandoAvatar: boolean;
  onChange: (campo: keyof DadosUsuario, valor: string) => void;
  onSalvar: () => void;
  onAvatarChange: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const iniciais = gerarIniciais(dados.nome);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-navy text-white text-xl font-bold flex items-center justify-center">
              {iniciais}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadandoAvatar ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAvatarChange(file);
            e.target.value = "";
          }}
        />
        <div>
          <p className="text-sm font-bold text-navy">{dados.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Clique na foto para alterar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nome completo">
          <InputTexto value={dados.nome} onChange={(v) => onChange("nome", v)} placeholder="Seu nome completo" />
        </Campo>
        <Campo label="E-mail institucional" dica="Somente leitura">
          <InputTexto value={dados.email} readOnly />
        </Campo>
      </div>

      <Campo label={`Bio — ${dados.bio.length}/160 caracteres`} dica="Aparece no seu perfil da liga">
        <textarea
          value={dados.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Conte um pouco sobre você..."
          className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
        />
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Instagram" dica="Apenas o @usuario">
          <InputTexto value={dados.instagram} onChange={(v) => onChange("instagram", v.replace(/^@+/, ""))} placeholder="usuario" prefix="@" />
        </Campo>
        <Campo label="LinkedIn" dica="Apenas o /in/usuario">
          <InputTexto value={dados.linkedin} onChange={(v) => onChange("linkedin", v.replace(/^\/in\//, ""))} placeholder="usuario" prefix="/in/" />
        </Campo>
      </div>

      <BotaoSalvar onClick={onSalvar} />
    </div>
  );
}

// ─── Aba: Dados Acadêmicos ────────────────────────────────────────────────────

const SEMESTRES = ["1", "2", "3", "4", "5", "6", "7", "8"];

function AbaDadosAcademicos({
  dados,
  onChange,
  onSalvar,
}: {
  dados: DadosUsuario;
  onChange: (campo: keyof DadosUsuario, valor: string) => void;
  onSalvar: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Curso">
          <InputTexto value={dados.curso} onChange={(v) => onChange("curso", v)} placeholder="Ex: Administração" />
        </Campo>
        <Campo label="Semestre atual">
          <select
            value={dados.semestre}
            onChange={(e) => onChange("semestre", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            {SEMESTRES.map((s) => (
              <option key={s} value={s}>{s}º semestre</option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Liga" dica="Para trocar de liga, fale com o Staff">
          <div className="flex items-center gap-2 px-3 py-2 border border-brand-gray rounded-md bg-gray-50">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", ligaBadgeClass(dados.liga))}>
              {dados.liga}
            </span>
            <span className="text-xs text-muted-foreground">Liga {dados.liga}</span>
          </div>
        </Campo>
        <Campo label="Cargo na liga" dica="Somente leitura">
          <InputTexto value={dados.cargo} readOnly />
        </Campo>
      </div>

      <BotaoSalvar onClick={onSalvar} />
    </div>
  );
}

// ─── Aba: Segurança ───────────────────────────────────────────────────────────

function AbaSeguranca({ onToast }: { onToast: (msg: string) => void }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [modalDesativar, setModalDesativar] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState("");

  const senhasValidas = senhaAtual.length > 0 && novaSenha.length >= 6 && novaSenha === confirmar;

  function handleAtualizarSenha() {
    setSenhaAtual(""); setNovaSenha(""); setConfirmar("");
    onToast("Senha atualizada com sucesso.");
  }

  function fecharModal() {
    setModalDesativar(false); setTextoConfirmacao("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display font-bold text-base text-navy mb-4">Trocar senha</h3>
        <div className="space-y-4">
          <Campo label="Senha atual">
            <div className="relative">
              <input
                type={mostrar ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 text-sm border border-brand-gray rounded-md focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
              <button type="button" onClick={() => setMostrar(!mostrar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy transition-colors">
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nova senha" dica="Mínimo 6 caracteres">
              <input type={mostrar ? "text" : "password"} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </Campo>
            <Campo label="Confirmar nova senha">
              <input
                type={mostrar ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="••••••••"
                className={cn("w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2", confirmar && novaSenha !== confirmar ? "border-red-400 focus:ring-red-200" : "border-brand-gray focus:ring-navy/20")}
              />
              {confirmar && novaSenha !== confirmar && <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>}
            </Campo>
          </div>

          <button onClick={handleAtualizarSenha} disabled={!senhasValidas} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-md bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Lock className="h-4 w-4" />
            Atualizar senha
          </button>
        </div>
      </div>

      <div className="border border-red-200 rounded-lg p-5">
        <h3 className="font-display font-bold text-base text-red-600 mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Zona de perigo
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Desativar sua conta remove o acesso à plataforma. Esta ação pode ser revertida pelo Staff.
        </p>
        <button onClick={() => setModalDesativar(true)} className="px-4 py-2 text-sm font-bold rounded-md border border-red-400 text-red-600 hover:bg-red-50 transition-colors">
          Desativar conta
        </button>
      </div>

      {modalDesativar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-navy">Desativar conta</h3>
              <button onClick={fecharModal} className="text-muted-foreground hover:text-navy transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Digite <strong className="text-navy">DESATIVAR</strong> para confirmar.</p>
            <input type="text" value={textoConfirmacao} onChange={(e) => setTextoConfirmacao(e.target.value)} placeholder="DESATIVAR" className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md focus:outline-none focus:ring-2 focus:ring-red-200 mb-4" />
            <div className="flex gap-3">
              <button onClick={fecharModal} className="flex-1 px-4 py-2 text-sm font-medium rounded-md border border-brand-gray text-navy hover:bg-gray-50 transition-colors">Cancelar</button>
              <button disabled={textoConfirmacao !== "DESATIVAR"} className="flex-1 px-4 py-2 text-sm font-bold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Confirmar desativação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Aba: Notificações ────────────────────────────────────────────────────────

type ChaveNotif = keyof Notificacoes;

type OpcaoNotif = { chave: ChaveNotif; label: string; descricao: string; exclusivoLider?: true };

const OPCOES_NOTIF: OpcaoNotif[] = [
  { chave: "eventos",            label: "Novos eventos da liga",          descricao: "Seja notificado quando novos eventos forem criados na sua liga" },
  { chave: "projetos",           label: "Atualizações de projetos",       descricao: "Receba alertas sobre mudanças de status nos projetos" },
  { chave: "ranking",            label: "Ranking da liga",                descricao: "Atualizações semanais sobre a posição da liga no ranking" },
  { chave: "presenca",           label: "Lembretes de presença",          descricao: "Lembretes antes de eventos para registrar presença" },
  { chave: "novosMembros",       label: "Novos membros na liga",          descricao: "Notificação quando um novo membro entrar na sua liga", exclusivoLider: true },
  { chave: "projetosAguardando", label: "Projetos aguardando submissão",  descricao: "Alertas sobre projetos prontos para submeter ao professor", exclusivoLider: true },
];

function AbaNotificacoes({
  notif,
  onChange,
  onSalvar,
}: {
  notif: Notificacoes;
  onChange: (chave: ChaveNotif, valor: boolean) => void;
  onSalvar: () => void;
}) {
  const base = OPCOES_NOTIF.filter((o) => !o.exclusivoLider);
  const lider = OPCOES_NOTIF.filter((o) => o.exclusivoLider);

  function renderOpcao({ chave, label, descricao }: OpcaoNotif) {
    return (
      <div key={chave} className="flex items-center justify-between py-4 border-b border-brand-gray last:border-0">
        <div>
          <p className="text-sm font-medium text-navy">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
        </div>
        <Toggle ativo={notif[chave]} onToggle={() => onChange(chave, !notif[chave])} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>{base.map(renderOpcao)}</div>
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-1">
          Exclusivo do Líder
        </p>
        <div className="border border-brand-gray rounded-lg overflow-hidden">
          {lider.map(renderOpcao)}
        </div>
      </div>
      <BotaoSalvar onClick={onSalvar} label="Salvar preferências" />
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string; icon: React.ElementType }[] = [
  { key: "perfil",        label: "Perfil",            icon: User },
  { key: "academico",     label: "Dados acadêmicos",  icon: GraduationCap },
  { key: "seguranca",     label: "Segurança",         icon: Lock },
  { key: "notificacoes",  label: "Notificações",      icon: Bell },
];

const DADOS_INICIAIS: DadosUsuario = {
  nome: "",
  email: "",
  bio: "",
  instagram: "",
  linkedin: "",
  curso: "",
  semestre: "1",
  liga: "",
  cargo: "Líder",
};

export function ContaLiderView() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("perfil");
  const [dados, setDados] = useState<DadosUsuario>(DADOS_INICIAIS);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadandoAvatar, setUploadandoAvatar] = useState(false);
  const [notif, setNotif] = useState<Notificacoes>({
    eventos: true,
    projetos: true,
    ranking: true,
    presenca: true,
    novosMembros: true,
    projetosAguardando: true,
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuarioMe().then((usuario) => {
      if (!usuario) return;
      setAvatarUrl(usuario.avatar_url);
      setDados((prev) => ({
        ...prev,
        nome: usuario.nome,
        email: usuario.email,
        bio: usuario.biografia ?? "",
      }));
    });
  }, []);

  function alterarDado(campo: keyof DadosUsuario, valor: string) {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  }

  function exibirToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function salvarPerfil() {
    const resultado = await salvarPerfilMe({ nome: dados.nome, biografia: dados.bio });
    if (resultado) {
      setDados((prev) => ({ ...prev, nome: resultado.nome, bio: resultado.biografia ?? "" }));
      exibirToast("Alterações salvas com sucesso.");
    } else {
      exibirToast("Erro ao salvar. Tente novamente.");
    }
  }

  async function handleAvatarChange(file: File) {
    setUploadandoAvatar(true);
    const resultado = await uploadAvatarMe(file);
    setUploadandoAvatar(false);
    if (resultado?.avatar_url) {
      setAvatarUrl(resultado.avatar_url);
      exibirToast("Foto atualizada com sucesso.");
    } else {
      exibirToast("Erro ao enviar a foto. Tente novamente.");
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Minha conta</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie suas informações e preferências</p>
      </div>

      <div className="flex gap-1 border-b border-brand-gray mb-6 overflow-x-auto">
        {ABAS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setAbaAtiva(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              abaAtiva === key ? "border-navy text-navy" : "border-transparent text-muted-foreground hover:text-navy"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-brand-gray rounded-lg p-6">
        {abaAtiva === "perfil"       && <AbaPerfil dados={dados} avatarUrl={avatarUrl} uploadandoAvatar={uploadandoAvatar} onChange={alterarDado} onSalvar={salvarPerfil} onAvatarChange={handleAvatarChange} />}
        {abaAtiva === "academico"    && <AbaDadosAcademicos dados={dados} onChange={alterarDado} onSalvar={() => exibirToast("Alterações salvas com sucesso.")} />}
        {abaAtiva === "seguranca"    && <AbaSeguranca onToast={exibirToast} />}
        {abaAtiva === "notificacoes" && <AbaNotificacoes notif={notif} onChange={(k, v) => setNotif((p) => ({ ...p, [k]: v }))} onSalvar={() => exibirToast("Preferências salvas.")} />}
      </div>

      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}
