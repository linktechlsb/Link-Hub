import { ExternalLink } from "lucide-react";

interface Props {
  tallyFormId: string;
}

export function TallyPreview({ tallyFormId }: Props) {
  const src = `https://tally.so/embed/${tallyFormId}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1`;
  const editUrl = `https://tally.so/forms/${tallyFormId}/edit`;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-plex-mono text-[11px] tracking-[0.14em] uppercase text-navy border border-navy/40 px-3 py-1.5 rounded-full hover:bg-navy hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Editar no Tally
        </a>
      </div>
      <iframe
        src={src}
        title="Tally form preview"
        width="100%"
        height="700"
        className="border border-navy/10 rounded"
      />
    </div>
  );
}
