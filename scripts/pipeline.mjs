#!/usr/bin/env node
/**
 * Pipeline Radar 2026: TSE -> allowlist -> promote ready -> git push (Vercel).
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

await run("ingest-polls.mjs");
await run("process-pending.mjs");
await run("process-races.mjs");
await run("promote-poll.mjs", ["--all"]);
await run("publish-polls.mjs");
