import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { KpiRow, SectionHeader } from "@/pages/home/v1/primitives";

import type { KpiItem } from "@/pages/home/v1/primitives";
import type { Formulario, FormularioStatus } from "@link-leagues/types";

const STATUS_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

const STATUS_BADGE: Record<FormularioStatus, string> = {
  rascunho: "bg-brand-yellow/20 text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-navy/10 text-navy/60",
};

type Filtro = FormularioStatus | "todos";

interface FormularioComLiga extends Formulario {
  liga_nome: string;
}

export function FormulariosPage() {
  const navigate = useNavigate();
  const { data, carregando } = useCachedFetch<FormularioComLiga[]>("/api/formularios");
  const formularios = data ?? [];
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filtrados = useMemo(
    () => (filtro === "todos" ? formularios : formularios.filter((f) => f.status === filtro)),
    [formularios, filtro],
  );

  const kpis: KpiItem[] = [
    { label: "Total", valor: String(formularios.length) },
    {
      label: "Abertos",
      valor: String(formularios.filter((f) => f.status === "aberto").length),
    },
    {
      label: "Encerrados",
      valor: String(formularios.filter((f) => f.status === "encerrado").length),
    },
    {
      label: "Rascunhos",
      valor: String(formularios.filter((f) => f.status === "rascunho").length),
    },
  ];

  const filtros: { valor: Filtro; label: string }[] = [
    { valor: "todos", label: "Todos" },
    { valor: "aberto", label: "Abertos" },
    { valor: "encerrado", label: "Encerrados" },
    { valor: "rascunho", label: "Rascunhos" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Formulários
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/40 mt-1">
            Formulários da liga
          </p>
        </div>
        <button
          onClick={() => navigate("/formularios/novo")}
          className="font-plex-mono text-[11px] tracking-[0.14em] uppercase text-foreground border border-foreground/40 px-3 py-1.5 rounded-full hover:bg-[#10244D] hover:text-white dark:hover:bg-foreground dark:hover:text-background transition-colors flex-shrink-0"
        >
          + Novo Formulário
        </button>
      </div>

      {/* KPIs */}
      <div className="mb-10">
        <KpiRow items={kpis} cols={4} />
      </div>

      {/* Section + tabela */}
      <div className="space-y-12">
        <section>
          <SectionHeader
            titulo="Todos os Formulários"
            tituloClassName="text-xs font-bold uppercase tracking-wider text-link-blue"
          />

          {/* Filtros */}
          <div className="flex gap-2 mb-5">
            {filtros.map(({ valor, label }) => (
              <button
                key={valor}
                onClick={() => setFiltro(valor)}
                className={
                  filtro === valor
                    ? "bg-navy text-white px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    : "border border-navy/20 text-navy/60 px-3 py-1 rounded-full text-[11px] font-semibold hover:border-navy/40 transition-colors"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {carregando ? (
            <p className="text-[13px] text-navy/40 py-10 text-center">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <div className="border border-dashed border-navy/20 rounded-lg py-16 text-center">
              <p className="text-[13px] text-navy/40">
                {formularios.length === 0
                  ? "Nenhum formulário ainda."
                  : "Nenhum formulário neste filtro."}
              </p>
              {formularios.length === 0 && (
                <Button
                  onClick={() => navigate("/formularios/novo")}
                  className="mt-4 bg-navy text-white hover:bg-navy/90"
                >
                  Criar primeiro formulário
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.08]">
                  {["Título", "Liga", "Status", "Criado em"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 font-plex-mono text-[10px] uppercase tracking-[0.14em] text-navy/40 font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => navigate(`/formularios/${f.id}`)}
                    className="border-b border-foreground/[0.06] hover:bg-navy/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-plex-sans text-[13px] font-semibold text-navy">
                      {f.nome}
                    </td>
                    <td className="py-3 px-4 font-plex-sans text-[13px] text-navy/60">
                      {f.liga_nome}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[f.status]}`}
                      >
                        {STATUS_LABELS[f.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-plex-mono text-[11px] text-navy/40">
                      {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
