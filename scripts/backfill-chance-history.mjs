#!/usr/bin/env node
/**
 * Backfill chance-history.json by replaying the public engine (hl=5)
 * for each of the last 60 America/Sao_Paulo days.
 * Does not invent poll votes. Labels points as source: "replay".
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { upsertPoint } from "./chance-history.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HISTORY_PATH = join(ROOT, "src/data/chance-history.json");
const POLLS_PATH = join(ROOT, "src/data/polls.json");

const WINDOW_DAYS = 60;
const HALF_LIFE = 5;
const SIMS = 4000;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function shiftIso(iso, days) {
  const ms = new Date(`${iso}T12:00:00-03:00`).getTime() + days * 86_400_000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function dayRangeInclusive(endIso, nDays) {
  const out = [];
  for (let i = nDays - 1; i >= 0; i--) out.push(shiftIso(endIso, -i));
  return out;
}

export async function replayChanceForDay(polls, runForecast, DEFAULT_CONFIG, day) {
  const snap = runForecast(polls, {
    ...DEFAULT_CONFIG,
    asOf: day,
    halfLifeDays: HALF_LIFE,
    simulations: SIMS,
  });
  return {
    date: day,
    lula: round1(snap.probs.lulaWinsElection * 100),
    flavio: round1(snap.probs.flavioWinsElection * 100),
    source: "replay",
  };
}

export async function backfillChanceHistory({
  endAsOf,
  windowDays = WINDOW_DAYS,
  write = true,
} = {}) {
  const polls = JSON.parse(readFileSync(POLLS_PATH, "utf8"));
  const { runForecast, DEFAULT_CONFIG, todayAsOf } = await import(
    "../src/lib/forecast/engine.ts"
  );
  const end = endAsOf ?? todayAsOf();
  const days = dayRangeInclusive(end, windowDays);
  let file = {
    version: 1,
    windowDays: WINDOW_DAYS,
    points: [],
  };
  for (const day of days) {
    const point = await replayChanceForDay(polls, runForecast, DEFAULT_CONFIG, day);
    file = upsertPoint(file, point);
    process.stdout.write(
      `[backfill] ${point.date} Lula ${point.lula} Flávio ${point.flavio}\n`,
    );
  }
  if (write) {
    writeFileSync(HISTORY_PATH, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  }
  return file;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const endAsOf = process.argv.includes("--asOf")
    ? process.argv[process.argv.indexOf("--asOf") + 1]
    : undefined;
  const file = await backfillChanceHistory({ endAsOf });
  const first = file.points[0];
  const last = file.points.at(-1);
  const sep10 = file.points.find((p) => p.date === "2026-09-10");
  process.stdout.write(
    `[backfill] done points=${file.points.length} range=${first?.date}..${last?.date}` +
      (sep10 ? ` sep10 Flávio=${sep10.flavio}` : "") +
      `\n`,
  );
}
