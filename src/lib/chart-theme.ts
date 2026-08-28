/** Alvo BR chart colors (surface-deep). */
export const CHART = {
  grid: "#2a4542",
  axis: "#c4b9a8",
  tooltipBg: "#1b2e2c",
  tooltipBorder: "#2c4a47",
  lula: "#db2525",
  flavio: "#3d8ec4",
  renan: "#b8a88e",
  accent: "#2a9582",
  primary: "#2a9582",
  muted: "#c4b9a8",
  purple: "#8aa3b8",
  fg: "#f3eee6",
} as const;

export const tipStyle = {
  background: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 500,
  color: CHART.fg,
  boxShadow: "0 16px 40px -14px hsl(178 50% 6% / 0.65)",
};
