import type { Liga } from "@link-leagues/types";

function primeiroUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 2) return nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

interface Props {
  liga: Liga;
}

export function LiderTab({ liga }: Props) {
  const diretores = liga.diretores ?? [];

  return (
    <div className="space-y-6">
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
                <div className="font-semibold text-navy text-sm">{primeiroUltimoNome(d.nome)}</div>
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
