#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { todayIso } from "./process-pending.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function ingestHealthIssues({ polls, races, today }) {
  const issues = [];
  for (const poll of polls) {
    if (poll.date > today || poll.fieldEnd > today) issues.push(`${poll.id}: data futura`);
  }
  for (const poll of races.polls ?? []) {
    if (poll.date > today || poll.fieldEnd > today) issues.push(`${poll.id}: data futura`);
  }
  const visible = polls.filter(
    (poll) => poll.national && poll.date <= today && poll.fieldEnd <= today,
  );
  visible.sort((a, b) => b.date.localeCompare(a.date) || b.fieldEnd.localeCompare(a.fieldEnd));
  const latest = visible[0];
  if (latest && (latest.secondRound?.lula == null || latest.secondRound?.flavio == null)) {
    issues.push(`${latest.id}: 2T ausente`);
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("ingest-health.mjs")) {
  const polls = JSON.parse(readFileSync(join(ROOT, "src/data/polls.json"), "utf8"));
  const races = JSON.parse(readFileSync(join(ROOT, "src/data/race-polls.json"), "utf8"));
  const issues = ingestHealthIssues({ polls, races, today: todayIso() });
  if (process.argv.includes("--git")) {
    execSync("git fetch origin main", { cwd: ROOT, stdio: "pipe" });
    const head = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
    const origin = execSync("git rev-parse origin/main", { cwd: ROOT, encoding: "utf8" }).trim();
    if (head !== origin) {
      issues.push(`git HEAD ${head.slice(0, 7)} != origin/main ${origin.slice(0, 7)}`);
    }
  }
  if (issues.length) {
    for (const row of issues) process.stderr.write(`[ingest-health] ${row}\n`);
    process.exit(1);
  }
  process.stdout.write("[ingest-health] ok\n");
}
