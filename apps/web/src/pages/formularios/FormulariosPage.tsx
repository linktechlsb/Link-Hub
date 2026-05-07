import { Plus, ClipboardList, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

import type { Formulario, FormularioStatus } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_LABELS: Record<FormularioStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

const STATUS_COLORS: Record<FormularioStatus, string> = {
  rascunho: "bg-brand-gray text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-red-100 text-red-700",
};

interface FormularioComLiga extends Formulario {
  liga_nome: string;
}

export function FormulariosPage() {
  const navigate = useNavigate();
  const [formularios, setFormularios] = useState<FormularioComLiga[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarFormularios();
  }, []);

  async function carregarFormularios() {
    try {
      setCarregando(true);
      const token = await getToken();
      const res = await fetch("http://localhost:3001/api/formularios", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar formulários");
      const dados = await res.json();
      setFormularios(dados);
    } catch {
      toast.error("Erro ao carregar formulários");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Formulários
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
            Recrutamento · Liga
          </p>
        </div>
        <Button
          onClick={() => navigate("/formularios/novo")}
          className="bg-navy text-white hover:bg-navy/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Formulário
        </Button>
      </div>

      {carregando ? (
        <div className="text-center py-16 text-navy/50 text-sm">Carregando...</div>
      ) : formularios.length === 0 ? (
        <div className="border border-navy/15 p-12 text-center">
          <ClipboardList className="w-8 h-8 text-navy/30 mx-auto mb-3" />
          <p className="font-display font-bold text-[16px] tracking-[-0.02em] text-navy">
            Nenhum formulário ainda
          </p>
          <p className="text-[13px] text-navy/50 mt-1">
            Crie um novo formulário para começar a recrutar membros.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {formularios.map((formulario) => (
            <div
              key={formulario.id}
              className="border border-navy/15 p-5 hover:border-navy/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/formularios/${formulario.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-[15px] text-navy truncate">
                      {formulario.nome}
                    </span>
                    <Badge
                      className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[formulario.status]}`}
                    >
                      {STATUS_LABELS[formulario.status]}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-navy/50">{formulario.liga_nome}</p>
                  {formulario.descricao && (
                    <p className="text-[12px] text-navy/60 mt-1 line-clamp-1">
                      {formulario.descricao}
                    </p>
                  )}
                </div>
                {formulario.typeform_form_url && (
                  <a
                    href={formulario.typeform_form_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-navy/40 hover:text-navy transition-colors flex-shrink-0"
                    title="Abrir formulário"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
