import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, update, remove, onValue, serverTimestamp, increment } from 'firebase/database';
import sessionHarness from './session-harness.cjs';
if (process.env.FIREBASE_DATABASE_EMULATOR_HOST !== '127.0.0.1:9000') throw new Error('Rules tests require localhost emulator');
let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-eurovision', database: { host: '127.0.0.1', port: 9000, rules: fs.readFileSync(process.env.RULES_FILE || 'database.rules.json', 'utf8') } }); });
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async ctx => set(ref(ctx.database(), '2026/parties/ABCDEF'), { meta: { hostUid: 'host', createdAt: Date.now(), expiresAt: Date.now() + 600000 }, members: { host: true, guest: true }, users: { host: { name: 'Host' }, guest: { name: 'Guest' } } }));
});
const db = uid => env.authenticatedContext(uid).database();
const base = '2026/parties/ABCDEF';
const vote = (extra={}) => ({ vocals: 0, performance: 1, song: 2, original: 3, stage: 4, total: 10, remind: '', epoch: 0, updatedAt: serverTimestamp(), ...extra });
test('anonymous unauthenticated and nonmember reads/writes denied; members read and own-write only', async () => {
  const anon = env.unauthenticatedContext().database();
  await assertFails(get(ref(anon, base + '/users')));
  await assertFails(get(ref(db('stranger'), base + '/users')));
  await assertFails(set(ref(anon, base + '/users/host/votes/semi-1/MD'), vote()));
  await assertFails(set(ref(db('guest'), base + '/users/host/votes/semi-1/MD'), vote()));
  await assertFails(remove(ref(db('guest'), base + '/users/host')));
  await assertSucceeds(get(ref(db('guest'), base + '/users')));
  await assertSucceeds(set(ref(db('guest'), base + '/users/guest/votes/semi-1/MD'), vote()));
});
test('only self admission into existing live party; immutable host; cannot list parties', async () => {
  await env.withSecurityRulesDisabled(async ctx => set(ref(ctx.database(), '2026/parties/LEGACY/users/untrusted'), { name: 'Old guest' }));
  await assertFails(set(ref(db('new'), '2026/parties/LEGACY/meta'), { hostUid: 'new', createdAt: serverTimestamp(), expiresAt: Date.now() + 100000 }));
  await assertFails(get(ref(db('new'), '2026/parties')));
  await assertFails(set(ref(db('new'), base + '/members/impostor'), true));
  await assertFails(set(ref(db('new'), '2026/parties/ZZZZZZ/members/new'), true));
  await env.withSecurityRulesDisabled(async ctx => set(ref(ctx.database(), '2026/parties/EXPIRED/meta'), {hostUid:'host',createdAt:1,expiresAt:1}));
  await assertFails(set(ref(db('new'), '2026/parties/EXPIRED/members/new'), true));
  await assertSucceeds(set(ref(db('new'), base + '/members/new'), true));
  await assertFails(set(ref(db('new'), base + '/meta/hostUid'), 'new'));
  await assertFails(set(ref(db('new'), '2026/parties/NEWNEW/meta'), { hostUid: 'host', createdAt: serverTimestamp(), expiresAt: Date.now() + 100000 }));
  await assertSucceeds(set(ref(db('new'), '2026/parties/NEWNEW/meta'), { hostUid: 'new', createdAt: serverTimestamp(), expiresAt: Date.now() + 100000 }));
});
test('integer, complete, sum, field, act and stage validation', async () => {
  const path = base + '/users/guest/votes/semi-1/MD';
  for (const fields of [{ vocals: 0.5, total: 10.5 }, { vocals: -1, total: 9 }, { vocals: 6, total: 16 }, { vocals: null }, { total: 11 }, { surprise: true }, { remind: 'x'.repeat(201) }, { updatedAt: 1 }]) await assertFails(set(ref(db('guest'), path), vote(fields)));
  await assertFails(set(ref(db('guest'), base + '/users/guest/votes/bad/MD'), vote()));
  await assertFails(set(ref(db('guest'), base + '/users/guest/votes/semi-1/BG'), vote()));
  await assertFails(set(ref(db('guest'), base + '/funniest/semi-1'), { userId: 'host', comment: 'forged' }));
  await assertSucceeds(set(ref(db('guest'), path), vote()));
});
test('current-stage reset preserves other contest and stale queued epoch cannot resurrect', async () => {
  const database = db('guest'); const user = base + '/users/guest';
  await set(ref(database, user + '/votes/semi-1/MD'), vote());
  await set(ref(database, user + '/votes/semi-2/BG'), vote());
  await assertSucceeds(update(ref(database, user), { 'votes/semi-1': null, 'epochs/semi-1': increment(1) }));
  assert.equal((await get(ref(database, user + '/votes/semi-1'))).exists(), false);
  assert.equal((await get(ref(database, user + '/votes/semi-2/BG'))).val().total, 10);
  await assertFails(set(ref(database, user + '/votes/semi-1/MD'), vote()));
  await assertSucceeds(set(ref(database, user + '/votes/semi-1/MD'), vote({ epoch: 1 })));
  await assertFails(update(ref(database, user), { 'epochs/semi-1': increment(1), 'votes/semi-1/MD': vote({ epoch: 1 }) }));
  await assertSucceeds(update(ref(database, user), { 'epochs/semi-1': increment(1), 'votes/semi-1/MD': vote({ epoch: 2 }) }));
});

test('epoch tombstones cannot be deleted at leaf, subtree or whole-user paths', async () => {
  const database = db('guest'), user = base + '/users/guest';
  await set(ref(database, user + '/epochs'), { 'semi-1': 1, 'semi-2': 2, 'grand-final': 3 });
  for (const path of ['/epochs/semi-1', '/epochs/semi-2', '/epochs/grand-final', '/epochs', '']) await assertFails(remove(ref(database, user + path)));
  await assertFails(set(ref(database, user), { name: 'Replacement' }));
  await assertFails(update(ref(database, user), { 'epochs/semi-1': null }));
  await assertFails(update(ref(database, base), { 'users/guest': null, 'members/guest': null }));
  await assertFails(set(ref(database, user + '/epochs/semi-1'), 0));
  assert.deepEqual((await get(ref(database, user + '/epochs'))).val(), { 'semi-1': 1, 'semi-2': 2, 'grand-final': 3 });
  await assertFails(set(ref(database, user + '/votes/semi-1/MD'), vote()));
});

function leavePayload() {
  return { 'members/guest': null, 'users/guest/name': null, 'users/guest/votes': null,
    'users/guest/epochs/semi-1': increment(1), 'users/guest/epochs/semi-2': increment(1), 'users/guest/epochs/grand-final': increment(1) };
}
test('atomic leave closes same-identity new-epoch save interval and retains tombstones through rejoin', async () => {
  const first = db('guest'), second = db('guest'), observer = db('host'), user = base + '/users/guest';
  await set(ref(first, user + '/votes/semi-1/MD'), vote());
  // A new-epoch write concurrent with leave fails before leave (epoch mismatch)
  // or after leave (membership revoked); there is no legal intermediate state.
  const [left, overlapping] = await Promise.allSettled([update(ref(first, base), leavePayload()), set(ref(second, user + '/votes/semi-1/SE'), vote({ epoch: 1 }))]);
  assert.equal(left.status, 'fulfilled'); assert.equal(overlapping.status, 'rejected');
  const party = (await get(ref(observer, base + '/users'))).val();
  assert.deepEqual(party.guest, { epochs: { 'semi-1': 1, 'semi-2': 1, 'grand-final': 1 } });
  assert.equal((await get(ref(first, base + '/members/guest'))).exists(), false);
  await assertFails(set(ref(second, user + '/votes/semi-1/MD'), vote({ epoch: 1 })));
  await set(ref(first, base + '/members/guest'), true); await set(ref(first, user + '/name'), 'Rejoined');
  await assertFails(set(ref(first, user + '/votes/semi-1/MD'), vote()));
  await assertSucceeds(set(ref(first, user + '/votes/semi-1/MD'), vote({ epoch: 1 })));
});
test('failed party-root leave is all-or-nothing and existing member can still save', async () => {
  const database = db('guest'), user = base + '/users/guest';
  await set(ref(database, user + '/votes/semi-1/MD'), vote());
  // Forbidden foreign delete deliberately makes this entire atomic update fail.
  await assertFails(update(ref(database, base), { ...leavePayload(), 'users/host/name': null }));
  assert.equal((await get(ref(database, base + '/members/guest'))).val(), true);
  assert.equal((await get(ref(database, user + '/name'))).val(), 'Guest');
  assert.equal((await get(ref(database, user + '/votes/semi-1/MD'))).val().epoch, 0);
  assert.equal((await get(ref(database, user + '/epochs'))).exists(), false);
  await assertSucceeds(set(ref(database, user + '/votes/semi-1/SE'), vote()));
});

for (const operation of ['reset', 'leave']) test(`shipped session ${operation}: real SDK optimistic events and denied update preserve local state`, async () => {
  const database = db('guest'), observer = db('guest'), off = [], events = [], otherTabEpochs = [];
  await new Promise((resolve, reject) => { off.push(onValue(ref(observer, base + '/users/guest/epochs/semi-1'), snap => { otherTabEpochs.push(snap.val()); resolve(); }, reject)); });
  const adapter = { ref(path) { const r = ref(database, path); return {
    once: () => get(r), set: value => set(r, value),
    on(type, handler, cancel) { off.push(onValue(r, snap => { events.push([path, snap.val()]); handler(snap); }, cancel)); }, off() {},
    // Inject an invalid field into the actual update to force server rejection,
    // while retaining the real Firebase latency-compensation/rollback sequence.
    update: value => update(r, { ...value, [operation === 'leave' ? 'users/guest/__denied' : '__denied']: true })
  }; } };
  const h = sessionHarness.harness(adapter, { TIMESTAMP: serverTimestamp(), increment });
  try {
    await h.session.connect('ABCDEF', 'semi-1');
    const deadline = Date.now() + 5000;
    while (!h.session.ready && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(h.session.ready, true);
    h.write('pending', { MD: { vote: sessionHarness.vote, epoch: 0, id: 'durable' } });
    h.write('votes', { MD: sessionHarness.vote }); h.write('drafts', { SE: { song: 4 } });
    await assert.rejects(h.session[operation](), /PERMISSION_DENIED/);
    assert.equal(h.read('pending').MD.id, 'durable'); assert.deepEqual(h.read('votes'), { MD: sessionHarness.vote });
    assert.deepEqual(h.read('drafts'), { SE: { song: 4 } }); assert.equal(h.read('epoch'), 0);
    const epochs = events.filter(([path]) => path.endsWith('/epochs/semi-1')).map(([, value]) => value);
    assert.ok(epochs.includes(1), 'real optimistic epoch 1 must have occurred'); assert.equal(epochs.at(-1), null, 'server denial rolls epoch back');
    assert.equal((await get(ref(database, base + '/members/guest'))).val(), true);
    assert.equal((await get(ref(database, base + '/users/guest/name'))).val(), 'Guest');
    assert.equal((await get(ref(database, base + '/users/guest/epochs'))).exists(), false);
    assert.equal((await get(ref(observer, base + '/users/guest/epochs/semi-1'))).exists(), false);
    assert.ok(!otherTabEpochs.includes(1), 'independent same-identity tab must not see optimistic or rollback epochs');
  } finally { off.forEach(fn => fn()); }
});

test('rules stage/act allowlist matches the shared roster exactly', async () => {
  const window={}; const {runInNewContext}=await import('node:vm'); runInNewContext(fs.readFileSync('acts-data.js','utf8'),{window,console});
  for(const [stage,codes] of Object.entries(window.EUROVISION_DATA.shows)) {
    for(const code of Object.keys(window.EUROVISION_DATA.acts)) {
      const write=set(ref(db('guest'),base+'/users/guest/votes/'+stage+'/'+code),vote());
      if(codes.includes(code)) await assertSucceeds(write); else await assertFails(write);
    }
  }
});
