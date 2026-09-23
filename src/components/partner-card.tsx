import { useI18n } from "@/lib/i18n";
import { trackRadar } from "@/lib/track";

// Número Meta Business da Alvo BR (mesmo do site alvobrimobiliaria.com.br).
const PARTNER_WA = "5547988553130";

export function partnerWaUrl(text: string): string {
  return `https://wa.me/${PARTNER_WA}?text=${encodeURIComponent(text)}`;
}

/** Card de parceiro. Só PT: o atendimento do parceiro é em português. */
export function PartnerCard() {
  const { locale, m } = useI18n();
  if (locale !== "pt") return null;
  const p = m.partner;
  return (
    <aside aria-label={p.label} className="board-card partner-card mb-6">
      <p className="kicker">{p.label} · Alvo BR</p>
      <h2 className="story-title mt-1">{p.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-cream/85">{p.body}</p>
      <a
        href={partnerWaUrl(p.waText)}
        target="_blank"
        rel="noopener sponsored"
        className="share-btn share-btn-icon mt-4"
        onClick={() => trackRadar("partner_wa")}
      >
        {p.cta}
      </a>
    </aside>
  );
}
