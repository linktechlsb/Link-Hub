import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [erroToken, setErroToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [email, setEmail] = useState<string>("");
  const sessionEstabelecida = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !sessionEstabelecida.current) {
        sessionEstabelecida.current = true;
        setEmail(data.session.user.email ?? "");
        setVerificando(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        !sessionEstabelecida.current &&
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")
      ) {
        sessionEstabelecida.current = true;
        setEmail(session.user.email ?? "");
        setVerificando(false);
      } else if (event === "SIGNED_OUT") {
        navigate("/login", { replace: true });
      }
    });

    const timer = setTimeout(() => {
      if (!sessionEstabelecida.current) {
        setErroToken(true);
        setVerificando(false);
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setErro(`Erro: ${error.message}`);
      setLoading(false);
      return;
    }

    navigate("/home", { replace: true });
  }

  if (verificando) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  if (erroToken) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display font-bold text-2xl text-navy">Link expirado</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Este link de recuperação expirou ou já foi utilizado. Solicite um novo em &ldquo;Esqueci
            minha senha&rdquo;.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full border-navy text-navy hover:bg-navy hover:text-white"
          onClick={() => navigate("/login")}
        >
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display font-bold text-2xl text-navy">Redefinir senha</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {email ? (
            <>
              Defina uma nova senha para <span className="font-medium text-navy/70">{email}</span>
            </>
          ) : (
            "Defina uma nova senha para a sua conta"
          )}
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="senha" className="text-navy/80 font-medium text-sm">
            Nova senha
          </Label>
          <Input
            id="senha"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="border-brand-gray focus-visible:ring-link-blue"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmar" className="text-navy/80 font-medium text-sm">
            Confirmar senha
          </Label>
          <Input
            id="confirmar"
            type="password"
            placeholder="Repita a nova senha"
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="border-brand-gray focus-visible:ring-link-blue"
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-navy hover:bg-navy-800 text-white font-medium"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </div>
    </form>
  );
}
