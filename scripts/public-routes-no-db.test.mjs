import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const PUBLIC = [
  "src/routes/index.tsx",
  "src/routes/index.lazy.tsx",
  "src/routes/lab.tsx",
  "src/routes/lab.lazy.tsx",
  "src/routes/candidatos.tsx",
  "src/features/radar/public/public-radar-page.tsx",
  "src/features/radar/lab/lab-radar-page.tsx",
  "src/features/races/race-page.tsx",
  "src/features/radar/map/brazil-map.tsx",
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

test("unused auth, database and multiplayer scaffold stays deleted", () => {
  for (const path of ["src/lib/db.ts", "src/lib/auth", "src/lib/multiplayer", "migrations"]) {
    assert.equal(existsSync(path), false, `${path} must not return`);
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

test("capa mounts the national growth curve", () => {
  const page = readFileSync("src/features/radar/public/public-radar-page.tsx", "utf8");
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(page, /GrowthCurve/);
  assert.match(page, /#curva/);
  assert.match(curve, /buildNationalTrend/);
  assert.match(curve, /Lula \(média 3\)/);
  assert.match(curve, /2º turno, Lula/);
  assert.match(curve, /lula2Avg/);
});
