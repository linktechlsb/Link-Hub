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

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha inválidos.");
    } else {
      navigate("/projetos");
    }

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
