import type { Liga } from "@link-leagues/types";

interface Props {
  liga: Liga;
}

export function LiderTab({ liga }: Props) {
  const diretores = liga.diretores ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
          Líder da Liga
        </p>
        <div className="bg-white border border-brand-gray rounded-lg p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-link-blue flex-shrink-0" />
          <div>
            <div className="font-bold text-navy text-sm">
              {liga.lider?.nome ?? liga.lider_email ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{liga.lider_email}</div>
          </div>
        </div>
      </div>

      {diretores.length > 0 && (
        <div>
          <p className="text-xs font-bold text-link-blue uppercase tracking-wider mb-3">
            Diretores
          </p>
          <div className="flex flex-col gap-2">
            {diretores.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-brand-gray rounded-lg p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-link-blue flex-shrink-0" />
                <div className="font-semibold text-navy text-sm">{d.nome}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {diretores.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum diretor cadastrado.</p>
      )}
    </div>
  );
}
