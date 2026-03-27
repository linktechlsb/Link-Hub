import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

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
      navigate("/dashboard");
    }

    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-8">
      <h2 className="font-display font-semibold text-xl text-navy mb-6">
        Entrar na plataforma
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-navy/80 mb-1.5">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-3 py-2.5 border border-brand-gray rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-navy/80 mb-1.5">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 border border-brand-gray rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
