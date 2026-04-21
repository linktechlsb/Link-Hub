import { Save, Lock, User, X, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { carregarUsuarioMe, salvarPerfilMe, uploadAvatarMe } from "@/lib/conta";
import { cn } from "@/lib/utils";
import { TrocarSenhaSection } from "@/pages/conta/TrocarSenhaSection";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aba = "perfil" | "seguranca";

type DadosUsuario = {
  nome: string;
  email: string;
  bio: string;
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
          <p className="text-sm font-bold text-navy">{dados.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Clique na foto para alterar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nome completo">
          <input
            type="text"
            value={dados.nome}
            onChange={(e) => onChange("nome", e.target.value)}
            placeholder="Seu nome completo"
            className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </Campo>
        <Campo label="E-mail institucional" dica="Somente leitura">
          <input
            type="text"
            value={dados.email}
            readOnly
            className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md bg-gray-50 text-muted-foreground cursor-default focus:outline-none"
          />
        </Campo>
      </div>

      <Campo
        label={`Bio — ${dados.bio.length}/160 caracteres`}
        dica="Aparece no seu perfil da plataforma"
      >
        <textarea
          value={dados.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Conte um pouco sobre você..."
          className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
        />
      </Campo>

      <button
        onClick={onSalvar}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-md bg-navy text-white hover:bg-navy/90 transition-colors"
      >
        <Save className="h-4 w-4" />
        Salvar alterações
      </button>
    </div>
  );
}

// ─── Aba: Segurança ───────────────────────────────────────────────────────────

function AbaSeguranca({ onToast }: { onToast: (msg: string) => void }) {
  return <TrocarSenhaSection onToast={onToast} />;
}

// ─── View principal ───────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string; icon: React.ElementType }[] = [
  { key: "perfil", label: "Perfil", icon: User },
  { key: "seguranca", label: "Segurança", icon: Lock },
];

const DADOS_INICIAIS: DadosUsuario = {
  nome: "",
  email: "",
  bio: "",
};

export function ContaStaffView() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("perfil");
  const [dados, setDados] = useState<DadosUsuario>(DADOS_INICIAIS);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadandoAvatar, setUploadandoAvatar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuarioMe().then((usuario) => {
      if (!usuario) return;
      setAvatarUrl(usuario.avatar_url);
      setDados({
        nome: usuario.nome,
        email: usuario.email,
        bio: usuario.biografia ?? "",
      });
    });
  }, []);

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
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie suas informações e preferências
        </p>
      </div>

      <div className="flex gap-1 border-b border-brand-gray mb-6">
        {ABAS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setAbaAtiva(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              abaAtiva === key
                ? "border-navy text-navy"
                : "border-transparent text-muted-foreground hover:text-navy",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-brand-gray rounded-lg p-6">
        {abaAtiva === "perfil" && (
          <AbaPerfil
            dados={dados}
            avatarUrl={avatarUrl}
            uploadandoAvatar={uploadandoAvatar}
            onChange={(campo, valor) => setDados((prev) => ({ ...prev, [campo]: valor }))}
            onSalvar={salvarPerfil}
            onAvatarChange={handleAvatarChange}
          />
        )}
        {abaAtiva === "seguranca" && <AbaSeguranca onToast={exibirToast} />}
      </div>

      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}
