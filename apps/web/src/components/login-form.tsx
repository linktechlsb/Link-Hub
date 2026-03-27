import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSubmit: (e: React.FormEvent) => void
  email: string
  onEmailChange: (v: string) => void
  password: string
  onPasswordChange: (v: string) => void
  loading: boolean
  error: string | null
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-display font-bold text-2xl text-navy">
            Bem-vindo de volta
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Entre com suas credenciais para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-navy/80 font-medium text-sm">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@link.edu.br"
                  required
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className="border-brand-gray focus-visible:ring-link-blue"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-navy/80 font-medium text-sm">
                  Senha
                </Label>
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

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-navy hover:bg-navy-800 text-white font-medium mt-1"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
