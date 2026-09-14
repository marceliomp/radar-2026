import test from 'node:test';
import assert from 'node:assert/strict';
import { alignChanceWithCurrentModel, buildChanceStepSeries, chanceAxisStart } from '../src/lib/chance-history.ts';

const points = [
  {date:'2026-07-20', lula:55, flavio:45, source:'replay'},
  {date:'2026-09-01', lula:50, flavio:50, source:'replay'},
  {date:'2026-09-14', lula:43.2, flavio:56.8, source:'replay'},
];
test('alternative half-lives never mix a hero estimate into fixed model 5 history', () => {
  const steps = buildChanceStepSeries(points, '2026-09-14');
  for (const halfLife of [10,15,30,90]) {
    assert.deepEqual(alignChanceWithCurrentModel(steps, '2026-09-14', halfLife, {lula:90,flavio:10}), steps);
  }
});
test('model 5 current estimate aligns only current day and does not mutate archive', () => {
  const steps = buildChanceStepSeries(points, '2026-09-14');
  const next = alignChanceWithCurrentModel(steps, '2026-09-14', 5, {lula:44,flavio:56});
  assert.deepEqual(next.slice(0,-1), steps.slice(0,-1));
  assert.equal(next.at(-1).lula,44);
  assert.equal(steps.at(-1).lula,43.2);
  assert.equal(next.at(-1).publishedOn,'2026-09-14');
  assert.deepEqual(alignChanceWithCurrentModel(steps, '2026-09-15', 5, {lula:44,flavio:56}), steps);
});
test('display window changes history range without changing values on shared dates', () => {
  const full = buildChanceStepSeries(points,'2026-09-14',60);
  const short = buildChanceStepSeries(points,'2026-09-14',30);
  assert.equal(chanceAxisStart('2026-09-14',30),'2026-08-15');
  assert.ok(full.length > short.length);
  for (const row of short) assert.deepEqual(row,full.find(p=>p.date===row.date));
});
