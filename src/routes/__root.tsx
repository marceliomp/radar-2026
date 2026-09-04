import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  retainSearchParams,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { parseAsOfSearch } from "@/lib/as-of";
import appCss from "../styles.css?url";

const APP_NAME = "Radar 2026";
const APP_DESC =
  "Não é pesquisa. Agregador independente da eleição: presidente, governador e senador. Chance de ser presidente, mapa por estado, lista de urna.";
const ogImage = "https://brasilradar.com.br/og.jpg";

export const Route = createRootRoute({
  validateSearch: parseAsOfSearch,
  search: {
    middlewares: [retainSearchParams(["asOf", "hl"])],
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Radar 2026 · não é pesquisa" },
      { name: "description", content: APP_DESC },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#0c1817" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESC },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Radar 2026 · não é pesquisa" },
      { property: "og:description", content: APP_DESC },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:url", content: "https://brasilradar.com.br" },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script defer src="/_vercel/insights/script.js"></script>
        <meta property="og:image" content="https://brasilradar.com.br/og.jpg" />
        <meta name="twitter:image" content="https://brasilradar.com.br/og.jpg" />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <Outlet />
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}
