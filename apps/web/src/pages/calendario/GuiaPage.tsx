import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

const BUCKET = "documentos";
const FILE_PATH = "guia-eventos.pdf";

const { data } = supabase.storage.from(BUCKET).getPublicUrl(FILE_PATH);
const pdfPublicUrl = data.publicUrl;

export function GuiaPage() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string;

    fetch(pdfPublicUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar o PDF");
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

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
          href={pdfPublicUrl}
          download="guia-eventos.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-plex-mono text-[11px] tracking-[0.14em] uppercase border border-foreground/30 px-4 py-2 rounded-full hover:bg-foreground/5 transition-colors shrink-0"
        >
          <Download className="size-3.5" />
          Baixar PDF
        </a>
      </div>

      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-muted/30 min-h-[600px] flex items-center justify-center">
        {error ? (
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>Não foi possível carregar o PDF.</p>
            <a
              href={pdfPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Abrir em nova aba
            </a>
          </div>
        ) : blobUrl ? (
          <iframe
            src={blobUrl}
            className="w-full h-full min-h-[600px]"
            title="Guia de Organização de Hubs, Painéis e Workshops"
          />
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
