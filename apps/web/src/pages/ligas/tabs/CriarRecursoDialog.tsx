import { Check, Loader2, Upload } from "lucide-react";
import { useState } from "react";

import { FormSheet } from "@/components/ui/form-sheet";
import { IconeCor } from "@/components/ui/recurso-icone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const TIPOS = ["URL", "PDF", "Apresentação", "Documento", "Notion", "Planilha", "Vídeo", "Outro"];
const TIPOS_MIDIA = ["PDF", "Documento", "Vídeo", "Apresentação"];

const LABEL_CLASS = "text-xs text-foreground/40 mb-3 block";
const INPUT_CLASS =
  "w-full text-sm text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded";

type Props = {
  open: boolean;
  ligaId: string;
  onClose: () => void;
  onCriado: () => void;
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function CriarRecursoDialog({ open, ligaId, onClose, onCriado }: Props) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("URL");
  const [url, setUrl] = useState("");
  const [icone, setIcone] = useState("link");
  const [cor, setCor] = useState("#546484");
  const [publico, setPublico] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function resetar() {
    setTitulo("");
    setTipo("URL");
    setUrl("");
    setIcone("link");
    setCor("#546484");
    setPublico(false);
    setErro(null);
  }

  async function uploadArquivo(file: File) {
    const tiposPermitidos = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    const tamanhoMaximoMB = 50;
    if (!tiposPermitidos.includes(file.type)) {
      setErro("Tipo de ficheiro não permitido. Use PDF, documentos, apresentações ou vídeos.");
      return;
    }
    if (file.size > tamanhoMaximoMB * 1024 * 1024) {
      setErro(`O ficheiro não pode ter mais de ${tamanhoMaximoMB} MB.`);
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("arquivo", file);
      form.append("liga_id", ligaId);
      const res = await fetch("/api/recursos/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErro(body.error ?? "Falha ao enviar o ficheiro. Tente novamente.");
        return;
      }
      const { url: publicUrl } = (await res.json()) as { url: string };
      setUrl(publicUrl);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubmit() {
    setErro(null);
    if (!titulo.trim()) {
      setErro("Informe o nome do recurso.");
      return;
    }
    if (!url.trim()) {
      setErro("Informe a URL ou envie um arquivo.");
      return;
    }
    setSalvando(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/recursos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          liga_id: ligaId,
          titulo: titulo.trim(),
          tipo,
          url: url.trim(),
          icone,
          cor,
          publico,
        }),
      });
      if (res.ok) {
        resetar();
        onCriado();
        onClose();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErro(body.error ?? `Erro ${res.status} ao salvar.`);
      }
    } finally {
      setSalvando(false);
    }
  }

  const ehMidia = TIPOS_MIDIA.includes(tipo);
  const accept =
    tipo === "Vídeo"
      ? "video/*"
      : tipo === "PDF"
        ? ".pdf"
        : tipo === "Apresentação"
          ? ".pdf,.ppt,.pptx"
          : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      eyebrow="Recursos"
      title="Adicionar Recurso"
      footer={
        <>
          <button
            onClick={handleSubmit}
            disabled={salvando || enviando || !titulo.trim() || !url.trim()}
            className="w-full rounded-full bg-foreground px-4 py-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? "Adicionando..." : "Adicionar recurso"}
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-full border border-border px-4 py-3 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted"
          >
            Cancelar
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <label className={LABEL_CLASS}>Nome</label>
          <div className="flex items-center gap-3">
            <IconeCor
              icone={icone}
              cor={cor}
              onChange={(ic, c) => {
                setIcone(ic);
                setCor(c);
              }}
            />
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome do recurso"
              className="flex-1 text-sm text-foreground border border-border px-3 py-2.5 bg-muted/50 placeholder:text-foreground/20 focus:outline-none focus:border-foreground/30 rounded"
            />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>Tipo</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t} className="text-sm">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className={LABEL_CLASS}>{ehMidia ? "Arquivo" : "URL"}</label>
          {ehMidia ? (
            <label
              className={cn(
                "flex flex-col items-center justify-center gap-2 w-full h-24 border border-dashed rounded cursor-pointer transition-colors",
                url
                  ? "border-foreground/30 bg-muted/30"
                  : "border-foreground/20 hover:border-foreground/40",
              )}
            >
              {enviando ? (
                <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
              ) : url ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-[10px] text-foreground/50 max-w-[220px] truncate">
                    {url.split("/").pop()}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-foreground/30">
                    Trocar arquivo
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-foreground/30" />
                  <span className="text-xs text-foreground/40">Clique para selecionar</span>
                </>
              )}
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void uploadArquivo(file);
                }}
              />
            </label>
          ) : (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className={INPUT_CLASS}
            />
          )}
        </div>

        <div>
          <label className={LABEL_CLASS}>Visibilidade</label>
          <Select
            value={publico ? "publico" : "privado"}
            onValueChange={(v) => setPublico(v === "publico")}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="privado" className="text-sm">
                Privado · só membros da liga
              </SelectItem>
              <SelectItem value="publico" className="text-sm">
                Público · visível para todos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </FormSheet>
  );
}
