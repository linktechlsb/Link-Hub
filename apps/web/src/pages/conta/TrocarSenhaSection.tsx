import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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

const TAMANHO_MINIMO = 8;

export function TrocarSenhaSection({ onToast }: { onToast: (msg: string) => void }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const senhasValidas =
    senhaAtual.length > 0 && novaSenha.length >= TAMANHO_MINIMO && novaSenha === confirmar;

  async function handleAtualizarSenha() {
    setErro(null);

    if (!senhasValidas || loading) return;

    setLoading(true);

    const { data: sessaoData } = await supabase.auth.getSession();
    const email = sessaoData.session?.user.email;

    if (!email) {
      setErro("Sessão expirada. Faça login novamente.");
      setLoading(false);
      return;
    }

    const { error: erroReauth } = await supabase.auth.signInWithPassword({
      email,
      password: senhaAtual,
    });

    if (erroReauth) {
      setErro("Senha atual incorreta.");
      setLoading(false);
      return;
    }

    const { error: erroUpdate } = await supabase.auth.updateUser({ password: novaSenha });

    if (erroUpdate) {
      setErro(`Erro ao atualizar senha: ${erroUpdate.message}`);
      setLoading(false);
      return;
    }

    setSenhaAtual("");
    setNovaSenha("");
    setConfirmar("");
    setLoading(false);
    onToast("Senha atualizada com sucesso.");
  }

  return (
    <div className="space-y-4">
      <Campo label="Senha atual">
        <div className="relative">
          <input
            type={mostrar ? "text" : "password"}
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 pr-10 border border-navy/20 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 placeholder:text-navy/30"
          />
          <button
            type="button"
            onClick={() => setMostrar(!mostrar)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/30 hover:text-navy transition-colors"
          >
            {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Nova senha" dica={`Mínimo ${TAMANHO_MINIMO} caracteres`}>
          <input
            type={mostrar ? "text" : "password"}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 border border-navy/20 bg-white font-plex-sans text-[13px] text-navy focus:outline-none focus:border-navy/60 placeholder:text-navy/30"
          />
        </Campo>
        <Campo label="Confirmar nova senha">
          <input
            type={mostrar ? "text" : "password"}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="••••••••"
            className={cn(
              "w-full px-3 py-2.5 border bg-white font-plex-sans text-[13px] text-navy focus:outline-none placeholder:text-navy/30",
              confirmar && novaSenha !== confirmar
                ? "border-red-400 focus:border-red-500"
                : "border-navy/20 focus:border-navy/60",
            )}
          />
          {confirmar && novaSenha !== confirmar && (
            <p className="font-plex-sans text-[11px] text-red-500 mt-1">As senhas não coincidem</p>
          )}
        </Campo>
      </div>

      {erro && <p className="font-plex-sans text-[13px] text-red-500">{erro}</p>}

      <button
        onClick={handleAtualizarSenha}
        disabled={!senhasValidas || loading}
        className="flex items-center gap-2 font-plex-mono text-[11px] tracking-[0.14em] uppercase border border-navy text-navy px-3 py-1.5 hover:bg-navy hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Lock className="h-3.5 w-3.5" />
        {loading ? "Atualizando..." : "Atualizar senha"}
      </button>
    </div>
  );
}
