import { CHART, tipStyle } from "@/lib/chart-theme";
import { dateBr, fieldPeriodLine, fmtNum } from "@/lib/format";

type TipRow = {
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  payload?: {
    institute?: string;
    published?: string;
    fieldStart?: string;
    fieldEnd?: string;
  };
};

function pollTitle(row: TipRow["payload"]): string {
  if (!row?.institute) return "";
  const pub = dateBr(row.published);
  const periodo = fieldPeriodLine(row.fieldStart, row.fieldEnd);
  if (periodo && pub) return `${row.institute} · ${pub}. ${periodo}`;
  if (periodo) return `${row.institute}. ${periodo}`;
  return pub ? `${row.institute} · ${pub}` : row.institute;
}

/** Cream on petro. Recharts DefaultTooltipContent paints item text black. */
export function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TipRow[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const fromPoll = pollTitle(payload[0]?.payload);
  const title = fromPoll || (label != null && String(label) !== "" ? String(label) : "");
  return (
    <div
      style={{
        ...tipStyle,
        padding: "8px 12px",
        color: CHART.fg,
      }}
    >
      {title ? (
        <p className="m-0 text-sm font-semibold" style={{ color: CHART.fg }}>
          {title}
        </p>
      ) : null}
      {payload.map((row, i) => {
        const raw = Number(row.value);
        if (!Number.isFinite(raw)) return null;
        const key = String(row.dataKey ?? row.name ?? "");
        const shown = String(row.name ?? key);
        const hideName =
          !key ||
          /^value$/i.test(key) ||
          /^value$/i.test(shown) ||
          key === "label" ||
          shown === "label" ||
          (title !== "" && (key === title || shown === title));
        const isMult = /quality|peso|×/i.test(key) || /quality|peso/i.test(shown);
        const body = isMult ? fmtNum(raw, 2) : `${fmtNum(raw)}%`;
        return (
          <p
            key={`${key}-${i}`}
            className="m-0 mt-1 font-mono text-sm tabular-nums"
            style={{ color: CHART.fg }}
          >
            {hideName ? body : `${shown}: ${body}`}
          </p>
        );
      })}
    </div>
  );
}
