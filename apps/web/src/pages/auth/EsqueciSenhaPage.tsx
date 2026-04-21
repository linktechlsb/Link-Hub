import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setLoading(false);

    if (error) {
      setErro(`Erro: ${error.message}`);
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-display font-bold text-2xl text-navy">
              Verifique seu e-mail
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Se existir uma conta com este e-mail, enviamos um link para você redefinir sua senha.
              Verifique também a caixa de spam.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-navy text-navy hover:bg-navy hover:text-white"
              asChild
            >
              <Link to="/login">Voltar para o login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-0 shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-display font-bold text-2xl text-navy">
            Esqueci minha senha
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Informe seu e-mail para receber o link de recuperação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-navy/80 font-medium text-sm">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="@aluno.lsb.com.br"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-brand-gray focus-visible:ring-link-blue"
                />
              </div>

              {erro && <p className="text-sm text-destructive">{erro}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-navy hover:bg-navy-800 text-white font-medium mt-1"
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>

              <Link
                to="/login"
                className="text-sm text-link-blue hover:text-navy underline-offset-4 hover:underline text-center"
              >
                Voltar para o login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
