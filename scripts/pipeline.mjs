#!/usr/bin/env node
/**
 * Pipeline Radar 2026: descobrir protocolos TSE e processar a allowlist.
 * Usado pelo timer systemd e por `npm run polls:pipeline`.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const extra = process.argv.slice(2);

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, "scripts", script), ...extra], {
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
