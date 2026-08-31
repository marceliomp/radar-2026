/**
 * Public forecast HTML is JSON in memory (no PGLite). Let the Vercel CDN
 * hold the SSR for a few minutes so a tweet spike does not stampede isolates.
 * Search-param variants (`asOf`, `hl`, `uf`) are separate cache keys.
 */
const PUBLIC_PATHS = new Set(["/", "/lab", "/candidatos"]);
const CACHE = "public, s-maxage=180, stale-while-revalidate=86400";

interface CacheEvent {
  url: URL;
  req: { method: string };
}

export default async function publicCacheMiddleware(
  event: CacheEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return result;
  if (!PUBLIC_PATHS.has(event.url.pathname)) return result;
  if (!(result instanceof Response)) return result;
  if (result.status !== 200 && result.status !== 307) return result;

  const headers = new Headers(result.headers);
  headers.set("cache-control", CACHE);
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
