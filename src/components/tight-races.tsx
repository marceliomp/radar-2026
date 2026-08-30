import { Link } from "@tanstack/react-router";
import { fmtNum } from "@/lib/format";
import { houseSplit, tightGovernorRaces } from "@/lib/race-hooks";

function radarKeep(prev: Record<string, unknown>): { asOf?: string; hl?: number } {
  const out: { asOf?: string; hl?: number } = {};
  if (typeof prev.asOf === "string" && prev.asOf) out.asOf = prev.asOf;
  if (typeof prev.hl === "number" && Number.isFinite(prev.hl)) out.hl = prev.hl;
  else if (typeof prev.hl === "string" && prev.hl.trim()) {
    const n = Number(prev.hl);
    if (Number.isFinite(n)) out.hl = n;
  }
  return out;
}

export function TightRaces() {
  const races = tightGovernorRaces(6);
  const split = houseSplit();
  const oneEx = split.one.includes("SC") ? "SC" : split.one[0];
  const twoEx = split.two.includes("SP") ? "SP" : split.two[0];

  if (races.length === 0) return null;

  return (
    <section className="tight-block" aria-label="Corridas apertadas">
      <p className="tight-title">Corridas apertadas</p>
      <p className="tight-lede">
        Última casa, não chance. Quase todo estado tem 1 instituto.
        {oneEx && twoEx ? (
          <>
            {" "}
            {oneEx} tem 1 casa, {twoEx} tem 2. Compara.
          </>
        ) : null}
      </p>
      <ul className="tight-list">
        {races.map((r) => (
          <li key={r.uf}>
            <Link
              to="/candidatos"
              search={(prev) => ({
                uf: r.uf,
                cargo: "governador" as const,
                ...radarKeep(prev as Record<string, unknown>),
              })}
              className="tight-row"
            >
              <span className="tight-uf">{r.uf}</span>
              <span className="tight-names">
                {r.aName} × {r.bName}
              </span>
              <span className="tight-score">
                {fmtNum(r.aPct, 0)}×{fmtNum(r.bPct, 0)}
              </span>
              <span className="tight-meta">
                {r.houses === 1 ? "1 casa" : `${r.houses} casas`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {oneEx && twoEx ? (
        <p className="tight-next">
          <Link
            to="/candidatos"
            search={(prev) => ({
              uf: oneEx,
              cargo: "governador" as const,
              ...radarKeep(prev as Record<string, unknown>),
            })}
            className="hook-link"
          >
            Só 1 casa em {oneEx}
          </Link>
          <span className="text-cream/35"> · </span>
          <Link
            to="/candidatos"
            search={(prev) => ({
              uf: twoEx,
              cargo: "governador" as const,
              ...radarKeep(prev as Record<string, unknown>),
            })}
            className="hook-link"
          >
            {twoEx} tem 2, compara
          </Link>
        </p>
      ) : null}
    </section>
  );
}
