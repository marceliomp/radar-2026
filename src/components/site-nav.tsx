import { Link, useRouterState, useSearch } from "@tanstack/react-router";
import { LangSwitch, keepRadarSearch, useI18n } from "@/lib/i18n";
import { parseUfCode, readStoredUf } from "@/lib/site";
import { cn } from "@/lib/utils";

const linkClass = "mast-link";

function lastUf(prevUf: unknown): string | undefined {
  return parseUfCode(prevUf) ?? readStoredUf();
}

export function SiteNav({ className }: { className?: string }) {
  const { m } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as {
    asOf?: string;
    hl?: number;
    uf?: string;
    cargo?: string;
  };
  const isPres = pathname === "/";
  const onCandidatos = pathname === "/candidatos";
  const isGov = onCandidatos && search.cargo !== "senador";
  const isSen = onCandidatos && search.cargo === "senador";
  const isLab = pathname === "/lab";

  return (
    <nav className={cn("mast", className)} aria-label={m.nav.aria}>
      <Link to="/" className="mast-mark">
        {m.nav.mark}
      </Link>
      <div className="mast-links">
        <Link
          to="/"
          search={(prev) => keepRadarSearch(prev as Record<string, unknown>)}
          className={cn(linkClass, isPres ? "mast-link-active" : "mast-link-idle")}
        >
          {m.nav.president}
        </Link>
        <Link
          to="/candidatos"
          search={(prev) => {
            const p = prev as Record<string, unknown>;
            const uf = lastUf(p.uf);
            return {
              ...(uf ? { uf } : {}),
              cargo: "governador" as const,
              ...keepRadarSearch(p),
            };
          }}
          className={cn(linkClass, isGov ? "mast-link-active" : "mast-link-idle")}
        >
          {m.nav.governors}
        </Link>
        <Link
          to="/candidatos"
          search={(prev) => {
            const p = prev as Record<string, unknown>;
            const uf = lastUf(p.uf);
            return {
              ...(uf ? { uf } : {}),
              cargo: "senador" as const,
              ...keepRadarSearch(p),
            };
          }}
          className={cn(linkClass, isSen ? "mast-link-active" : "mast-link-idle")}
        >
          {m.nav.senators}
        </Link>
        <Link
          to="/lab"
          search={(prev) => keepRadarSearch(prev as Record<string, unknown>)}
          className={cn(linkClass, isLab ? "mast-link-active" : "mast-link-idle")}
        >
          {m.nav.method}
        </Link>
      </div>
      <LangSwitch />
    </nav>
  );
}
