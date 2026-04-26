import { AlertTriangle, Camera, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { carregarUsuarioMe, salvarPerfilMe, uploadAvatarMe } from "@/lib/conta";
import { cn } from "@/lib/utils";
import { TrocarSenhaSection } from "@/pages/conta/TrocarSenhaSection";
import { SectionHeader } from "@/pages/home/v1/primitives";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aba = "perfil" | "academico" | "seguranca" | "notificacoes";

type DadosUsuario = {
  nome: string;
  email: string;
  bio: string;
  instagram: string;
  linkedin: string;
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

function gerarIniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// ─── Primitivos ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60 mb-1.5">
      {children}
    </label>
  );
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
      {dica && <p className="font-plex-sans text-[11px] text-navy/40 mt-1">{dica}</p>}
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
        "flex items-center border border-navy/20 overflow-hidden",
        readOnly && "bg-navy/[0.02]",
      )}
    >
      {prefix && (
        <span className="px-3 py-2.5 font-plex-mono text-[11px] text-navy/40 bg-navy/[0.03] border-r border-navy/20 select-none shrink-0">
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
          "flex-1 px-3 py-2.5 font-plex-sans text-[13px] bg-transparent focus:outline-none",
          readOnly ? "text-navy/40 cursor-default" : "text-navy placeholder:text-navy/30",
        )}
      />
    </div>
  );
}

function BotaoSalvar({
  onClick,
  label = "Salvar alterações",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
    >
      {label}
    </button>
  );
}

function Toast({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-navy text-white font-plex-sans text-[13px] px-4 py-3 shadow-lg">
      {mensagem}
      <button onClick={onFechar} className="text-white/60 hover:text-white transition-colors">
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
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
        ativo ? "bg-navy" : "bg-navy/20",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform",
          ativo ? "translate-x-5" : "translate-x-0",
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
      <SectionHeader numero="01" eyebrow="Conta" titulo="Perfil" />

      <div className="flex items-center gap-4">
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
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
          <p className="font-plex-sans font-medium text-[14px] text-navy">{dados.nome}</p>
          <p className="font-plex-sans text-[12px] text-navy/40 mt-0.5">
            Clique na foto para alterar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nome completo">
          <InputTexto
            value={dados.nome}
            onChange={(v) => onChange("nome", v)}
            placeholder="Seu nome completo"
          />
        </Campo>
        <Campo label="E-mail institucional" dica="Somente leitura">
          <InputTexto value={dados.email} readOnly />
        </Campo>
      </div>

      <Campo
        label={`Bio — ${dados.bio.length}/160 caracteres`}
        dica="Aparece no seu perfil da liga"
      >
        <textarea
          value={dados.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Conte um pouco sobre você..."
          className="w-full px-3 py-2.5 border border-navy/20 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 resize-none placeholder:text-navy/30"
        />
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Instagram" dica="Apenas o @usuario">
          <InputTexto
            value={dados.instagram}
            onChange={(v) => onChange("instagram", v.replace(/^@+/, ""))}
            placeholder="usuario"
            prefix="@"
          />
        </Campo>
        <Campo label="LinkedIn" dica="Apenas o /in/usuario">
          <InputTexto
            value={dados.linkedin}
            onChange={(v) => onChange("linkedin", v.replace(/^\/in\//, ""))}
            placeholder="usuario"
            prefix="/in/"
          />
        </Campo>
      </div>

      <BotaoSalvar onClick={onSalvar} />
    </div>
  );
}

// ─── Aba: Dados Acadêmicos ────────────────────────────────────────────────────

const SEMESTRES = ["1", "2", "3", "4", "5", "6", "7", "8", "alumni"];

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
      <SectionHeader numero="02" eyebrow="Conta" titulo="Dados Acadêmicos" />

      <Campo label="Semestre atual">
        <select
          value={dados.semestre}
          onChange={(e) => onChange("semestre", e.target.value)}
          className="w-full max-w-xs px-3 py-2.5 border border-navy/20 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60"
        >
          {SEMESTRES.map((s) => (
            <option key={s} value={s}>
              {s === "alumni" ? "Alumni" : `${s}º semestre`}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Liga" dica="Para trocar de liga, fale com o Staff">
          <div className="flex items-center gap-2 px-3 py-2.5 border border-navy/20 bg-navy/[0.02]">
            <span className="font-plex-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 bg-navy/10 text-navy">
              {dados.liga}
            </span>
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
  const [modalDesativar, setModalDesativar] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState("");

  function fecharModal() {
    setModalDesativar(false);
    setTextoConfirmacao("");
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader numero="03" eyebrow="Conta" titulo="Segurança" />
        <TrocarSenhaSection onToast={onToast} />
      </div>

      <div className="border-t border-red-200 pt-5">
        <p className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-red-500 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Zona de perigo
        </p>
        <p className="font-plex-sans text-[13px] text-navy/50 mb-4">
          Desativar sua conta remove o acesso à plataforma. Esta ação pode ser revertida pelo Staff.
        </p>
        <button
          onClick={() => setModalDesativar(true)}
          className="font-plex-mono text-[10px] uppercase tracking-[0.14em] border border-red-400 text-red-600 px-3 py-1.5 hover:bg-red-50 transition-colors"
        >
          Desativar conta
        </button>
      </div>

      {modalDesativar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start justify-between mb-5">
              <h3 className="font-display font-bold text-[18px] tracking-[-0.02em] text-navy">
                Desativar conta
              </h3>
              <button
                onClick={fecharModal}
                className="text-navy/30 hover:text-navy transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="font-plex-sans text-[13px] text-navy/60 mb-4">
              Digite <strong className="text-navy font-bold">DESATIVAR</strong> para confirmar.
            </p>
            <input
              type="text"
              value={textoConfirmacao}
              onChange={(e) => setTextoConfirmacao(e.target.value)}
              placeholder="DESATIVAR"
              className="w-full px-3 py-2.5 border border-navy/20 font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 mb-4 placeholder:text-navy/30"
            />
            <div className="flex gap-3">
              <button
                onClick={fecharModal}
                className="flex-1 font-plex-mono text-[10px] uppercase tracking-[0.14em] border border-navy/20 text-navy px-3 py-2 hover:bg-navy/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={textoConfirmacao !== "DESATIVAR"}
                className="flex-1 font-plex-mono text-[10px] uppercase tracking-[0.14em] bg-red-600 text-white px-3 py-2 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar desativação
              </button>
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
  {
    chave: "eventos",
    label: "Novos eventos da liga",
    descricao: "Seja notificado quando novos eventos forem criados na sua liga",
  },
  {
    chave: "projetos",
    label: "Atualizações de projetos",
    descricao: "Receba alertas sobre mudanças de status nos projetos",
  },
  {
    chave: "ranking",
    label: "Ranking da liga",
    descricao: "Atualizações semanais sobre a posição da liga no ranking",
  },
  {
    chave: "presenca",
    label: "Lembretes de presença",
    descricao: "Lembretes antes de eventos para registrar presença",
  },
  {
    chave: "novosMembros",
    label: "Novos membros na liga",
    descricao: "Notificação quando um novo membro entrar na sua liga",
    exclusivoLider: true,
  },
  {
    chave: "projetosAguardando",
    label: "Projetos aguardando submissão",
    descricao: "Alertas sobre projetos prontos para submeter ao professor",
    exclusivoLider: true,
  },
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
      <div key={chave} className="flex items-center justify-between py-4 border-b border-navy/10">
        <div>
          <p className="font-plex-sans font-medium text-[13px] text-navy">{label}</p>
          <p className="font-plex-sans text-[12px] text-navy/40 mt-0.5">{descricao}</p>
        </div>
        <Toggle ativo={notif[chave]} onToggle={() => onChange(chave, !notif[chave])} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader numero="04" eyebrow="Conta" titulo="Notificações" />

      <div className="border-t border-navy/15">{base.map(renderOpcao)}</div>

      <div>
        <p className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-navy/60 mb-3">
          Exclusivo do Líder
        </p>
        <div className="border-t border-navy/15">{lider.map(renderOpcao)}</div>
      </div>

      <BotaoSalvar onClick={onSalvar} label="Salvar preferências" />
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "academico", label: "Acadêmico" },
  { key: "seguranca", label: "Segurança" },
  { key: "notificacoes", label: "Notificações" },
];

const ROLE_LABEL: Record<string, string> = {
  staff: "Staff",
  diretor: "Diretor",
  membro: "Membro",
  estudante: "Estudante",
  professor: "Professor",
};

const DADOS_INICIAIS: DadosUsuario = {
  nome: "",
  email: "",
  bio: "",
  instagram: "",
  linkedin: "",
  semestre: "1",
  liga: "",
  cargo: "",
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
        instagram: usuario.instagram ?? "",
        linkedin: usuario.linkedin ?? "",
        semestre: usuario.semestre ?? "1",
        cargo: ROLE_LABEL[usuario.role] ?? usuario.role,
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
    const resultado = await salvarPerfilMe({
      nome: dados.nome,
      biografia: dados.bio,
      instagram: dados.instagram,
      linkedin: dados.linkedin,
    });
    if (resultado) {
      setDados((prev) => ({
        ...prev,
        nome: resultado.nome,
        bio: resultado.biografia ?? "",
        instagram: resultado.instagram ?? "",
        linkedin: resultado.linkedin ?? "",
      }));
      exibirToast("Alterações salvas com sucesso.");
    } else {
      exibirToast("Erro ao salvar. Tente novamente.");
    }
  }

  async function salvarDadosAcademicos() {
    const resultado = await salvarPerfilMe({ semestre: dados.semestre });
    if (resultado) {
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
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Minha conta
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
          Gerencie suas informações e preferências
        </p>
      </div>

      <div className="border-b border-navy/15 mb-8">
        <div className="flex">
          {ABAS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAbaAtiva(key)}
              className={cn(
                "px-5 py-3 font-plex-mono text-[10px] uppercase tracking-[0.14em] transition-colors border-b-2 -mb-px",
                abaAtiva === key
                  ? "border-navy text-navy"
                  : "border-transparent text-navy/40 hover:text-navy",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {abaAtiva === "perfil" && (
        <AbaPerfil
          dados={dados}
          avatarUrl={avatarUrl}
          uploadandoAvatar={uploadandoAvatar}
          onChange={alterarDado}
          onSalvar={salvarPerfil}
          onAvatarChange={handleAvatarChange}
        />
      )}
      {abaAtiva === "academico" && (
        <AbaDadosAcademicos dados={dados} onChange={alterarDado} onSalvar={salvarDadosAcademicos} />
      )}
      {abaAtiva === "seguranca" && <AbaSeguranca onToast={exibirToast} />}
      {abaAtiva === "notificacoes" && (
        <AbaNotificacoes
          notif={notif}
          onChange={(k, v) => setNotif((p) => ({ ...p, [k]: v }))}
          onSalvar={() => exibirToast("Preferências salvas.")}
        />
      )}

      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}
