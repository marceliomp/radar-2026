/** Chart colors (surface-deep). */
export const CHART = {
  grid: "#3d5c57",
  axis: "#e4d9c8",
  tooltipBg: "#152623",
  tooltipBorder: "#3d5c57",
  lula: "#ff6b6b",
  flavio: "#7ec8f0",
  renan: "#d4c4a8",
  cury: "#e8b86d",
  caiado: "#6ed4c0",
  zema: "#8aa3b8",
  accent: "#6ed4c0",
  primary: "#6ed4c0",
  muted: "#e4d9c8",
  purple: "#8aa3b8",
  fg: "#f7f4ef",
} as const;

export const tipStyle = {
  background: CHART.tooltipBg,
  backgroundColor: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 500,
  color: CHART.fg,
  boxShadow: "0 16px 40px -14px hsl(178 50% 6% / 0.65)",
};

/** Recharts DefaultTooltipContent ignores wrapper `color`; set item/label explicitly. */
export const tipItemStyle = { color: CHART.fg };
export const tipLabelStyle = { color: CHART.fg };

const PT_RED = CHART.lula;
const PL_BLUE = CHART.flavio;

/** Known non-PT/PL colors. No red. Keys after fold (no accent). */
const PARTY_FG: Record<string, string> = {
  PSD: "#6ed4c0",
  MDB: "#e4d9c8",
  UNIAO: "#c4a574",
  PP: "#8aa3b8",
  REPUBLICANOS: "#e8b86d",
  PSDB: "#7eb8a8",
  NOVO: "#a8b4d4",
  PSB: "#e8c56a",
  PDT: "#7ec9a0",
  PSOL: "#e09a5c",
  MISSAO: "#d4c4a8",
  AVANTE: "#c8d4c0",
  PODE: "#9ab8a8",
  REDE: "#6eb8a8",
  AGIR: "#c8b89a",
  DC: "#a8b8c8",
  PMN: "#b8c4a0",
  PRD: "#c4b8a0",
  PCB: "#d4a060",
  PCO: "#c4a090",
  PSTU: "#c4a878",
  UP: "#d4b896",
  DEMOCRATA: "#9aa8b8",
  PCDOB: "#e09a5c",
  PV: "#7eb8a8",
  SOLIDARIEDADE: "#c8b89a",
  CIDADANIA: "#a8b4d4",
};

const FALLBACK_FG = [
  "#6ed4c0",
  "#d4c4a8",
  "#8aa3b8",
  "#e8b86d",
  "#9ec9b0",
  "#c4a574",
  "#a8b4d4",
  "#e09a5c",
] as const;

const TONE_BG: Record<string, string> = {
  [PT_RED]: "#161010",
  [PL_BLUE]: "#0d151c",
  "#6ed4c0": "#10201c",
  "#e4d9c8": "#16140f",
  "#c4a574": "#16140f",
  "#8aa3b8": "#0d1518",
  "#e8b86d": "#16140f",
  "#7eb8a8": "#10201c",
  "#a8b4d4": "#10141c",
  "#e8c56a": "#16140f",
  "#7ec9a0": "#10201c",
  "#e09a5c": "#16120e",
  "#d4c4a8": "#16140f",
  "#c8d4c0": "#10201c",
  "#9ab8a8": "#10201c",
  "#a8b8c8": "#0d1518",
  "#d4a060": "#16120e",
  "#c4a090": "#16120e",
  "#c4a878": "#16120e",
  "#d4b896": "#16140f",
  "#9aa8b8": "#0d1518",
  "#c8b89a": "#16140f",
  "#b8c4a0": "#10201c",
  "#c4b8a0": "#16140f",
};

function foldParty(party: string): string {
  return party.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

/** Tokens de partido. "PDT" nao vira PT. Federacao "PT/PC do B" inclui PT. */
export function partyTokens(party: string): string[] {
  return foldParty(party)
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 2);
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function partyColor(party: string): string {
  const tokens = partyTokens(party);
  if (tokens.includes("PT")) return PT_RED;
  if (tokens.includes("PL")) return PL_BLUE;
  for (const t of tokens) {
    const mapped = PARTY_FG[t];
    if (mapped) return mapped;
  }
  const key = tokens.join("") || foldParty(party) || "x";
  return FALLBACK_FG[hashHue(key) % FALLBACK_FG.length]!;
}

export function partyTone(party: string): { fg: string; bg: string } {
  const fg = partyColor(party);
  return { fg, bg: TONE_BG[fg] ?? "#10201c" };
}
