import * as Icons from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

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
    return <p className="text-sm text-muted-foreground">Carregando recursos...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
        Recursos da Liga{" "}
        <span className="bg-brand-gray text-link-blue rounded-full px-2 py-0.5 text-xs font-normal ml-1 normal-case">
          {recursos.length}
        </span>
      </p>
      {recursos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum recurso cadastrado.</p>
      ) : (
        recursos.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-brand-gray rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: r.cor }}
            >
              <DynamicIcon name={r.icone} size={18} color="white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-navy text-sm">{r.titulo}</div>
              <div className="text-xs text-muted-foreground mt-0.5 capitalize">{r.tipo}</div>
            </div>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-link-blue hover:text-navy transition-colors"
            >
              ↗ Abrir
            </a>
          </div>
        ))
      )}
    </div>
  );
}
