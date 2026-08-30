import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { fmtPct, fmtProb } from "@/lib/format";

type Props = {
  asOf?: string;
  lula1: number;
  flavio1: number;
  lula2: number;
  flavio2: number;
  pLula: number;
  pFlavio: number;
};

export function ShareBar({
  asOf,
  lula1,
  flavio1,
  lula2,
  flavio2,
  pLula,
  pFlavio,
}: Props) {
  const [copied, setCopied] = useState(false);

  const text =
    `Radar 2026 · não é pesquisa` +
    (asOf ? ` · ${asOf}` : "") +
    `\nChance de ser presidente: Lula ${fmtProb(pLula)} · Flávio ${fmtProb(pFlavio)}\n` +
    `1º  Lula ${fmtPct(lula1)} × Flávio ${fmtPct(flavio1)}\n` +
    `2º  Lula ${fmtPct(lula2)} × Flávio ${fmtPct(flavio2)}`;

  function href() {
    return typeof window !== "undefined" ? window.location.origin + "/" : "";
  }

  function tweet() {
    const u =
      "https://x.com/intent/tweet?text=" +
      encodeURIComponent(text) +
      "&url=" +
      encodeURIComponent(href());
    window.open(u, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    const payload = `${text}\n${href()}`;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Radar 2026", text, url: href() });
        return;
      } catch {
        /* cancelled */
      }
    }
    tweet();
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
      <button
        type="button"
        onClick={nativeShare}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-ink sm:w-auto"
      >
        <Share2 className="size-4" />
        Compartilhar
      </button>
      <button
        type="button"
        onClick={tweet}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-fg sm:w-auto"
      >
        Postar no X
      </button>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-fg sm:w-auto"
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        {copied ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}
