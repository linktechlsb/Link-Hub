import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import type { Liga } from "@link-leagues/types"

interface MinhaLigaCardProps {
  liga: Liga
}

export function MinhaLigaCard({ liga }: MinhaLigaCardProps) {
  const navigate = useNavigate()

  const stats = [
    { valor: "78", label: "Score", cor: "text-amber-500" },
    { valor: String(liga.projetos_ativos ?? 0), label: "Projetos", cor: "text-navy" },
    { valor: "—", label: "Presença", cor: "text-green-600" },
    { valor: "—", label: "Próx. Evento", cor: "text-navy" },
  ]

  return (
    <Card className="overflow-hidden shadow-sm">
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(90deg, #10284E, #546484)" }}
      >
        <div>
          <h3 className="font-bold text-white text-sm">{liga.nome}</h3>
          <p className="text-white/60 text-xs mt-0.5">
            Diretor:{" "}
            {liga.diretores && liga.diretores.length > 0
              ? liga.diretores.map((d) => d.nome).join(", ")
              : "—"}
          </p>
        </div>
        <button
          onClick={() => navigate(`/ligas/${liga.id}`)}
          className="bg-brand-yellow text-navy text-xs font-bold px-3 py-1.5 rounded-md hover:bg-brand-yellow/90 transition-colors"
        >
          Ver detalhes →
        </button>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border bg-white">
        {stats.map(({ valor, label, cor }) => (
          <div key={label} className="px-3 py-3 text-center">
            <div className={`font-bold text-xl leading-none ${cor}`}>{valor}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">
              {label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
