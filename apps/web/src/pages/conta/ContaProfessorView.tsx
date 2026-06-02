import { Camera, Eye, Instagram, Linkedin, MoreHorizontal, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { carregarMinhaLiga, carregarUsuarioMe, salvarPerfilMe, uploadAvatarMe } from "@/lib/conta";
import { cn } from "@/lib/utils";
import { TrocarSenhaSection } from "@/pages/conta/TrocarSenhaSection";
import { SectionHeader } from "@/pages/home/v1/primitives";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aba = "perfil" | "profissional" | "seguranca";

type DadosUsuario = {
  nome: string;
  email: string;
  bio: string;
  instagram: string;
  linkedin: string;
  materia: string;
  liga: string;
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
    <label className="block font-plex-mono text-[9px] uppercase tracking-[0.18em] text-foreground/40 mb-1.5">
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
      className={cn("flex items-center border border-border overflow-hidden rounded bg-muted/50")}
    >
      {prefix && (
        <span className="px-3 py-2.5 font-plex-mono text-[11px] text-foreground/40 bg-foreground/[0.04] border-r border-border select-none shrink-0">
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
          readOnly
            ? "text-foreground/40 cursor-default"
            : "text-foreground placeholder:text-foreground/20",
        )}
      />
    </div>
  );
}

function BotaoSalvar({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors"
    >
      Salvar alterações
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

// ─── Card de Perfil ───────────────────────────────────────────────────────────

function CardPerfil({
  nome,
  bio,
  avatarUrl,
  instagram,
  linkedin,
  uploadandoAvatar,
  onAvatarChange,
}: {
  nome: string;
  bio: string;
  avatarUrl: string | null;
  instagram?: string;
  linkedin?: string;
  uploadandoAvatar: boolean;
  onAvatarChange: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [previaAberta, setPreviaAberta] = useState(false);
  const iniciais = gerarIniciais(nome);

  function abrirMenu() {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuAberto(true);
  }

  return (
    <>
      <div
        className="relative w-[260px] rounded-3xl overflow-hidden shadow-xl border border-black/[0.08] shrink-0"
        style={{ height: 360 }}
      >
        {/* Background: foto full-bleed ou gradiente navy com iniciais */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-navy to-[#1a3a6e] flex flex-col items-center justify-center gap-3">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold select-none">
              {iniciais || "?"}
            </div>
            <p className="relative font-plex-mono text-[9px] uppercase tracking-[0.12em] text-white/40">
              Adicione uma foto
            </p>
          </div>
        )}

        {/* Menu de opções */}
        <button
          ref={menuRef}
          onClick={abrirMenu}
          className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-sm rounded-full p-1.5"
        >
          <MoreHorizontal className="h-3.5 w-3.5 text-white" />
        </button>

        {/* Blur gradual */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "75%",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            maskImage: "linear-gradient(to top, black 25%, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to top, black 25%, transparent 70%)",
          }}
        />

        {/* Gradiente escuro */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: "75%",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.52) 50%, rgba(0,0,0,0.0) 100%)",
          }}
        />

        {/* Conteúdo */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="px-4 pt-10 pb-4">
            {/* Nome */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-display font-bold text-white text-[18px] tracking-tight leading-tight drop-shadow">
                {nome || "Seu nome"}
              </span>
            </div>

            {/* Bio */}
            <p
              className="font-plex-sans text-[12px] text-white/75 leading-relaxed mb-4"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {bio || "Sua bio aparece aqui..."}
            </p>

            {/* Rodapé */}
            <div className="flex items-center gap-2.5">
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {linkedin && (
                <a
                  href={`https://linkedin.com/in/${linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {!instagram && !linkedin && (
                <span className="font-plex-mono text-[8px] uppercase tracking-[0.1em] text-white/50 border border-white/20 px-2 py-0.5 rounded-full">
                  Professor
                </span>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onAvatarChange(file);
              setDialogAberto(false);
            }
            e.target.value = "";
          }}
        />
      </div>

      {/* Dropdown de opções */}
      {menuAberto && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
          <div
            className="fixed z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-[152px]"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <button
              onClick={() => {
                setMenuAberto(false);
                setDialogAberto(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left font-plex-sans text-[13px] text-foreground hover:bg-muted/50 transition-colors"
            >
              <Camera className="h-3.5 w-3.5 text-foreground/50 shrink-0" />
              Editar foto
            </button>
            <button
              onClick={() => {
                setMenuAberto(false);
                setPreviaAberta(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left font-plex-sans text-[13px] text-foreground hover:bg-muted/50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-foreground/50 shrink-0" />
              Exibir
            </button>
          </div>
        </>
      )}

      {/* Dialog de alterar foto */}
      {dialogAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setDialogAberto(false)}
        >
          <div
            className="bg-popover shadow-xl w-full max-w-sm mx-4 p-6 rounded-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[18px] tracking-[-0.02em] text-navy">
                Alterar foto de perfil
              </h3>
              <button
                onClick={() => setDialogAberto(false)}
                className="text-foreground/30 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-foreground/30 hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                {uploadandoAvatar ? (
                  <div className="h-5 w-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-foreground/40" />
                )}
              </div>
              <div className="text-center">
                <p className="font-plex-sans font-medium text-[13px] text-foreground">
                  {uploadandoAvatar ? "Enviando..." : "Clique para escolher uma foto"}
                </p>
                <p className="font-plex-sans text-[11px] text-foreground/40 mt-0.5">JPEG ou PNG</p>
              </div>
            </div>
            <button
              onClick={() => setDialogAberto(false)}
              className="w-full mt-3 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground/40 hover:text-foreground transition-colors py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Prévia do perfil */}
      {previaAberta && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviaAberta(false)}
        >
          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-[260px]">
              <p className="font-plex-mono text-[9px] uppercase tracking-[0.18em] text-white/50">
                Como outros te veem
              </p>
              <button
                onClick={() => setPreviaAberta(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="hover-3d">
              <div
                className="relative w-[260px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 shrink-0"
                style={{ height: 360 }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-navy to-[#1a3a6e] flex flex-col items-center justify-center gap-3">
                    <div
                      className="absolute inset-0 opacity-[0.07]"
                      style={{
                        backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                    <div className="relative w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold select-none">
                      {iniciais || "?"}
                    </div>
                    <p className="relative font-plex-mono text-[9px] uppercase tracking-[0.12em] text-white/40">
                      Sem foto
                    </p>
                  </div>
                )}
                {/* Blur via filter:blur() — funciona em contexto 3D ao contrário de backdrop-filter */}
                {avatarUrl && (
                  <div
                    className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden"
                    style={{
                      height: "75%",
                      maskImage: "linear-gradient(to top, black 25%, transparent 70%)",
                      WebkitMaskImage: "linear-gradient(to top, black 25%, transparent 70%)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "-20px",
                        backgroundImage: `url(${avatarUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center top",
                        filter: "blur(20px)",
                      }}
                    />
                  </div>
                )}
                <div
                  className="absolute bottom-0 left-0 right-0 pointer-events-none"
                  style={{
                    height: "75%",
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.52) 50%, rgba(0,0,0,0.0) 100%)",
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="px-4 pt-10 pb-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-display font-bold text-white text-[18px] tracking-tight leading-tight drop-shadow">
                        {nome || "Seu nome"}
                      </span>
                    </div>
                    <p
                      className="font-plex-sans text-[12px] text-white/75 leading-relaxed mb-4"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {bio || "Sua bio aparece aqui..."}
                    </p>
                    <div className="flex items-center gap-2.5">
                      {instagram && (
                        <a
                          href={`https://instagram.com/${instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {linkedin && (
                        <a
                          href={`https://linkedin.com/in/${linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {!instagram && !linkedin && (
                        <span className="font-plex-mono text-[8px] uppercase tracking-[0.1em] text-white/50 border border-white/20 px-2 py-0.5 rounded-full">
                          Professor
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* 8 zonas de hover para o efeito 3D */}
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
          </div>
        </div>
      )}
    </>
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
  return (
    <div className="flex flex-col lg:flex-row gap-10">
      {/* Formulário */}
      <div className="flex-1 space-y-6">
        <SectionHeader numero="01" eyebrow="Conta" titulo="Perfil" />

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

      {/* Card de perfil */}
      <div className="flex justify-center lg:justify-start">
        <CardPerfil
          nome={dados.nome}
          bio={dados.bio}
          avatarUrl={avatarUrl}
          instagram={dados.instagram}
          linkedin={dados.linkedin}
          uploadandoAvatar={uploadandoAvatar}
          onAvatarChange={onAvatarChange}
        />
      </div>
    </div>
  );
}

// ─── Aba: Dados Profissionais ─────────────────────────────────────────────────

function AbaDadosProfissionais({
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
      <SectionHeader numero="02" eyebrow="Conta" titulo="Dados Profissionais" />

      <Campo label="Matéria que leciona">
        <InputTexto
          value={dados.materia}
          onChange={(v) => onChange("materia", v)}
          placeholder="Ex: Gestão de Projetos"
        />
      </Campo>

      <Campo label="Liga que mentora" dica="Para alterar, entre em contato com o Staff">
        <div className="flex items-center gap-2 px-3 py-2.5 border border-border bg-muted/50 rounded">
          <span className="font-plex-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 bg-foreground/[0.08] text-foreground/60 rounded">
            {dados.liga}
          </span>
        </div>
      </Campo>

      <BotaoSalvar onClick={onSalvar} />
    </div>
  );
}

// ─── Aba: Segurança ───────────────────────────────────────────────────────────

function AbaSeguranca({ onToast }: { onToast: (msg: string) => void }) {
  return (
    <div className="space-y-6">
      <SectionHeader numero="03" eyebrow="Conta" titulo="Segurança" />
      <TrocarSenhaSection onToast={onToast} />
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "profissional", label: "Profissional" },
  { key: "seguranca", label: "Segurança" },
];

const DADOS_INICIAIS: DadosUsuario = {
  nome: "",
  email: "",
  bio: "",
  instagram: "",
  linkedin: "",
  materia: "",
  liga: "",
};

export function ContaProfessorView() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("perfil");
  const [dados, setDados] = useState<DadosUsuario>(DADOS_INICIAIS);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadandoAvatar, setUploadandoAvatar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([carregarUsuarioMe(), carregarMinhaLiga()]).then(([usuario, liga]) => {
      if (!usuario) return;
      setAvatarUrl(usuario.avatar_url);
      setDados((prev) => ({
        ...prev,
        nome: usuario.nome,
        email: usuario.email,
        bio: usuario.biografia ?? "",
        instagram: usuario.instagram ?? "",
        linkedin: usuario.linkedin ?? "",
        liga: liga?.nome ?? "",
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

      <div className="border-b border-[#DBDFE4] mb-8">
        <div className="flex">
          {ABAS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAbaAtiva(key)}
              className={cn(
                "px-5 py-3 font-plex-mono text-[10px] uppercase tracking-[0.14em] transition-colors border-b-2 -mb-px",
                abaAtiva === key
                  ? "border-navy text-navy"
                  : "border-transparent text-foreground/40 hover:text-foreground",
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
      {abaAtiva === "profissional" && (
        <AbaDadosProfissionais
          dados={dados}
          onChange={alterarDado}
          onSalvar={() => exibirToast("Alterações salvas com sucesso.")}
        />
      )}
      {abaAtiva === "seguranca" && <AbaSeguranca onToast={exibirToast} />}

      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}
