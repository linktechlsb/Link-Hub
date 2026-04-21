import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
          <Campo label="Nova senha" dica={`Mínimo ${TAMANHO_MINIMO} caracteres`}>
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
                  : "border-brand-gray focus:ring-navy/20",
              )}
            />
            {confirmar && novaSenha !== confirmar && (
              <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
            )}
          </Campo>
        </div>

        {erro && <p className="text-sm text-red-500">{erro}</p>}

        <button
          onClick={handleAtualizarSenha}
          disabled={!senhasValidas || loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-md bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Lock className="h-4 w-4" />
          {loading ? "Atualizando..." : "Atualizar senha"}
        </button>
      </div>
    </div>
  );
}
