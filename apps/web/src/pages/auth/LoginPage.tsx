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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", data.user.email)
      .single();

    if (!usuario) {
      await supabase.auth.signOut();
      setError("Usuário não cadastrado na plataforma. Contate o administrador.");
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
