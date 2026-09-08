import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { fmtPct, fmtProb } from "@/lib/format";

const SITE = "https://brasilradar.com.br";

type Props = {
  asOf?: string;
  lula1: number;
  flavio1: number;
  lula2: number;
  flavio2: number;
  pLula: number;
  pFlavio: number;
  compact?: boolean;
};

export function sharePayload({
  asOf,
  lula1,
  flavio1,
  lula2,
  flavio2,
  pLula,
  pFlavio,
}: Props): string {
  return (
    `Radar 2026 · não é pesquisa` +
    (asOf ? ` · ${asOf}` : "") +
    `\nChance de ganhar: Lula ${fmtProb(pLula)} · Flávio ${fmtProb(pFlavio)}` +
    `\nIntenção recente: Lula ${fmtPct(lula1)} × Flávio ${fmtPct(flavio1)}` +
    `\n2º Lula ${fmtPct(lula2)} × Flávio ${fmtPct(flavio2)}` +
    `\n${SITE}`
  );
}

export function ShareBar(props: Props) {
  const [copied, setCopied] = useState(false);
  const text = sharePayload(props);
  const compact = Boolean(props.compact);
  const shell = compact
    ? "flex flex-wrap items-center gap-2"
    : "grid grid-cols-1 gap-2 sm:flex sm:flex-wrap";
  const btn = compact
    ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold sm:min-h-11 sm:px-4 sm:text-sm"
    : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold sm:w-auto";

  function tweet() {
    const u =
      "https://x.com/intent/tweet?text=" +
      encodeURIComponent(text);
    window.open(u, "_blank", "noopener,noreferrer");
  }

  function whatsapp() {
    const u = "https://wa.me/?text=" + encodeURIComponent(text);
    window.open(u, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={shell}>
      <button
        type="button"
        onClick={whatsapp}
        className={`${btn} bg-primary text-ink`}
      >
        Mandar no WhatsApp
      </button>
      <button
        type="button"
        onClick={copy}
        className={`${btn} border border-border bg-surface-2 text-fg`}
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        {copied ? "Copiado" : "Copiar texto"}
      </button>
      <button
        type="button"
        onClick={tweet}
        className={`${btn} border border-border bg-surface-2 text-fg`}
      >
        Postar no X
      </button>
    </div>
  );
}
