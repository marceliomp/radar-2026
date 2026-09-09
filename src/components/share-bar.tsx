import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { fmtPct, fmtProb } from "@/lib/format";
import { useI18n, type Locale } from "@/lib/i18n";
import { messages } from "@/lib/i18n/messages";

const SITE = "https://brasilradar.com.br";

type Props = {
  asOf?: string;
  lula1: number;
  flavio1: number;
  lula2?: number;
  flavio2?: number;
  pLula: number;
  pFlavio: number;
  compact?: boolean;
  url?: string;
};

function hasSecondShare(lula2?: number, flavio2?: number): boolean {
  return (lula2 ?? 0) > 0 || (flavio2 ?? 0) > 0;
}

function shareHref(url?: string): string {
  if (!url) return SITE;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE}${url.startsWith("/") ? url : `/${url}`}`;
}

export function sharePayload(
  props: Props,
  locale: Locale = "pt",
): string {
  const { asOf, lula1, flavio1, lula2, flavio2, pLula, pFlavio, url } = props;
  const m = messages(locale).share;
  let text =
    m.headline +
    (asOf ? ` · ${asOf}` : "") +
    `\n${m.chance(fmtProb(pLula, 1, locale), fmtProb(pFlavio, 1, locale))}` +
    `\n${m.intent(fmtPct(lula1, 1, locale), fmtPct(flavio1, 1, locale))}`;
  if (hasSecondShare(lula2, flavio2)) {
    text += `\n${m.runoff(fmtPct(lula2 ?? 0, 1, locale), fmtPct(flavio2 ?? 0, 1, locale))}`;
  }
  text += `\n${shareHref(url)}`;
  return text;
}

export function ShareBar(props: Props) {
  const { locale, m } = useI18n();
  const [copied, setCopied] = useState(false);
  const text = sharePayload(props, locale);
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
        {m.share.whatsapp}
      </button>
      <button
        type="button"
        onClick={copy}
        className={`${btn} border border-border bg-surface-2 text-fg`}
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        {copied ? m.share.copied : m.share.copy}
      </button>
      <button
        type="button"
        onClick={tweet}
        className={`${btn} border border-border bg-surface-2 text-fg`}
      >
        {m.share.tweet}
      </button>
    </div>
  );
}
