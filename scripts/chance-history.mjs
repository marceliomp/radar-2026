#!/usr/bin/env node
/**
 * Append today's published hero chance to src/data/chance-history.json.
 * Called from publish-polls when polls move. Does not invent poll votes.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HISTORY_PATH = join(ROOT, "src/data/chance-history.json");
const POLLS_PATH = join(ROOT, "src/data/polls.json");

function round1(n) {
  return Math.round(n * 10) / 10;
}

function gitShort() {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return undefined;
  }
}

/** Keep only the last `windowDays` calendar points ending at the tip. */
export function trimHistoryWindow(points, windowDays) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length || !windowDays || windowDays < 1) return sorted;
  if (sorted.length <= windowDays) return sorted;
  return sorted.slice(sorted.length - windowDays);
}

export function upsertPoint(file, point) {
  const points = Array.isArray(file.points) ? file.points : [];
  const windowDays = file.windowDays ?? 60;
  const row = {
    date: point.date,
    lula: round1(point.lula),
    flavio: round1(point.flavio),
    source: point.source,
    ...(point.commit ? { commit: point.commit } : {}),
  };
  const next = trimHistoryWindow(
    [...points.filter((p) => p.date !== row.date), row],
    windowDays,
  );
  return {
    version: file.version ?? 1,
    windowDays,
    points: next,
  };
}

export async function computePublishedChance(asOf) {
  const polls = JSON.parse(readFileSync(POLLS_PATH, "utf8"));
  const { runForecast, DEFAULT_CONFIG, todayAsOf } = await import(
    "../src/lib/forecast/engine.ts"
  );
  const day = asOf ?? todayAsOf();
  const snap = runForecast(polls, {
    ...DEFAULT_CONFIG,
    asOf: day,
    halfLifeDays: 5,
    simulations: 2000,
  });
  return {
    date: day,
    lula: round1(snap.probs.lulaWinsElection * 100),
    flavio: round1(snap.probs.flavioWinsElection * 100),
    source: "promote",
    commit: gitShort(),
  };
}

export async function appendPublishedChance(asOf) {
  const file = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
  const point = await computePublishedChance(asOf);
  const next = upsertPoint(file, point);
  writeFileSync(HISTORY_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return point;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const asOf = process.argv.includes("--asOf")
    ? process.argv[process.argv.indexOf("--asOf") + 1]
    : undefined;
  const point = await appendPublishedChance(asOf);
  process.stdout.write(
    `[chance-history] ${point.date} Lula ${point.lula} Flávio ${point.flavio}\n`,
  );
}
