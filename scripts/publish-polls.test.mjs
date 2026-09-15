import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { restoreSnapshot, snapshotPaths } from "./publish-polls.mjs";

test("snapshotPaths / restoreSnapshot round-trip", () => {
  const root = mkdtempSync(join(tmpdir(), "radar-publish-"));
  mkdirSync(join(root, "src/data"), { recursive: true });
  const path = "src/data/polls.json";
  writeFileSync(join(root, path), '[{"id":"a"}]\n');
  const snap = snapshotPaths([path], root);
  assert.equal(snap.get(path), '[{"id":"a"}]\n');
  writeFileSync(join(root, path), "[]\n");
  restoreSnapshot(snap, root);
  assert.equal(readFileSync(join(root, path), "utf8"), '[{"id":"a"}]\n');
});
