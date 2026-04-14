import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Save, Lock, User, X } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aba = "perfil" | "seguranca";

type DadosUsuario = {
  nome: string;
  email: string;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_USUARIO: DadosUsuario = {
  nome: "Carol Fuji",
  email: "admin@email.com",
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
  onChange,
  onSalvar,
}: {
  dados: DadosUsuario;
  onChange: (campo: keyof DadosUsuario, valor: string) => void;
  onSalvar: () => void;
}) {
  const iniciais = gerarIniciais(dados.nome);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-navy text-white text-xl font-bold flex items-center justify-center shrink-0">
          {iniciais}
        </div>
        <div>
          <p className="text-sm font-bold text-navy">{dados.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Upload de foto em breve</p>
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
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);

  const senhasValidas =
    senhaAtual.length > 0 && novaSenha.length >= 6 && novaSenha === confirmar;

  function handleAtualizarSenha() {
    setSenhaAtual(""); setNovaSenha(""); setConfirmar("");
    onToast("Senha atualizada com sucesso.");
  }

  return (
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
            <button
              type="button"
              onClick={() => setMostrar(!mostrar)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy transition-colors"
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nova senha" dica="Mínimo 6 caracteres">
            <input
              type={mostrar ? "text" : "password"}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-brand-gray rounded-md focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </Campo>
          <Campo label="Confirmar nova senha">
            <input
              type={mostrar ? "text" : "password"}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="••••••••"
              className={cn(
                "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2",
                confirmar && novaSenha !== confirmar
                  ? "border-red-400 focus:ring-red-200"
                  : "border-brand-gray focus:ring-navy/20"
              )}
            />
            {confirmar && novaSenha !== confirmar && (
              <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
            )}
          </Campo>
        </div>

        <button
          onClick={handleAtualizarSenha}
          disabled={!senhasValidas}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-md bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Lock className="h-4 w-4" />
          Atualizar senha
        </button>
      </div>
    </div>
  );
}

// ─── View principal ───────────────────────────────────────────────────────────

const ABAS: { key: Aba; label: string; icon: React.ElementType }[] = [
  { key: "perfil",    label: "Perfil",    icon: User },
  { key: "seguranca", label: "Segurança", icon: Lock },
];

export function ContaStaffView() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("perfil");
  const [dados, setDados] = useState<DadosUsuario>(MOCK_USUARIO);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      setDados((prev) => ({
        ...prev,
        email: user.email ?? prev.email,
        nome: user.user_metadata?.nome ?? user.user_metadata?.full_name ?? prev.nome,
      }));
    });
  }, []);

  function exibirToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-navy">Minha conta</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie suas informações e preferências</p>
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
                : "border-transparent text-muted-foreground hover:text-navy"
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
            onChange={(campo, valor) => setDados((prev) => ({ ...prev, [campo]: valor }))}
            onSalvar={() => exibirToast("Alterações salvas com sucesso.")}
          />
        )}
        {abaAtiva === "seguranca" && <AbaSeguranca onToast={exibirToast} />}
      </div>

      {toast && <Toast mensagem={toast} onFechar={() => setToast(null)} />}
    </div>
  );
}
