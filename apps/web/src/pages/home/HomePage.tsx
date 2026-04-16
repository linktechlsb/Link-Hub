import { useEffect, useState } from "react"
import type { Liga } from "@link-leagues/types"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { LigasCarousel } from "./LigasCarousel"
import { MinhaLigaCard } from "./MinhaLigaCard"
import { HomeStaffView } from "./HomeStaffView"
import { HomeDiretorView } from "./HomeDiretorView"
import { HomeProfessorView } from "./HomeProfessorView"
import { HomeMembroView } from "./HomeMembroView"

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ""
}

const ROLE_LABELS: Record<string, string> = {
  staff:     "Staff",
  diretor:   "Diretor",
  professor: "Professor",
  membro:    "Membro",
  estudante: "Estudante",
}

export function HomePage() {
  const [ligas, setLigas]             = useState<Liga[]>([])
  const [minhaLiga, setMinhaLiga]     = useState<Liga | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState<string>("")
  const [role, setRole]               = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [pendentes, setPendentes]     = useState<{
    projetos: { id: string; titulo: string; liga?: { nome: string } }[]
    eventos:  { id: string; titulo: string; liga?: { nome: string } }[]
  }>({ projetos: [], eventos: [] })

  useEffect(() => {
    async function carregar() {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }

      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user.email ?? ""

      if (email) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("nome, role")
          .eq("email", email)
          .single()
        if (usuario?.nome) setNomeUsuario(usuario.nome as string)
        else setNomeUsuario(email.split("@")[0] ?? "Usuário")
        if (usuario?.role) setRole(usuario.role as string)

        if (usuario?.role === "staff") {
          const res = await fetch("/api/pendentes", { headers })
          if (res.ok) setPendentes(await res.json())
        }
      }
      setLoadingUser(false)

      const [ligasRes, minhaRes] = await Promise.all([
        fetch("/api/ligas", { headers }),
        fetch("/api/ligas/minha", { headers }),
      ])
      if (ligasRes.ok) setLigas(await ligasRes.json())
      if (minhaRes.ok) setMinhaLiga(await minhaRes.json())
    }
    carregar()
  }, [])

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  })
  const dataFormatada = hoje.charAt(0).toUpperCase() + hoje.slice(1)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {loadingUser ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl text-navy">
                Olá, {nomeUsuario}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{dataFormatada}</p>
            </>
          )}
        </div>
        {role && !loadingUser && (
          <Badge
            variant="outline"
            className="border-navy/30 text-navy bg-navy/5 font-semibold mt-1"
          >
            {ROLE_LABELS[role] ?? role}
          </Badge>
        )}
      </div>

      {/* Carrossel de ligas */}
      {ligas.length > 0 && <LigasCarousel ligas={ligas} />}

      {/* Minha Liga */}
      {minhaLiga && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-2">
            Minha Liga
          </p>
          <MinhaLigaCard liga={minhaLiga} />
        </div>
      )}

      {/* View por papel */}
      {role === "staff"     && <HomeStaffView pendentes={pendentes} />}
      {role === "diretor"   && <HomeDiretorView />}
      {role === "professor" && <HomeProfessorView />}
      {role === "membro"    && <HomeMembroView />}
    </div>
  )
}
