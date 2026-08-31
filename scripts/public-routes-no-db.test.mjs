import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const PUBLIC = [
  "src/routes/index.tsx",
  "src/routes/lab.tsx",
  "src/routes/candidatos.tsx",
  "src/components/forecast-dashboard.tsx",
  "src/components/race-dashboard.tsx",
  "src/components/candidates-board.tsx",
  "src/data/polls.ts",
  "src/data/candidates.ts",
];

const DB = /@\/lib\/db|getSql\(|ensureDbReady\(|PGlite|createServerFn/;

test("public forecast routes do not import PGLite or server SQL", () => {
  for (const file of PUBLIC) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, DB, `${file} must stay JSON-only`);
  }
});

test("CDN cache middleware covers capa, lab and candidatos", () => {
  const text = readFileSync("server/middleware/public-cache.ts", "utf8");
  assert.match(text, /s-maxage/);
  assert.match(text, /"\/"/);
  assert.match(text, /"\/lab"/);
  assert.match(text, /"\/candidatos"/);
});

test("root shell mounts Vercel Analytics", () => {
  const text = readFileSync("src/routes/__root.tsx", "utf8");
  assert.match(text, /@vercel\/analytics\/react/);
  assert.match(text, /<Analytics/);
  assert.match(text, /\/_vercel\/insights\/script\.js/);
});
