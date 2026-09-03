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
  assert.match(curve, /seg-btn/);
  assert.match(curve, /Nesta pesquisa/);
  assert.match(curve, /ponto: nesta pesquisa/);
  assert.match(curve, /linha: média das 3 últimas/);
  assert.doesNotMatch(curve, /Lula, pesquisa/);
});

test("hero states chance not vote intention", () => {
  const page = readFileSync("src/features/radar/public/public-radar-page.tsx", "utf8");
  assert.match(page, /<h1 className="hero-method">/);
  assert.match(page, /Chance de ser presidente/);
  assert.match(page, /Não é intenção de voto/);
  assert.match(page, /skip-link/);
  assert.match(page, /id="conteudo"/);
  const chanceAt = page.indexOf("Chance de ser presidente");
  const scoreAt = page.indexOf("hero-score");
  assert.ok(chanceAt >= 0 && chanceAt < scoreAt, "chance title must sit above the score");
});

test("curve key sits above the chart", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  const keyAt = curve.indexOf("<CurveKey />");
  const chartAt = curve.indexOf("<ResponsiveContainer");
  assert.ok(keyAt >= 0 && chartAt >= 0 && keyAt < chartAt, "legend must sit above the chart");
});

test("public home scan path is chance, intention, news, method", () => {
  const page = readFileSync("src/features/radar/public/public-radar-page.tsx", "utf8");
  const nav = readFileSync("src/components/site-nav.tsx", "utf8");
  const lab = readFileSync("src/features/radar/lab/lab-radar-page.tsx", "utf8");
  assert.match(nav, /to="\/lab"/);
  assert.match(nav, />\s*Método\s*</);
  assert.match(lab, /<SiteNav/);
  assert.match(page, /id="media"/);
  assert.match(page, /id="metodo"/);
  assert.match(page, /Intenção de voto/);
  const chrome = page.slice(page.indexOf("hero-chrome"), page.indexOf("hero-score"));
  assert.doesNotMatch(chrome, /HalfLifeControl/);
  assert.match(page, /<HalfLifeControl/);
  assert.ok(page.indexOf('id="media"') < page.indexOf('id="novo"'), "intention before latest poll");
  assert.ok(page.indexOf("GrowthCurve") < page.indexOf('id="mapa"'), "curve before map");
  assert.ok(page.indexOf('id="mapa"') < page.indexOf('id="metodo"'), "map before method");
});

test("home curve tooltip uses field range helper", () => {
  const curve = readFileSync("src/features/radar/public/growth-curve.tsx", "utf8");
  assert.match(curve, /fieldPeriodLine/);
  assert.doesNotMatch(curve, /Campo /);
});

test("latest poll is a public ficha without ingest jargon", () => {
  const page = readFileSync("src/features/radar/public/public-radar-page.tsx", "utf8");
  assert.match(page, /fieldPeriodLine/);
  assert.doesNotMatch(page, />Campo /);
  assert.match(page, /source\?\.tseProtocol/);
  assert.match(page, /pairTightnessLine/);
  assert.match(page, /<VisitHook/);
  assert.doesNotMatch(page, /latestNational\.notes/);
  assert.doesNotMatch(page, /Allowlist/);
  assert.doesNotMatch(page, /número ainda não extraído/);
  const visitAt = page.indexOf("<VisitHook");
  const scoreAt = page.indexOf("hero-score");
  const mainAt = page.indexOf('id="conteudo"');
  assert.ok(visitAt > scoreAt && visitAt < mainAt, "visit hook stays on the public hero");
});

test("same-day houses all get a ficha", () => {
  const page = readFileSync("src/features/radar/public/public-radar-page.tsx", "utf8");
  const helper = readFileSync("src/lib/latest-day.ts", "utf8");
  assert.match(helper, /export function pollsOnLatestDay/);
  assert.match(page, /pollsOnLatestDay/);
  assert.match(page, /pesquisas no mesmo dia/);
  assert.match(page, /LatestHouseCard/);
  assert.match(page, /fieldPeriodLine\(poll.fieldStart, poll.fieldEnd\)/);
});
