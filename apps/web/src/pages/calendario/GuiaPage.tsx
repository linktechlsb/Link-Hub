import { Download, FileText } from "lucide-react";

import { supabase } from "@/lib/supabase";

const BUCKET = "documentos";
const FILE_PATH = "guia-eventos.pdf";

const { data } = supabase.storage.from(BUCKET).getPublicUrl(FILE_PATH);
const pdfUrl = data.publicUrl;

export function GuiaPage() {
  return (
    <div className="flex flex-col h-full px-8 py-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="font-plex-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
            Calendário · Link School of Business
          </p>
          <h1 className="font-display font-bold text-[22px] tracking-[-0.02em] mt-1">
            Guia de Organização de Hubs, Painéis e Workshops
          </h1>
        </div>
        <a
          href={pdfUrl}
          download="guia-eventos.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-plex-mono text-[11px] tracking-[0.14em] uppercase border border-foreground/30 px-4 py-2 rounded-full hover:bg-foreground/5 transition-colors shrink-0"
        >
          <Download className="size-3.5" />
          Baixar PDF
        </a>
      </div>

      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-muted/30 min-h-[600px]">
        <object data={pdfUrl} type="application/pdf" className="w-full h-full min-h-[600px]">
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <FileText className="size-12 text-foreground/20" />
            <p className="font-plex-mono text-[11px] uppercase tracking-[0.14em] text-foreground/50">
              Seu navegador não suporta visualização de PDF
            </p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-plex-mono text-[11px] tracking-[0.14em] uppercase border border-foreground/40 px-4 py-2 rounded-full hover:bg-foreground/5 transition-colors"
            >
              Abrir PDF
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}
