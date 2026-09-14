import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPollSource } from '../src/features/races/poll-citation.ts';

test('public citation exposes structured URL and TSE, never operational notes', () => {
  const citation = publicPollSource({ source: { url: 'https://example.com/poll', tseProtocol: 'BR-04076/2026' }, notes: '/cursor/stores/secret.png sem chave no schema' });
  assert.deepEqual(citation, { url: 'https://example.com/poll', protocol: 'BR-04076/2026' });
});
test('legacy state notes yield only public URL and registration', () => {
  assert.deepEqual(publicPollSource({ notes: 'Ingest internal. TSE DF-09600/2026. https://example.com/poll/' }), { url: 'https://example.com/poll/', protocol: 'DF-09600/2026' });
});
test('missing and unsafe citations are not rendered as links', () => {
  for (const url of ['javascript:alert(1)', 'file:///root/source.png', '/root/source.png', null]) assert.equal(publicPollSource({ source: { url } }).url, undefined);
  assert.deepEqual(publicPollSource({ notes: 'do not invent data /root/source.png' }), { url: undefined, protocol: undefined });
});
