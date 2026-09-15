#!/usr/bin/env node
/**
 * Pipeline Radar 2026: TSE -> votos parseáveis -> promote ready -> git push (Vercel).
 * Runs on a dedicated main worktree (see sync-ingest-main.mjs + systemd unit).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, "scripts", script), ...args], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exit ${code}`));
    });
  });
}

try {
  await run("sync-ingest-main.mjs");
  await run("ingest-polls.mjs");
  await run("process-pending.mjs");
  await run("process-races.mjs");
  await run("promote-poll.mjs", ["--all"]);
  await run("publish-polls.mjs");
  await run("ingest-health.mjs", ["--git"]);
  process.stdout.write("[pipeline] ok\n");
} catch (err) {
  process.stderr.write(`[pipeline] FATAL: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
}
