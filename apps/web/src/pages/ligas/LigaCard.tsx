import { useNavigate } from "react-router-dom";
import type { Liga } from "@link-leagues/types";

interface LigaCardProps {
  liga: Liga;
}

export function LigaCard({ liga }: LigaCardProps) {
  const navigate = useNavigate();
  const inicial = liga.nome.charAt(0).toUpperCase();
  const temImagem = Boolean(liga.imagem_url);
  const diretores = liga.diretores ?? [];
  const projetosAtivos = liga.projetos_ativos ?? 0;

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm bg-white border border-brand-gray cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/ligas/${liga.id}`)}
    >
      {/* Área da imagem */}
      <div className="relative h-32 w-full">
        {temImagem ? (
          <img
            src={liga.imagem_url!}
            alt={liga.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-brand-yellow flex items-center justify-center">
            <span className="font-display font-bold text-5xl text-navy">
              {inicial}
            </span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-2">
        <h3 className="font-display font-bold text-base text-navy leading-tight">
          {liga.nome}
        </h3>

        <p className="text-xs text-link-blue">
          <span className="font-semibold">Diretores:</span>{" "}
          {diretores.length > 0
            ? diretores.map((d) => d.nome).join(", ")
            : "—"}
        </p>

        {projetosAtivos > 0 ? (
          <span className="inline-block bg-brand-yellow text-navy text-xs font-semibold rounded-full px-3 py-0.5">
            {projetosAtivos} {projetosAtivos === 1 ? "projeto ativo" : "projetos ativos"}
          </span>
        ) : (
          <span className="inline-block bg-brand-gray text-muted-foreground text-xs font-semibold rounded-full px-3 py-0.5">
            Nenhum projeto ativo
          </span>
        )}
      </div>
    </div>
  );
}
