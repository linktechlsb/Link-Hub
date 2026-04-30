import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LoginFormProps extends Omit<React.ComponentPropsWithoutRef<"form">, "onSubmit"> {
  onSubmit: (e: React.FormEvent) => void;
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  loading: boolean;
  error: string | null;
}

export function LoginForm({
  className,
  onSubmit,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  loading,
  error,
  ...props
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display font-bold text-2xl text-navy">Bem-vindo de volta</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Entre com suas credenciais para acessar a plataforma
        </p>
      </div>
      <div className="grid gap-6">
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
            onChange={(e) => onEmailChange(e.target.value)}
            className="border-brand-gray focus-visible:ring-link-blue"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password" className="text-navy/80 font-medium text-sm">
              Senha
            </Label>
            <Link
              to="/esqueci-senha"
              className="ml-auto text-xs text-link-blue hover:text-navy underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="border-brand-gray focus-visible:ring-link-blue"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-navy hover:bg-navy-800 text-white font-medium"
        >
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </div>
    </form>
  );
}
