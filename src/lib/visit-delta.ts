import { dateShort, fieldPeriodLine, fmtDelta, round } from "./format.ts";
import type { Locale } from "./i18n/locale.ts";
import { messages } from "./i18n/messages.ts";

export const VISIT_KEY = "radar2026.visit.v1";

export type VisitSnap = {
  at: number;
  pLula: number;
  pFlavio: number;
  hl: number;
  newestId: string;
};

export type VisitKind = "first" | "stale" | "moved" | "new-poll" | "hl";

export type VisitView = {
  kind: VisitKind;
  line: string;
  dLula: number;
  dFlavio: number;
  hours: number;
};

export function readVisit(raw: string | null): VisitSnap | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<VisitSnap>;
    if (typeof o.at !== "number" || !Number.isFinite(o.at)) return null;
    if (typeof o.pLula !== "number" || typeof o.pFlavio !== "number") return null;
    return {
      at: o.at,
      pLula: o.pLula,
      pFlavio: o.pFlavio,
      hl: typeof o.hl === "number" ? o.hl : 14,
      newestId: typeof o.newestId === "string" ? o.newestId : "",
    };
  } catch {
    return null;
  }
}

export function writeVisit(snap: VisitSnap): string {
  return JSON.stringify(snap);
}

function chanceLine(dLula: number, locale: Locale): string {
  return messages(locale).visit.chance(fmtDelta(dLula, 1, locale));
}

export function latestDayKey(ids: string[]): string {
  return ids.slice().sort().join("|");
}

export function visitView(
  prev: VisitSnap | null,
  now: {
    pLula: number;
    pFlavio: number;
    hl: number;
    newestId: string;
    nowMs?: number;
  },
  locale: Locale = "pt",
): VisitView {
  const copy = messages(locale).visit;
  const nowMs = now.nowMs ?? Date.now();
  const dLula = prev ? round(now.pLula - prev.pLula, 1) : 0;
  const dFlavio = prev ? round(now.pFlavio - prev.pFlavio, 1) : 0;
  const hours = prev ? (nowMs - prev.at) / 3_600_000 : 0;
  const moved = Math.abs(dLula) >= 0.3 || Math.abs(dFlavio) >= 0.3;
  const newPoll = Boolean(prev?.newestId && now.newestId && prev.newestId !== now.newestId);

  if (!prev) {
    return {
      kind: "first",
      line: copy.first,
      dLula: 0,
      dFlavio: 0,
      hours: 0,
    };
  }

  if (newPoll) {
    return {
      kind: "new-poll",
      line: moved ? copy.newMoved(chanceLine(dLula, locale)) : copy.newFlat,
      dLula,
      dFlavio,
      hours,
    };
  }

  if (prev.hl !== now.hl && moved) {
    return {
      kind: "hl",
      line: copy.hl(now.hl, chanceLine(dLula, locale)),
      dLula,
      dFlavio,
      hours,
    };
  }

  if (moved && hours >= 1) {
    return {
      kind: "moved",
      line: copy.moved(chanceLine(dLula, locale)),
      dLula,
      dFlavio,
      hours,
    };
  }

  if (hours < 0.5) {
    return {
      kind: "stale",
      line: copy.reload,
      dLula,
      dFlavio,
      hours,
    };
  }

  return {
    kind: "stale",
    line: hours >= 24 ? copy.staleDay : copy.stale,
    dLula,
    dFlavio,
    hours,
  };
}

function shortHouse(name: string): string {
  return name.split("/")[0] ?? name;
}

export function fileStamp(
  polls:
    | {
        institute: string;
        date?: string;
        fieldStart?: string;
        fieldEnd: string;
      }[]
    | {
        institute: string;
        date?: string;
        fieldStart?: string;
        fieldEnd: string;
      }
    | null,
  locale: Locale = "pt",
): string {
  const copy = messages(locale).visit;
  const rows = !polls ? [] : Array.isArray(polls) ? polls : [polls];
  if (!rows.length) return copy.none;
  const houses = rows.map((poll) => shortHouse(poll.institute));
  if (rows.length === 1) {
    const periodo = fieldPeriodLine(rows[0]!.fieldStart, rows[0]!.fieldEnd, locale);
    return copy.last(houses[0]!, periodo);
  }
  const day = dateShort(rows[0]?.date, locale);
  return day ? copy.lastsDay(day, houses.join(", ")) : copy.lasts(houses.join(", "));
}
