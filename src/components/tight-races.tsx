import { Link } from "@tanstack/react-router";
import { fmtNum } from "@/lib/format";
import { keepRadarSearch, useI18n } from "@/lib/i18n";
import { exampleGovernorUfs, ufTemCasas, tightGovernorRaces } from "@/lib/race-hooks";

export function TightRaces() {
  const { locale, m, fmt } = useI18n();
  const races = tightGovernorRaces(6);
  const { one: oneEx, two: twoEx } = exampleGovernorUfs();

  if (races.length === 0) return null;

  return (
    <section className="tight-block" aria-label={m.tight.aria}>
      <p className="tight-title">{m.tight.title}</p>
      <p className="tight-lede">
        {m.tight.lede}
        {oneEx && twoEx ? (
          <>
            {" "}
            {ufTemCasas(oneEx, locale)}, {ufTemCasas(twoEx, locale)}. {locale === "en" ? "Compare." : "Compara."}
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
                ...keepRadarSearch(prev as Record<string, unknown>),
              })}
              className="tight-row"
            >
              <span className="tight-uf">{r.uf}</span>
              <span className="tight-names">
                {r.aName} × {r.bName}
              </span>
              <span className="tight-score">
                {fmt.num(r.aPct, 0)}×{fmt.num(r.bPct, 0)}
              </span>
              <span className="tight-meta">
                {r.houses === 1 ? m.tight.oneHouse : m.tight.nHouses(r.houses)}
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
              ...keepRadarSearch(prev as Record<string, unknown>),
            })}
            className="hook-link"
          >
            {m.tight.onlyOne(oneEx)}
          </Link>
          <span className="text-cream/35"> · </span>
          <Link
            to="/candidatos"
            search={(prev) => ({
              uf: twoEx,
              cargo: "governador" as const,
              ...keepRadarSearch(prev as Record<string, unknown>),
            })}
            className="hook-link"
          >
            {m.tight.compare(ufTemCasas(twoEx, locale))}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
