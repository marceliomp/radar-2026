import { pollTimeAxis } from "@/lib/election-calendar";
import type { ForecastPoll } from "@/lib/forecast/engine";

export function ElectionBase({
  asOf,
  polls,
}: {
  asOf: string;
  polls: ForecastPoll[];
}) {
  const bar = pollTimeAxis(polls, asOf);
  if (!bar.ticks.length) return null;
  return (
    <div className="time-axis">
      <div className="time-axis-track" role="img" aria-label={bar.label}>
        <div className="time-axis-fill" style={{ width: `${bar.fill}%` }} />
        {bar.ticks.map((tick) => (
          <span
            key={tick.iso}
            className="time-axis-tick"
            style={{ left: `${tick.left}%` }}
            title={tick.title}
          />
        ))}
        <span className="time-axis-now" style={{ left: `${bar.fill}%` }} />
      </div>
      <div className="time-axis-labels">
        {bar.labels.map((lab) => (
          <span
            key={lab.iso}
            className={`time-axis-lab ${lab.align}`}
            style={{ left: `${lab.left}%` }}
          >
            {lab.text}
          </span>
        ))}
      </div>
    </div>
  );
}
