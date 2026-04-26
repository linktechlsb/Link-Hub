import { Camera, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { carregarUsuarioMe, salvarPerfilMe, uploadAvatarMe } from "@/lib/conta";
import { cn } from "@/lib/utils";
import { TrocarSenhaSection } from "@/pages/conta/TrocarSenhaSection";
import { SectionHeader } from "@/pages/home/v1/primitives";

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
          <input
            type="text"
            value={dados.nome}
            onChange={(e) => onChange("nome", e.target.value)}
            placeholder="Seu nome completo"
            className="w-full px-3 py-2.5 border border-navy/20 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 placeholder:text-navy/30"
          />
        </Campo>
        <Campo label="E-mail institucional" dica="Somente leitura">
          <input
            type="text"
            value={dados.email}
            readOnly
            className="w-full px-3 py-2.5 border border-navy/20 bg-navy/[0.02] font-plex-sans text-[13px] text-navy/40 cursor-default focus:outline-none"
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
          className="w-full px-3 py-2.5 border border-navy/20 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 resize-none placeholder:text-navy/30"
        />
      </Campo>

      <button
        onClick={onSalvar}
        className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors"
      >
        Salvar alterações
      </button>
    </div>
  );
}

// ─── Aba: Segurança ───────────────────────────────────────────────────────────

function AbaSeguranca({ onToast }: { onToast: (msg: string) => void }) {
  return (
    <div className="space-y-6">
      <SectionHeader numero="02" eyebrow="Conta" titulo="Segurança" />
      <TrocarSenhaSection onToast={onToast} />
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "seguranca", label: "Segurança" },
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
          onChange={(campo, valor) => setDados((prev) => ({ ...prev, [campo]: valor }))}
          onSalvar={salvarPerfil}
          onAvatarChange={handleAvatarChange}
        />
      )}
      {abaAtiva === "seguranca" && <AbaSeguranca onToast={exibirToast} />}

      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}
