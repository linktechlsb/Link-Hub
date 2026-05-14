import { X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { carregarUsuarioMe, salvarPerfilMe, uploadAvatarMe } from "@/lib/conta";
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
    <label className="block font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
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
      {dica && <p className="font-plex-sans text-[11px] text-foreground/40 mt-1">{dica}</p>}
    </div>
  );
}

function Toast({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-navy text-white font-plex-sans text-[13px] px-4 py-3 shadow-lg rounded">
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
  onChange,
  onSalvar,
}: {
  dados: DadosUsuario;
  onChange: (campo: keyof DadosUsuario, valor: string) => void;
  onSalvar: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader numero="01" eyebrow="Conta" titulo="Perfil" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nome completo">
          <input
            type="text"
            value={dados.nome}
            onChange={(e) => onChange("nome", e.target.value)}
            placeholder="Seu nome completo"
            className="w-full px-3 py-2.5 border border-border bg-muted/50 font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-foreground/30 placeholder:text-foreground/20 rounded"
          />
        </Campo>
        <Campo label="E-mail institucional" dica="Somente leitura">
          <input
            type="text"
            value={dados.email}
            readOnly
            className="w-full px-3 py-2.5 border border-border bg-muted/50 font-plex-sans text-[13px] text-foreground/40 cursor-default focus:outline-none rounded"
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
          className="w-full px-3 py-2.5 border border-border bg-muted/50 font-plex-sans text-[13px] text-foreground focus:outline-none focus:border-foreground/30 resize-none placeholder:text-foreground/20 rounded"
        />
      </Campo>

      <button
        onClick={onSalvar}
        className="bg-navy text-white font-plex-sans text-[13px] font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
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
  const fileCardRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarUsuarioMe().then((usuario) => {
      if (!usuario) return;
      setAvatarUrl(usuario.avatar_url);
      setDados({ nome: usuario.nome, email: usuario.email, bio: usuario.biografia ?? "" });
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

  const iniciais = gerarIniciais(dados.nome);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-6">
        <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
          Minha conta
        </h1>
        <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/40 mt-1">
          Gerencie suas informações e preferências
        </p>
      </div>

      <div className="flex items-center gap-4 px-5 py-4 rounded-lg bg-foreground/[0.02] border border-foreground/[0.06] mb-6">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-[52px] h-[52px] rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-[52px] h-[52px] rounded-full bg-navy flex items-center justify-center text-white font-bold text-lg shrink-0">
            {iniciais}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-plex-sans font-bold text-[14px] text-navy truncate">{dados.nome}</p>
          <p className="font-plex-sans text-[11px] text-foreground/40 mt-0.5">{dados.email}</p>
          <span className="inline-block font-plex-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/50 border border-foreground/[0.15] px-2 py-0.5 rounded-full mt-1.5">
            Staff
          </span>
        </div>
        <button
          onClick={() => fileCardRef.current?.click()}
          disabled={uploadandoAvatar}
          className="shrink-0 font-plex-sans text-[11px] font-semibold text-foreground/45 border border-foreground/[0.15] px-3 py-1.5 rounded-full bg-transparent hover:border-foreground/30 transition-colors disabled:opacity-40"
        >
          {uploadandoAvatar ? "Enviando..." : "Alterar foto"}
        </button>
        <input
          ref={fileCardRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatarChange(file);
            e.target.value = "";
          }}
        />
      </div>

      <AnimatedTabs
        tabs={ABAS.map(({ key, label }) => ({ id: key, label }))}
        activeTab={abaAtiva}
        onChange={(key) => setAbaAtiva(key as Aba)}
        wrapperClassName="border-foreground/[0.08] mb-8"
        activeTabClassName="text-navy"
        inactiveTabClassName="text-foreground/40 hover:text-foreground/60"
      />

      {abaAtiva === "perfil" && (
        <AbaPerfil
          dados={dados}
          onChange={(campo, valor) => setDados((prev) => ({ ...prev, [campo]: valor }))}
          onSalvar={salvarPerfil}
        />
      )}
      {abaAtiva === "seguranca" && <AbaSeguranca onToast={exibirToast} />}

      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}
