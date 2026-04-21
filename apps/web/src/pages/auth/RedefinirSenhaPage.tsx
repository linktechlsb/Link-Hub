import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    // Verifica sessão existente primeiro (usuário já logado)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setVerificando(false);
      }
    });

    // Captura sessão vinda do magic link (tokens no hash da URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
        setVerificando(false);
      } else if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        navigate("/login", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
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

  if (verificando) return null;

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-0 shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-display font-bold text-2xl text-navy">
            Criar nova senha
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Defina uma senha para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
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

              {erro && (
                <p className="text-sm text-destructive">{erro}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-navy hover:bg-navy-800 text-white font-medium mt-1"
              >
                {loading ? "Salvando..." : "Salvar senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
