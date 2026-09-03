import { pollWeekBar } from "@/lib/election-calendar";
import { dateBr } from "@/lib/format";
import type { ForecastPoll } from "@/lib/forecast/engine";

export function ElectionBase({
  asOf,
  polls,
}: {
  asOf: string;
  polls: ForecastPoll[];
}) {
  const bar = pollWeekBar(polls, asOf);
  if (!bar.weeks.length) return null;
  return (
    <div className="week-bar">
      <p className="week-bar-copy">{bar.label}</p>
      <div className="week-bar-row" role="img" aria-label={bar.label}>
        {bar.weeks.map((week) => (
          <span
            key={week.start}
            className={week.count > 0 ? "week-cell on" : "week-cell"}
            title={
              week.count > 0
                ? `${dateBr(week.start)}: ${week.houses.join(", ")}`
                : `${dateBr(week.start)}: nenhuma`
            }
          />
        ))}
      </div>
    </div>
  );
}
