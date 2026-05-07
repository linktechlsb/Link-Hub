import { Plus, ClipboardList, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

import type { ProcessoSeletivo, ProcessoStatus } from "@link-leagues/types";

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const STATUS_LABELS: Record<ProcessoStatus, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
};

const STATUS_COLORS: Record<ProcessoStatus, string> = {
  rascunho: "bg-brand-gray text-navy",
  aberto: "bg-green-100 text-green-800",
  encerrado: "bg-red-100 text-red-700",
};

interface ProcessoComLiga extends ProcessoSeletivo {
  liga_nome: string;
}

export function ProcessoSeletivoPage() {
  const navigate = useNavigate();
  const [processos, setProcessos] = useState<ProcessoComLiga[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarProcessos();
  }, []);

  async function carregarProcessos() {
    try {
      setCarregando(true);
      const token = await getToken();
      const res = await fetch("http://localhost:3001/api/processo-seletivo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao carregar processos");
      const dados = await res.json();
      setProcessos(dados);
    } catch {
      toast.error("Erro ao carregar processos seletivos");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] text-navy">
            Processo Seletivo
          </h1>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-navy/50 mt-1">
            Recrutamento · Liga
          </p>
        </div>
        <Button
          onClick={() => navigate("/processo-seletivo/novo")}
          className="bg-navy text-white hover:bg-navy/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Processo
        </Button>
      </div>

      {carregando ? (
        <div className="text-center py-16 text-navy/50 text-sm">Carregando...</div>
      ) : processos.length === 0 ? (
        <div className="border border-navy/15 p-12 text-center">
          <ClipboardList className="w-8 h-8 text-navy/30 mx-auto mb-3" />
          <p className="font-display font-bold text-[16px] tracking-[-0.02em] text-navy">
            Nenhum processo seletivo ainda
          </p>
          <p className="text-[13px] text-navy/50 mt-1">
            Crie um novo processo para começar a recrutar membros.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {processos.map((processo) => (
            <div
              key={processo.id}
              className="border border-navy/15 p-5 hover:border-navy/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/processo-seletivo/${processo.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-[15px] text-navy truncate">
                      {processo.nome}
                    </span>
                    <Badge className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[processo.status]}`}>
                      {STATUS_LABELS[processo.status]}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-navy/50">{processo.liga_nome}</p>
                  {processo.descricao && (
                    <p className="text-[12px] text-navy/60 mt-1 line-clamp-1">
                      {processo.descricao}
                    </p>
                  )}
                </div>
                {processo.typeform_form_url && (
                  <a
                    href={processo.typeform_form_url}
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
