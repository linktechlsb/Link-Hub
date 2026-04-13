import type { TipoRecurso } from "@link-leagues/types";

interface RecursoMock {
  id: string;
  titulo: string;
  tipo: TipoRecurso;
  url: string;
  criado_por: string;
}

const TIPO_CONFIG: Record<TipoRecurso, { icon: string; bgClass: string }> = {
  curso: { icon: "🎓", bgClass: "bg-blue-50" },
  video: { icon: "🎥", bgClass: "bg-yellow-50" },
  documento: { icon: "📄", bgClass: "bg-green-50" },
  link: { icon: "🔗", bgClass: "bg-purple-50" },
};

// TODO: substituir por GET /api/ligas/:id/recursos quando tabela `recursos` for criada
const RECURSOS_MOCK: RecursoMock[] = [
  {
    id: "1",
    titulo: "Marketing Digital — Fundamentos",
    tipo: "curso",
    url: "#",
    criado_por: "Líder da Liga",
  },
  {
    id: "2",
    titulo: "Template de Pitch",
    tipo: "documento",
    url: "#",
    criado_por: "Líder da Liga",
  },
  {
    id: "3",
    titulo: "Aula: Estratégia de Conteúdo",
    tipo: "video",
    url: "#",
    criado_por: "Líder da Liga",
  },
];

export function RecursosTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-link-blue uppercase tracking-wider">
        Recursos da Liga
      </p>
      {RECURSOS_MOCK.map((r) => {
        const config = TIPO_CONFIG[r.tipo];
        return (
          <div
            key={r.id}
            className="bg-white border border-brand-gray rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-lg ${config.bgClass} flex items-center justify-center text-lg flex-shrink-0`}
            >
              {config.icon}
            </div>
            <div className="flex-1">
              <div className="font-bold text-navy text-sm">{r.titulo}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Por {r.criado_por}</div>
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
        );
      })}
    </div>
  );
}
