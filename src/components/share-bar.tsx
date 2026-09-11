import { useState } from "react";
import { useRouterState, useSearch } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { fmtPct, fmtProb } from "@/lib/format";
import { useI18n, type Locale } from "@/lib/i18n";
import { messages } from "@/lib/i18n/messages";
import { SITE, locationUrl } from "@/lib/site";
import { trackRadar } from "@/lib/track";

type Props = {
  asOf?: string;
  lula1?: number;
  flavio1?: number;
  lula2?: number;
  flavio2?: number;
  pLula?: number;
  pFlavio?: number;
  compact?: boolean;
  url?: string;
  text?: string;
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
  if (props.text) return props.text;
  const { asOf, lula1 = 0, flavio1 = 0, lula2, flavio2, pLula = 0, pFlavio = 0, url } = props;
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const href = props.url ? shareHref(props.url) : locationUrl(pathname, search);
  const text = sharePayload({ ...props, url: href }, locale);
  const compact = Boolean(props.compact);
  const copyLabel = copied ? m.share.copied : m.share.copy;

  function tweet() {
    const u =
      "https://x.com/intent/tweet?text=" +
      encodeURIComponent(text);
    window.open(u, "_blank", "noopener,noreferrer");
  }

  function whatsapp() {
    trackRadar("share_wa");
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
    <div className={compact ? "share-bar share-bar-compact" : "share-bar share-bar-stack"}>
      <button
        type="button"
        onClick={whatsapp}
        className="share-btn share-btn-wa"
        aria-label={m.share.whatsapp}
      >
        <span className="share-wa-full" aria-hidden>
          {m.share.whatsapp}
        </span>
        <span className="share-wa-short" aria-hidden>
          {m.share.whatsappShort}
        </span>
      </button>
      <button
        type="button"
        onClick={copy}
        className="share-btn share-btn-icon"
        aria-label={copyLabel}
      >
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        <span className="share-btn-text">{copyLabel}</span>
      </button>
      <button
        type="button"
        onClick={tweet}
        className="share-btn share-btn-icon"
        aria-label={m.share.tweet}
      >
        <span className="share-x" aria-hidden>
          X
        </span>
        <span className="share-btn-text">{m.share.tweet}</span>
      </button>
    </div>
  );
}
