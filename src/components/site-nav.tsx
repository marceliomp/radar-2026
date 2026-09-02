import { Link, useRouterState, useSearch } from "@tanstack/react-router";
import { UF_ORDER } from "@/data/candidates";
import { cn } from "@/lib/utils";

const UF_SET = new Set(UF_ORDER);
const linkClass = "mast-link";

function lastUf(prevUf: unknown): string {
  if (typeof prevUf === "string") {
    const code = prevUf.trim().toUpperCase();
    if (UF_SET.has(code)) return code;
  }
  try {
    const stored = sessionStorage.getItem("radar2026:uf")?.toUpperCase() ?? "";
    if (UF_SET.has(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "SC";
}

function radarFrom(prev: Record<string, unknown>): {
  asOf?: string;
  hl?: number;
} {
  const out: { asOf?: string; hl?: number } = {};
  if (typeof prev.asOf === "string" && prev.asOf) out.asOf = prev.asOf;
  if (typeof prev.hl === "number" && Number.isFinite(prev.hl)) out.hl = prev.hl;
  else if (typeof prev.hl === "string" && prev.hl.trim()) {
    const n = Number(prev.hl);
    if (Number.isFinite(n)) out.hl = n;
  }
  return out;
}

export function SiteNav({ className }: { className?: string }) {
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
    <nav className={cn("mast", className)} aria-label="Radar 2026">
      <Link to="/" className="mast-mark">
        Radar 2026
      </Link>
      <div className="mast-links">
        <Link
          to="/"
          search={(prev) => radarFrom(prev as Record<string, unknown>)}
          className={cn(linkClass, isPres ? "mast-link-active" : "mast-link-idle")}
        >
          Presidente
        </Link>
        <Link
          to="/candidatos"
          search={(prev) => {
            const p = prev as Record<string, unknown>;
            return {
              uf: lastUf(p.uf),
              cargo: "governador" as const,
              ...radarFrom(p),
            };
          }}
          className={cn(linkClass, isGov ? "mast-link-active" : "mast-link-idle")}
        >
          Governadores
        </Link>
        <Link
          to="/candidatos"
          search={(prev) => {
            const p = prev as Record<string, unknown>;
            return {
              uf: lastUf(p.uf),
              cargo: "senador" as const,
              ...radarFrom(p),
            };
          }}
          className={cn(linkClass, isSen ? "mast-link-active" : "mast-link-idle")}
        >
          Senadores
        </Link>
        <Link
          to="/lab"
          search={(prev) => radarFrom(prev as Record<string, unknown>)}
          className={cn(linkClass, isLab ? "mast-link-active" : "mast-link-idle")}
        >
          Método
        </Link>
      </div>
    </nav>
  );
}
