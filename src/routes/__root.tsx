import {
  Link,
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  retainSearchParams,
  useSearch,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { MastBar } from "@/components/site-nav";
import { parseAsOfSearch } from "@/lib/as-of";
import { LangProvider, localeHtml, messages, parseLocale, useI18n } from "@/lib/i18n";
import appCss from "../styles.css?url";

const ogImage = "https://brasilradar.com.br/og.jpg";

export const Route = createRootRoute({
  validateSearch: parseAsOfSearch,
  search: {
    middlewares: [retainSearchParams(["asOf", "hl", "lang"])],
  },
  head: ({ match }) => {
    const lang = parseLocale((match.search as { lang?: string }).lang) ?? "pt";
    // Fallback title/description: only surfaces when no matched child route
    // provides its own (i.e. an unknown path rendering notFoundComponent).
    const notFound = messages(lang).notFound;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "apple-mobile-web-app-title", content: "Radar 2026" },
        { name: "theme-color", content: "#0c1817" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: lang === "en" ? "en_US" : "pt_BR" },
        { property: "og:locale:alternate", content: lang === "en" ? "pt_BR" : "en_US" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:image", content: ogImage },
        { title: notFound.title },
        { name: "description", content: notFound.description },
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "stylesheet", href: appCss },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap",
        },
        { rel: "manifest", href: "/__grok/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      ],
    };
  },
  component: RootDocument,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
  const { m } = useI18n();
  return (
    <div className="pb-[max(4rem,env(safe-area-inset-bottom))]">
      <div className="page-body mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 pt-5 sm:px-6 sm:pt-8">
        <MastBar className="mb-5" />
        <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="kicker">{m.notFound.kicker}</p>
          <h1 className="story-title text-3xl">{m.notFound.heading}</h1>
          <p className="max-w-md text-sm text-muted">{m.notFound.body}</p>
          <Link to="/" className="hook-link mt-2">
            {m.notFound.cta}
          </Link>
        </main>
      </div>
    </div>
  );
}

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
