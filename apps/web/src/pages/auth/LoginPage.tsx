import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LoginForm } from "@/components/login-form";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/home", { replace: true });
    });
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("E-mail não confirmado. Verifique sua caixa de entrada.");
      } else {
        setError(`Erro: ${error.message}`);
      }
      setLoading(false);
      return;
    }

    navigate("/home");
    setLoading(false);
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-navy tracking-tight">
              Link Leagues
            </span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm
              onSubmit={handleSubmit}
              email={email}
              onEmailChange={setEmail}
              password={password}
              onPasswordChange={setPassword}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/link_campus.jpg"
          alt="Campus Link — Faculdade de Negócios"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
