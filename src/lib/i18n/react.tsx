import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { fmtNum, fmtPct, fmtProb, dateFull, dateShort } from "@/lib/format";
import {
  DEFAULT_LOCALE,
  localeHtml,
  parseLocale,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
} from "./locale";
import { messages, type Messages } from "./messages";

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  m: Messages;
  fmt: {
    num: (n: number, digits?: number) => string;
    pct: (n: number, digits?: number) => string;
    prob: (p: number, digits?: number) => string;
    date: (iso: string) => string;
    dateShort: (iso: string) => string;
  };
};

const I18nContext = createContext<I18nValue | null>(null);

function applyDocumentLocale(locale: Locale, title: string, description: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = localeHtml(locale);
  document.title = title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", description);
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.setAttribute("content", locale === "en" ? "en_US" : "pt_BR");
}

export function LangProvider({ children }: { children: ReactNode }) {
  const search = useSearch({ strict: false }) as { lang?: string };
  const navigate = useNavigate();
  const urlLocale = parseLocale(search.lang);
  const locale = urlLocale ?? DEFAULT_LOCALE;
  const m = messages(locale);

  const setLocale = useCallback(
    (next: Locale) => {
      writeStoredLocale(next);
      const go = navigate as unknown as (opts: {
        search: (prev: Record<string, unknown>) => Record<string, unknown>;
        replace: boolean;
      }) => void;
      go({
        search: (prev) => {
          const merged = { ...prev };
          if (next === DEFAULT_LOCALE) delete merged.lang;
          else merged.lang = next;
          return merged;
        },
        replace: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (urlLocale) {
      writeStoredLocale(urlLocale);
      return;
    }
    const stored = readStoredLocale();
    if (stored && stored !== DEFAULT_LOCALE) setLocale(stored);
  }, [urlLocale, setLocale]);

  useEffect(() => {
    applyDocumentLocale(locale, m.meta.title, m.meta.description);
  }, [locale, m.meta.title, m.meta.description]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      m,
      fmt: {
        num: (n, digits = 1) => fmtNum(n, digits, locale),
        pct: (n, digits = 1) => fmtPct(n, digits, locale),
        prob: (p, digits = 1) => fmtProb(p, digits, locale),
        date: (iso) => dateFull(iso, locale),
        dateShort: (iso) => dateShort(iso, locale),
      },
    }),
    [locale, setLocale, m],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const locale = DEFAULT_LOCALE;
    const m = messages(locale);
    return {
      locale,
      setLocale: () => {},
      m,
      fmt: {
        num: (n, digits = 1) => fmtNum(n, digits, locale),
        pct: (n, digits = 1) => fmtPct(n, digits, locale),
        prob: (p, digits = 1) => fmtProb(p, digits, locale),
        date: (iso) => dateFull(iso, locale),
        dateShort: (iso) => dateShort(iso, locale),
      },
    };
  }
  return ctx;
}

export function LangSwitch({ className }: { className?: string }) {
  const { locale, setLocale, m } = useI18n();
  return (
    <div className={className ? `mast-lang ${className}` : "mast-lang"} role="group" aria-label={m.nav.language}>
      <button type="button" aria-pressed={locale === "pt"} onClick={() => setLocale("pt")}>
        PT
      </button>
      <span className="mast-lang-sep" aria-hidden>
        |
      </span>
      <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
        EN
      </button>
    </div>
  );
}
