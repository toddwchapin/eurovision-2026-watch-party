const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const scoring = require('../shared/scoring.js');
const vote = { vocals: 0, performance: 1, song: 2, original: 3, stage: 4, total: 10, remind: '' };
test('complete integer contract accepts explicit zero, rejects partial, fractional and bad total', () => {
  assert.equal(scoring.valid(vote), true);
  for (const f of scoring.fields) { assert.equal(scoring.valid({ ...vote, [f]: null }), false); assert.equal(scoring.valid({ ...vote, [f]: 2.5 }), false); }
  assert.equal(scoring.valid({ ...vote, total: 12 }), false);
  assert.equal(scoring.valid({ ...vote, unknown: 1 }), false);
  assert.equal(scoring.valid({ ...vote, remind: 'x'.repeat(201) }), false);
});
test('local data isolated by party/auth UID/contest/kind; corruption safe', () => {
  const data = new Map(); const window = {};
  vm.runInNewContext(fs.readFileSync('shared/storage.js', 'utf8'), { window, localStorage: { getItem: k => data.get(k), setItem: (k,v) => data.set(k,v) } });
  const S = window.EurovisionStorage;
  const keys = [S.key('ABCDEF', 'a', 'semi-1', 'votes'), S.key('ABCDEF', 'b', 'semi-1', 'votes'), S.key('GHIJKL', 'a', 'semi-1', 'votes'), S.key('ABCDEF', 'a', 'semi-2', 'votes'), S.key('ABCDEF', 'a', 'semi-1', 'drafts')];
  assert.equal(new Set(keys).size, 5); S.write(keys[0], vote); assert.equal(S.read(keys[0]).total, 10);
  data.set(keys[1], 'corrupt'); assert.equal(Object.keys(S.read(keys[1])).length, 0);
});
test('stage filtering excludes invalid and non-performing acts; no flat legacy claim', () => {
  globalThis.EUROVISION_DATA = { shows: { 'semi-1': ['MD'] } };
  assert.deepEqual(scoring.stageVotes({ 'semi-1': { MD: vote, XX: vote, SE: { total: 5 } } }, 'semi-1'), { MD: vote });
  assert.deepEqual(scoring.stageVotes({ MD: vote }, 'semi-1'), {});
});
