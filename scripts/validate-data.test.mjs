import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { baselineMinCount, validatePolls } from "./validate-data.mjs";

function validPoll(id = "poll-1", protocol = "BR-00001/2026") {
  return {
    id,
    institute: "Casa Teste",
    date: "2026-08-30",
    fieldEnd: "2026-08-29",
    sample: 1200,
    moe: 3,
    mode: "presencial",
    national: true,
    firstRound: { lula: 40, flavio: 35 },
    source: {
      tseProtocol: protocol,
      url: "https://example.com/pesquisa",
      publisher: "example.com",
      publishedAt: "2026-08-30",
      capturedAt: "2026-08-31T12:00:00.000Z",
    },
  };
}

test("validatePolls aceita registro completo", () => {
  assert.deepEqual(validatePolls([validPoll()]), []);
});

test("validatePolls recusa catálogo vazio", () => {
  const errors = validatePolls([]);
  assert.ok(errors.some((error) => error.includes("vazio")));
});

test("validatePolls recusa encolhimento contra a base", () => {
  const shrunk = validatePolls([validPoll()], { minCount: 2 });
  assert.ok(shrunk.some((error) => error.includes("encolheu de 2 para 1")));
  assert.deepEqual(
    validatePolls(
      [validPoll(), validPoll("poll-2", "BR-00002/2026")],
      { minCount: 2 },
    ),
    [],
  );
});

test("baselineMinCount ignora JSON inválido e catálogo vazio", () => {
  assert.equal(baselineMinCount("$(cat /tmp/polls_updated.json)"), null);
  assert.equal(baselineMinCount("[]"), null);
  assert.equal(baselineMinCount("[{},{}]"), 2);
});

test("CLI recusa [] e um catálogo menor que o baseline", () => {
  const dir = mkdtempSync(join(tmpdir(), "polls-validate-"));
  const empty = join(dir, "empty.json");
  const one = join(dir, "one.json");
  const two = join(dir, "two.json");
  writeFileSync(empty, "[]\n");
  writeFileSync(one, `${JSON.stringify([validPoll()])}\n`);
  writeFileSync(
    two,
    `${JSON.stringify([validPoll(), validPoll("poll-2", "BR-00002/2026")])}\n`,
  );
  const broken = join(dir, "broken.json");
  writeFileSync(broken, "$(cat /tmp/polls_updated.json)\n");
  const script = fileURLToPath(new URL("./validate-data.mjs", import.meta.url));
  const catalog = fileURLToPath(new URL("../src/data/polls.json", import.meta.url));
  const rejected = spawnSync(process.execPath, [script, empty], { encoding: "utf8" });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /vazio/);
  const regression = spawnSync(
    process.execPath,
    [script, one, "--baseline", two],
    { encoding: "utf8" },
  );
  assert.notEqual(regression.status, 0);
  assert.match(regression.stderr, /encolheu de 2 para 1/);
  const invalidBase = spawnSync(
    process.execPath,
    [script, catalog, "--baseline", broken],
    { encoding: "utf8" },
  );
  assert.equal(invalidBase.status, 0);
  assert.match(invalidBase.stderr, /baseline sem catálogo válido/);
});

test("validatePolls recusa fonte ausente, percentual inválido e duplicatas", () => {
  const first = validPoll();
  const duplicate = validPoll("poll-1", "BR-00001/2026");
  duplicate.firstRound.lula = 101;
  delete duplicate.source;
  const errors = validatePolls([first, duplicate]);
  assert.ok(errors.some((error) => error.includes("id duplicado")));
  assert.ok(errors.some((error) => error.includes("fora de 0..100")));
  assert.ok(errors.some((error) => error.includes("source estruturado ausente")));
});
