import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { fmtPct } from "@/lib/format";

type Props = {
  lula1: number;
  flavio1: number;
  lula2: number;
  flavio2: number;
};

export function ShareBar({ lula1, flavio1, lula2, flavio2 }: Props) {
  const [copied, setCopied] = useState(false);

  const text =
    `Radar 2026 — agregador da eleição, não uma pesquisa.\n\n` +
    `1º  Lula ${fmtPct(lula1)}  ×  Flávio ${fmtPct(flavio1)}\n` +
    `2º  ${fmtPct(lula2)} × ${fmtPct(flavio2)} — empate técnico\n\n` +
    `SP e MG empatados. Sul Flávio. Nordeste Lula.`;

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
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={nativeShare}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
      >
        <Share2 className="size-4" />
        Compartilhar
      </button>
      <button
        type="button"
        onClick={tweet}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-fg"
      >
        Postar no X
      </button>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-fg"
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        {copied ? "Copiado" : "Copiar link"}
      </button>
    </div>
  );
}
