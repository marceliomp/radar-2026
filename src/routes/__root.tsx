import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  retainSearchParams,
  useSearch,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { parseAsOfSearch } from "@/lib/as-of";
import { LangProvider, localeHtml, messages, parseLocale } from "@/lib/i18n";
import appCss from "../styles.css?url";

const ogImage = "https://brasilradar.com.br/og.jpg";

export const Route = createRootRoute({
  validateSearch: parseAsOfSearch,
  search: {
    middlewares: [retainSearchParams(["asOf", "hl", "lang"])],
  },
  head: ({ match }) => {
    const lang = parseLocale((match.search as { lang?: string }).lang) ?? "pt";
    const copy = messages(lang);
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: copy.meta.title },
        { name: "description", content: copy.meta.description },
        { name: "apple-mobile-web-app-title", content: "Radar 2026" },
        { name: "theme-color", content: "#0c1817" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Radar 2026" },
        { name: "twitter:description", content: copy.meta.description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: copy.meta.title },
        { property: "og:description", content: copy.meta.description },
        { property: "og:locale", content: lang === "en" ? "en_US" : "pt_BR" },
        { property: "og:locale:alternate", content: lang === "en" ? "pt_BR" : "en_US" },
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
    };
  },
  component: RootDocument,
});

function RootDocument() {
  const search = useSearch({ strict: false }) as { lang?: string };
  const locale = parseLocale(search.lang) ?? "pt";
  return (
    <html lang={localeHtml(locale)} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script defer src="/_vercel/insights/script.js"></script>
        <meta property="og:image" content="https://brasilradar.com.br/og.jpg" />
        <meta name="twitter:image" content="https://brasilradar.com.br/og.jpg" />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <LangProvider>
          <Outlet />
        </LangProvider>
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}
