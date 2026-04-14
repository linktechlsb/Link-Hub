import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LoginForm } from "@/components/login-form";

export function LoginPage() {
  const navigate = useNavigate();
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
    <LoginForm
      onSubmit={handleSubmit}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
    />
  );
}
