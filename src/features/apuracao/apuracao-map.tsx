import { useMemo, useRef, useState, type MouseEvent } from "react";
import { BrazilMapSvg } from "@/features/radar/map/brazil-map-svg";
import { UF_META } from "@/data/calendar";
import { displayName, type CountResult } from "@/lib/apuracao/tse";
import { useI18n } from "@/lib/i18n";

const AWAITING = "#8fb0aa";
const TIE = "#a08a4a";

const PARTY_FILL: Record<string, string> = {
  "10": "#0e6b4f",
  "11": "#6b4a8a",
  "12": "#d35400",
  "13": "#c62828",
  "15": "#2e7d32",
  "22": "#256fa3",
  "40": "#c47b2b",
  "44": "#1a6b6b",
  "45": "#1e4d8c",
  "55": "#7a4e12",
};

const EXTRA = [
  "#6b3fa0",
  "#b45309",
  "#0f766e",
  "#9f1239",
  "#365314",
  "#1e3a8a",
  "#7c2d12",
  "#155e75",
];

function partyKey(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 2 ? digits.padStart(2, "0") : digits.slice(0, 2);
}

function fillForNumber(number: string): string {
  const key = partyKey(number);
  if (PARTY_FILL[key]) return PARTY_FILL[key];
  let hash = 0;
  for (const ch of key || "?") hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  return EXTRA[hash % EXTRA.length] ?? AWAITING;
}

function fillForCount(count: CountResult | undefined): string {
  if (!count || count.status !== "ok") return AWAITING;
  if (count.tie) return TIE;
  if (!count.leader) return AWAITING;
  return fillForNumber(count.leader.number);
}

export function ApuracaoMap({
  counts,
  sel,
  onSelectUf,
}: {
  counts: Record<string, CountResult> | null;
  sel: string;
  onSelectUf: (uf: string) => void;
}) {
  const { m } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const legend = useMemo(() => {
    const seen = new Map<string, { color: string; label: string }>();
    if (!counts) return [];
    for (const [uf, count] of Object.entries(counts)) {
      if (uf === "BR" || count.status !== "ok" || !count.leader) continue;
      const label = count.leader.party || displayName(count.leader.name);
      const color = fillForNumber(count.leader.number);
      if (!seen.has(label)) seen.set(label, { color, label });
    }
    return [...seen.values()].slice(0, 8);
  }, [counts]);

  function placeTip(uf: string, e: MouseEvent<SVGPathElement>) {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const count = counts?.[uf];
    const name = UF_META[uf]?.name ?? uf;
    const text =
      count?.status === "ok" && count.leader
        ? `${name} · ${displayName(count.leader.name)} ${count.leader.pct ? `${count.leader.pct}%` : ""} · ${count.pctApurado}%`
        : count?.status === "ok" && count.tie
          ? `${name} · ${m.apuracao.tie}`
          : `${name} · ${m.apuracao.waiting}`;
    const x = Math.min(Math.max(8, e.clientX - box.left + 12), box.width - 180);
    const y = Math.min(Math.max(8, e.clientY - box.top + 12), box.height - 48);
    setTip({ text, x, y });
  }

  return (
    <BrazilMapSvg
      wrapRef={wrapRef}
      is2022={false}
      round={1}
      sel={sel}
      tip={tip}
      onSelectUf={onSelectUf}
      placeTip={placeTip}
      setTip={setTip}
      fillFor={(uf) => fillForCount(counts?.[uf])}
      ariaLabel={m.apuracao.mapAria}
      legend={
        <div className="map-legend mt-2">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <i className="inline-block size-2.5" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2.5" style={{ background: AWAITING }} />
            {m.apuracao.waiting}
          </span>
        </div>
      }
    />
  );
}
