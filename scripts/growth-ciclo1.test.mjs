import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  canonicalUrl,
  parseUfCode,
  renderSitemapXml,
  sitemapEntries,
  UF_CHIP_CODES,
} from "../src/lib/site.ts";
import { UF_ORDER } from "../src/data/candidates.ts";

test("parseUfCode rejects blank and junk", () => {
  assert.equal(parseUfCode("sc"), "SC");
  assert.equal(parseUfCode("SC"), "SC");
  assert.equal(parseUfCode(""), undefined);
  assert.equal(parseUfCode("XX"), undefined);
  assert.equal(parseUfCode(undefined), undefined);
});

test("sitemap lists home, lab and every UF cargo pair", () => {
  const xml = renderSitemapXml();
  const committed = readFileSync("public/sitemap.xml", "utf8");
  assert.equal(committed, xml);
  assert.match(xml, /https:\/\/brasilradar.com.br\//);
  assert.match(xml, /https:\/\/brasilradar.com.br\/lab/);
  for (const uf of UF_ORDER) {
    assert.match(xml, new RegExp(`uf=${uf}&amp;cargo=governador|uf=${uf}&cargo=governador`));
    assert.match(xml, new RegExp(`uf=${uf}&amp;cargo=senador|uf=${uf}&cargo=senador`));
  }
  assert.equal(sitemapEntries().length, 2 + UF_ORDER.length * 2);
});

test("canonical omits hl and asOf", () => {
  assert.equal(
    canonicalUrl("/candidatos", { uf: "SP", cargo: "governador" }),
    "https://brasilradar.com.br/candidatos?uf=SP&cargo=governador",
  );
  assert.equal(canonicalUrl("/", { lang: "en" }), "https://brasilradar.com.br/?lang=en");
  assert.equal(canonicalUrl("/"), "https://brasilradar.com.br/");
});

test("robots points at the sitemap", () => {
  const robots = readFileSync("public/robots.txt", "utf8");
  assert.match(robots, /Sitemap: https:\/\/brasilradar.com.br\/sitemap.xml/);
});

test("candidatos search does not force SC", () => {
  const src = readFileSync("src/routes/candidatos.tsx", "utf8");
  assert.match(src, /parseUfCode/);
  assert.doesNotMatch(src, /: "SC"/);
  const nav = readFileSync("src/components/site-nav.tsx", "utf8");
  assert.doesNotMatch(nav, /return "SC"/);
  const race = readFileSync("src/features/races/race-page.tsx", "utf8");
  assert.doesNotMatch(race, /search\.uf \?\? "SC"/);
  assert.match(race, /from "@\/components\/share-bar"/);
});

test("home chips, period presets and analytics events are wired", () => {
  const page = readFileSync("src/features/radar/public/public-radar-page.tsx", "utf8");
  const hl = readFileSync("src/components/half-life-control.tsx", "utf8");
  const hook = readFileSync("src/lib/half-life.ts", "utf8");
  const map = readFileSync("src/features/radar/map/brazil-map.tsx", "utf8");
  const css = readFileSync("src/styles.css", "utf8");
  const pwa = readFileSync("scripts/grok-pwa-shared.mjs", "utf8");
  const meta = readFileSync("src/lib/page-meta.ts", "utf8");
  for (const code of UF_CHIP_CODES) {
    assert.match(page, new RegExp(`UF_CHIP_CODES`));
    assert.ok(UF_CHIP_CODES.includes(code));
  }
  assert.match(page, /uf-chips/);
  assert.match(page, /trackRadar\("uf_click"\)/);
  assert.match(hl, /m\.period\.presetsAria/);
  assert.match(hl, /DEFAULT_HALF_LIFE/);
  const period = readFileSync("src/lib/period.ts", "utf8");
  assert.match(period, /DEFAULT_HALF_LIFE = 15/);
  assert.match(hook, /DEFAULT_HALF_LIFE/);
  assert.doesNotMatch(hook, /yearToDateDays\(todayAsOf\(\)\)/);
  assert.match(hook, /trackRadar\("period_drag"\)/);
  assert.match(map, /trackRadar\("uf_click"\)/);
  assert.match(css, /page-body-home/);
  assert.match(css, /#mapa \{\s*order: 2/);
  assert.match(css, /#novo \{\s*order: 4/);
  assert.match(pwa, /DEFAULT_APP_NAME = "Radar 2026"/);
  assert.match(pwa, /theme_color: "#0c1817"/);
  assert.match(meta, /homeTitle/);
  assert.match(meta, /og:url/);
  assert.match(page, /page-body-home/);
  const ingest = readFileSync("scripts/process-pending.mjs", "utf8");
  const g1 = ingest.indexOf("https://g1.globo.com/politica/");
  const folha = ingest.indexOf("https://www1.folha.uol.com.br/poder/");
  const poder = ingest.indexOf("https://www.poder360.com.br/poderdata/");
  const cnn = ingest.indexOf("https://www.cnnbrasil.com.br/politica/");
  assert.ok(g1 >= 0 && folha >= 0 && g1 < poder && folha < poder);
  assert.ok(g1 < cnn && folha < cnn);
  assert.match(ingest, /skip_host_403/);
  const publish = readFileSync("scripts/publish-polls.mjs", "utf8");
  assert.match(publish, /TODO\(A6\)/);
});
