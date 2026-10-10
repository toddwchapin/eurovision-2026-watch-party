// Execute the shipped session helper, not a reimplementation. Database adapters
// are deterministic doubles in unit tests and the real SDK in emulator tests.
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
exports.base = '2026/parties/ABCDEF';
exports.vote = { vocals: 0, performance: 1, song: 2, original: 3, stage: 4, total: 10, remind: '' };
exports.harness = function (db, serverValue = { TIMESTAMP: { '.sv': 'timestamp' }, increment: n => ({ '.sv': { increment: n } }) }, sessionSource = fs.readFileSync('shared/session.js', 'utf8')) {
  const data = new Map();
  const localStorage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const message = { textContent: '' };
  const window = { EurovisionConfig: { year: '2026', firebaseConfig: {} }, EurovisionScoring: require('../shared/scoring.js'), EUROVISION_DATA: { shows: { 'semi-1': ['MD', 'SE'] } }, addEventListener() {}, dispatchEvent() {} };
  const context = { window, localStorage, document: { getElementById: id => id === 'syncMessage' ? message : {} }, firebase: { apps: [{}], auth: () => ({ currentUser: { uid: 'guest' }, onAuthStateChanged() {} }), database: Object.assign(() => db, { ServerValue: serverValue }) }, crypto: { randomUUID }, setTimeout, clearTimeout, queueMicrotask, Event, location: { reload() {} } };
  vm.runInNewContext(fs.readFileSync('shared/storage.js', 'utf8'), context);
  vm.runInNewContext(sessionSource, context);
  const session = window.EurovisionSession, storage = window.EurovisionStorage;
  const key = (kind, stage = 'semi-1') => storage.key('ABCDEF', 'guest', stage, kind);
  const read = (kind, stage) => JSON.parse(JSON.stringify(storage.read(key(kind, stage), kind === 'epoch' ? 0 : {})));
  const write = (kind, value, stage) => storage.write(key(kind, stage), value);
  return { session, storage, key, read, write, data, message };
};
exports.fakeDb = function () {
  const listeners = new Map(), writes = [];
  const base = exports.base;
  const values = { [base + '/meta']: { expiresAt: Date.now() + 60000 }, [base + '/members/guest']: true, [base + '/users/guest/epochs/semi-1']: 0, [base + '/users']: { guest: { name: 'Guest' } }, '.info/connected': true };
  const db = { writes, listeners, update: async () => {}, set: async () => {}, goOnline() {},
    emit(path, value) { values[path] = value; listeners.get(path)?.handler({ val: () => value }); },
    fail(path, message) { listeners.get(path)?.cancel(new Error(message)); },
    ref(path) { return { once: async () => ({ val: () => values[path] }), on(type, handler, cancel) { listeners.set(path, { handler, cancel }); handler({ val: () => values[path] }); }, off() { listeners.delete(path); }, set(value) { writes.push({ path, value }); return db.set(path, value); }, update(value) { writes.push({ path, value }); return db.update(path, value); } }; }
  };
  return db;
};
exports.tick = () => new Promise(resolve => setImmediate(resolve));
