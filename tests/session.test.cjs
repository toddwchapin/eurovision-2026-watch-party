const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness, fakeDb, tick, base, vote } = require('./session-harness.cjs');
const ep = base + '/users/guest/epochs/semi-1';
function seed(h) {
  h.write('pending', { MD: { vote, epoch: 0, id: 'pending-before' } });
  h.write('votes', { MD: vote }); h.write('drafts', { SE: { song: 3 } });
}
for (const operation of ['reset', 'leave']) test(`${operation} rejection restores pending/votes/drafts despite optimistic epoch and rollback`, async () => {
  const db = fakeDb(), h = harness(db); await h.session.connect('ABCDEF', 'semi-1'); await tick(); seed(h);
  let reject;
  db.update = () => {
    db.emit(ep, 1); db.emit(base + '/users', { guest: { epochs: { 'semi-1': 1 } } });
    return new Promise((_, no) => { reject = no; });
  };
  const result = h.session[operation](); await tick();
  assert.equal(h.read('pending').MD.id, 'pending-before'); assert.deepEqual(h.read('drafts'), { SE: { song: 3 } });
  assert.equal(h.read('epoch'), 0); assert.ok(h.data.has(h.key('destructive-snapshot')));
  assert.throws(() => h.session.save('SE', vote), /Wait/);
  // Another same-identity tab edits during the rejected operation: don't lose it.
  h.write('pending', { ...h.read('pending'), SE: { vote, epoch: 0, id: 'other-tab' } });
  h.write('drafts', { ...h.read('drafts'), MD: { vocals: 5 } });
  db.emit(ep, 0); db.emit(base + '/users', { guest: { name: 'Guest' } });
  reject(new Error('PERMISSION_DENIED')); await assert.rejects(result, /PERMISSION_DENIED/);
  assert.equal(h.read('pending').MD.id, 'pending-before'); assert.equal(h.read('pending').SE.id, 'other-tab');
  assert.deepEqual(h.read('drafts'), { SE: { song: 3 }, MD: { vocals: 5 } }); assert.deepEqual(h.read('votes'), { MD: vote });
  assert.equal(h.read('epoch'), 0); assert.equal(h.session.ready, true);
  assert.match(h.message.textContent, /Not shared/); assert.equal(h.data.has(h.key('destructive-snapshot')), false);
  if (operation === 'leave') { assert.equal(db.writes.length, 1); assert.equal(db.writes[0].path, base); assert.equal(db.writes[0].value['members/guest'], null); }
});
for (const operation of ['reset', 'leave']) test(`${operation} acknowledgement cancels pending and drafts without rollback revival`, async () => {
  const db = fakeDb(), h = harness(db); await h.session.connect('ABCDEF', 'semi-1'); await tick(); seed(h);
  h.write('pending', { BG: { vote, epoch: 0, id: 'semi2' } }, 'semi-2'); h.write('drafts', { BG: { song: 2 } }, 'semi-2');
  db.update = async () => { db.emit(ep, 1); db.emit(base + '/users', { guest: { epochs: { 'semi-1': 1 } } }); };
  await h.session[operation]();
  assert.deepEqual(h.read('pending'), {}); assert.deepEqual(h.read('drafts'), {}); assert.deepEqual(h.read('votes'), {}); assert.equal(h.read('epoch'), 1);
  db.emit(ep, 0); // delayed lower event must not revive pre-reset pending work
  assert.deepEqual(h.read('pending'), {}); assert.equal(h.read('epoch'), 1);
  assert.equal(Object.keys(h.read('pending', 'semi-2')).length, operation === 'leave' ? 0 : 1);
  assert.equal(Object.keys(h.read('drafts', 'semi-2')).length, operation === 'leave' ? 0 : 1);
  if (operation === 'leave') { assert.equal(h.session.ready, false); assert.deepEqual(h.read('left-votes'), { MD: vote }); }
});
test('rejected reset does not revive another tab’s acknowledged or successfully reset work', async () => {
  const db = fakeDb(), h = harness(db); await h.session.connect('ABCDEF', 'semi-1'); await tick(); seed(h);
  let reject; db.update = () => new Promise((_, no) => { reject = no; });
  const result = h.session.reset(); await tick();
  // Another same-identity tab commits a real reset while this operation is in flight.
  h.write('epoch', 1); h.write('pending', {}); h.write('votes', {}); h.write('drafts', {});
  db.emit(ep, 1); reject(new Error('PERMISSION_DENIED')); await assert.rejects(result);
  assert.equal(h.read('epoch'), 1); assert.deepEqual(h.read('pending'), {}); assert.deepEqual(h.read('drafts'), {});
  // A later denied operation must not requeue a vote acknowledged in another tab.
  h.write('pending', { MD: { vote, epoch: 1, id: 'ack-elsewhere' } });
  const second = h.session.reset(); await tick(); h.write('pending', {});
  db.emit(ep, 1); reject(new Error('PERMISSION_DENIED')); await assert.rejects(second);
  assert.deepEqual(h.read('pending'), {});
});

test('essential listener failure survives successful in-flight write and empty flush until listener recovery', async () => {
  const db = fakeDb(), h = harness(db); await h.session.connect('ABCDEF', 'semi-1'); await tick();
  let resolve; db.set = () => new Promise(yes => { resolve = yes; });
  h.session.save('MD', vote); await tick();
  db.fail(ep, 'Epoch subscription denied'); resolve(); await tick();
  assert.equal(h.session.ready, false); assert.match(h.message.textContent, /Epoch subscription denied/); assert.equal(h.session.state('MD'), 'Not shared / retry');
  db.emit('.info/connected', true); await tick();
  assert.match(h.message.textContent, /Epoch subscription denied/); assert.throws(() => h.session.save('SE', vote), /subscriptions/);
  db.emit(ep, 0); await tick(); assert.equal(h.session.ready, true); assert.equal(h.session.state('MD'), 'Shared');
  db.fail(base + '/users', 'Users subscription denied'); db.emit(ep, 0); await tick();
  assert.equal(h.session.ready, false); assert.match(h.message.textContent, /Users subscription denied/);
  db.emit(base + '/users', { guest: { name: 'Guest' } }); await tick(); assert.equal(h.session.ready, true);
});
