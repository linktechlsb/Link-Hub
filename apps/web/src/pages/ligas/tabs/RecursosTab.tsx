import * as Icons from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import { TabSection } from "./primitives";

import type { Recurso } from "@link-leagues/types";
import type { LucideProps } from "lucide-react";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[
    toPascalCase(name)
  ];
  if (!Icon) {
    const Fallback = Icons.Link;
    return <Fallback {...props} />;
  }
  return <Icon {...props} />;
}

interface Props {
  ligaId: string;
}

export function RecursosTab({ ligaId }: Props) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const token = await getToken();
      const res = await fetch(`/api/recursos?liga_id=${ligaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRecursos(await res.json());
      setCarregando(false);
    }
    carregar();
  }, [ligaId]);

  if (carregando) {
    return <p className="text-sm text-foreground/50">Carregando recursos...</p>;
  }

  const contador = (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/60">
      {recursos.length}
    </span>
  );

  return (
    <TabSection titulo="Recursos da liga" acao={contador}>
      {recursos.length === 0 ? (
        <p className="text-sm text-foreground/50">Nenhum recurso cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {recursos.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div
                className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: r.cor }}
              >
                <DynamicIcon name={r.icone} size={18} color="white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{r.titulo}</span>
                  {r.publico && (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-300">
                      Público
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs capitalize text-foreground/50">{r.tipo}</div>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-foreground/60 transition-colors hover:text-foreground"
              >
                ↗ Abrir
              </a>
            </div>
          ))}
        </div>
      )}
    </TabSection>
  );
}
