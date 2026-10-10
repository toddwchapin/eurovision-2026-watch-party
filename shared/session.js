(function () {
  'use strict';
  const S = window.EurovisionStorage;
  const C = window.EurovisionConfig;
  const partyKey = 'ev_' + C.year + '_party';
  const status = (text) => {
    let el = document.getElementById('syncStatus');
    if (!el) {
      el = document.createElement('div'); el.id = 'syncStatus'; el.className = 'sync-status';
      el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      const msg = document.createElement('span'); msg.id = 'syncMessage'; el.append(msg);
      const retry = document.createElement('button'); retry.className = 'btn ghost'; retry.textContent = 'Retry';
      retry.onclick = () => window.EurovisionSession.retry(); el.append(retry);
      const recovery = document.createElement('a'); recovery.href = 'index.html?recover=1'; recovery.textContent = 'Party settings'; el.append(recovery);
      (document.querySelector('.wrap') || document.body).append(el);
    }
    document.getElementById('syncMessage').textContent = text;
  };
  let db, uid, party, connected = false, ready = false, epochReady = false, busy = false;
  let epoch = 0, stage, pending = {}, onVotes = () => {}, onUsers = () => {}, activeWrite = Promise.resolve();
  let authPromise, unsubscribe = [], lastError = '', stopped = false;
  const listenerErrors = new Map();
  let destructive = null;
  let operationEpoch = null;
  const stages = ['semi-1', 'semi-2', 'grand-final'];
  function listenerMessage() { return [...listenerErrors.values()].join('; '); }
  function snapshot() {
    const values = {};
    for (const s of stages) for (const kind of ['epoch', 'pending', 'votes', 'drafts']) {
      const k = S.key(party, uid, s, kind); values[k] = S.read(k, kind === 'epoch' ? 0 : {});
    }
    // Durable until the server acknowledges (or rejects) the operation.
    S.write(key('destructive-snapshot'), values);
    destructive = values;
    operationEpoch = null;
  }
  function restoreSnapshot() {
    // Optimistic callbacks never changed durable active caches. Read them back
    // instead of replaying our snapshot: another tab may have acknowledged
    // pending writes or committed a real reset during this rejected operation.
    epoch = S.read(key('epoch'), 0); pending = S.read(key('pending'));
    if (operationEpoch !== null && operationEpoch > epoch) clearStage(stage, operationEpoch);
    onVotes(S.read(key('votes')));
  }
  function finishSnapshot() { localStorage.removeItem(key('destructive-snapshot')); destructive = null; operationEpoch = null; }
  function clearStage(s, next) {
    for (const kind of ['pending', 'votes', 'drafts']) S.write(S.key(party, uid, s, kind), {});
    S.write(S.key(party, uid, s, 'epoch'), next);
    if (s === stage) { epoch = next; pending = {}; onVotes({}); }
  }
  function key(kind) { return S.key(party, uid, stage, kind); }
  function base() { return C.year + '/parties/' + party; }
  function userBase() { return base() + '/users/' + uid; }
  function timed(promise) {
    let t; return Promise.race([promise, new Promise((_, reject) => { t = setTimeout(() => reject(new Error('Connection timed out. Check your network and retry.')), 12000); })]).finally(() => clearTimeout(t));
  }
  async function auth() {
    if (!authPromise) authPromise = (async () => {
      status('Connecting securely…');
      if (!firebase.apps.length) firebase.initializeApp(C.firebaseConfig);
      if (C.emulator) {
        firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        firebase.database().useEmulator('127.0.0.1', 9000);
      } else if (C.appCheckSiteKey) {
        firebase.appCheck().activate(C.appCheckSiteKey, true);
      }
      const result = firebase.auth().currentUser || (await timed(firebase.auth().signInAnonymously())).user;
      uid = result.uid; db = firebase.database();
      return { uid, db };
    })().catch(e => { authPromise = null; status('Authentication failed. Enable Anonymous Auth or check your connection, then retry. ' + e.message); throw e; });
    return authPromise;
  }
  function watch(path, callback) {
    const ref = db.ref(path); const handler = snap => {
      try { listenerErrors.delete(path); callback(snap.val()); summary(); }
      catch (e) { listenerErrors.set(path, e.message); summary(); }
    };
    ref.on('value', handler, e => { listenerErrors.set(path, e.message); summary(); }); unsubscribe.push(() => ref.off('value', handler));
  }
  function fail(e) { lastError = e.message; status('Not shared: ' + e.message + '. Retry or open Party settings.'); }
  function persistPending() { S.write(key('pending'), pending); }
  function summary() {
    const n = Object.keys(pending).length;
    const error = listenerMessage() || lastError;
    status(error ? 'Not shared: ' + error + '. Retry or open Party settings.' : !connected ? 'Offline — local changes are saved; reconnect to share.' : n ? n + ' vote(s) pending — saved on this device.' : 'Shared — server acknowledged your votes.');
    window.dispatchEvent(new Event('ev-sync'));
  }
  async function enter(code, name, create = false) {
    await auth();
    code = code.toUpperCase();
    if (!/^[A-Z2-9]{6,8}$/.test(code)) throw new Error('Use the 6–8 character invite code from your host.');
    const path = C.year + '/parties/' + code;
    if (create) {
      const result = await timed(db.ref(path + '/meta').transaction(current => current ? undefined : { hostUid: uid, createdAt: firebase.database.ServerValue.TIMESTAMP, expiresAt: Date.now() + 7 * 86400000 }));
      if (!result.committed) throw new Error('That code is already in use. Try Start Party again.');
    } else {
      const meta = (await timed(db.ref(path + '/meta').once('value'))).val();
      if (!meta || meta.expiresAt < Date.now()) throw new Error('Party not found or invite expired. Ask the host for a new invite. Legacy parties need a new code.');
    }
    const member = db.ref(path + '/members/' + uid);
    if (!(await timed(member.once('value'))).exists()) await timed(member.set(true));
    await timed(db.ref(path + '/users/' + uid + '/name').set(name || 'Guest'));
    localStorage.setItem(partyKey, code);
    return code;
  }
  async function connect(code, selectedStage, callbacks = {}) {
    unsubscribe.forEach(fn => fn()); unsubscribe = []; ready = false; epochReady = false; stopped = false; listenerErrors.clear();
    await auth(); party = code; stage = selectedStage; onVotes = callbacks.votes || (() => {}); onUsers = callbacks.users || (() => {});
    const meta = (await timed(db.ref(base() + '/meta').once('value'))).val();
    if (!meta || meta.expiresAt < Date.now()) throw new Error('This party is missing or expired. Open Party settings to host or join again.');
    const member = (await timed(db.ref(base() + '/members/' + uid).once('value'))).val();
    if (!member) throw new Error('Join this party from the rating page before viewing its votes.');
    pending = S.read(key('pending'));
    epoch = S.read(key('epoch'), 0);
    watch(userBase() + '/epochs/' + stage, value => {
      const next = value || 0;
      // Own SDK epoch events are optimistic (including rollback). Other tabs
      // have independent connections and receive server-committed epochs only.
      if (destructive) { operationEpoch = next; return; }
      if (next > epoch) {
        pending = {}; persistPending();
        S.write(key('votes'), {}); S.write(key('drafts'), {});
        onVotes({});
      }
      // A delayed lower event must never revive canceled work.
      epoch = Math.max(epoch, next); S.write(key('epoch'), epoch); epochReady = true;
    });
    watch(base() + '/users', users => {
      if (destructive) return;
      users = users || {}; onUsers(Object.fromEntries(Object.entries(users).filter(([, u]) => u.name)));
      const remote = window.EurovisionScoring.stageVotes(users[uid]?.votes, stage);
      const own = { ...remote };
      Object.entries(pending).forEach(([code, item]) => { if (item.epoch === epoch) own[code] = item.vote; });
      S.write(key('votes'), own); onVotes(own); ready = true;
      summary(); flush();
    });
    watch('.info/connected', value => { connected = !!value; summary(); if (connected) flush(); });
    window.addEventListener('online', retry);
    window.addEventListener('storage', storageChanged);
    firebase.auth().onAuthStateChanged(user => {
      if (uid && user?.uid !== uid) { stopped = true; ready = false; unsubscribe.forEach(fn => fn()); status('Your sign-in changed. Reload to use the current identity.'); }
    });
    return { uid, db };
  }
  function storageChanged(e) {
    if (e.key === key('pending')) { pending = S.read(key('pending')); flush(); }
  }
  function save(code, vote) {
    if (!ready || !epochReady || stopped || listenerErrors.size) throw new Error('Wait for party membership and subscriptions to load before saving. Retry the connection.');
    if (!window.EurovisionScoring.valid(vote) || !window.EUROVISION_DATA.shows[stage].includes(code)) throw new Error('Select all five scores before saving.');
    pending = S.read(key('pending'));
    pending[code] = { vote, epoch, id: crypto.randomUUID() }; persistPending(); lastError = ''; summary(); flush();
  }
  async function flush() {
    if (busy || !ready || !epochReady || !connected || stopped || listenerErrors.size) return;
    busy = true;
    try {
      pending = S.read(key('pending'));
      for (const [code, item] of Object.entries(pending)) {
        if (stopped || listenerErrors.size) break;
        if (item.epoch !== epoch) { delete pending[code]; persistPending(); continue; }
        activeWrite = db.ref(userBase() + '/votes/' + stage + '/' + code).set({ ...item.vote, epoch: item.epoch, updatedAt: firebase.database.ServerValue.TIMESTAMP });
        await activeWrite;
        pending = S.read(key('pending'));
        if (pending[code]?.id === item.id) { delete pending[code]; persistPending(); }
      }
      lastError = '';
    } catch (e) { lastError = e.message; }
    finally { busy = false; summary();
      window.dispatchEvent(new Event('ev-sync'));
      if (!lastError && !listenerErrors.size && connected && !stopped && Object.keys(S.read(key('pending'))).length) queueMicrotask(flush);
    }
  }
  async function reset() {
    if (!connected) throw new Error('Reconnect before resetting shared votes. Nothing has been deleted.');
    if (stopped || listenerErrors.size) throw new Error('Wait for the current operation or retry the connection.');
    stopped = true;
    try {
      await timed(activeWrite.catch(() => {}));
      snapshot();
      const updates = {}; updates['votes/' + stage] = null;
      updates['epochs/' + stage] = firebase.database.ServerValue.increment(1);
      // A timeout is not rejection: an SDK write can still commit later. Keep
      // the operation blocked until a definitive acknowledgement or rejection.
      await db.ref(userBase()).update(updates);
      clearStage(stage, Math.max(epoch + 1, operationEpoch || 0));
      lastError = ''; summary();
    } catch (e) { restoreSnapshot(); fail(e); throw e; }
    finally { finishSnapshot(); stopped = false; }
  }
  async function leave() {
    if (!connected) throw new Error('Reconnect before leaving so your shared records can be removed.');
    if (stopped || listenerErrors.size) throw new Error('Wait for the current operation or retry the connection.');
    stopped = true;
    try {
      await timed(activeWrite.catch(() => {}));
      snapshot();
      // Preserve immutable local snapshots outside active epoch-scoped caches.
      for (const s of stages) {
        const cached = S.read(S.key(party, uid, s, 'votes'));
        if (Object.keys(cached).length) S.write(S.key(party, uid, s, 'left-votes'), cached);
      }
      const clear = {};
      clear['members/' + uid] = null;
      clear['users/' + uid + '/name'] = null;
      clear['users/' + uid + '/votes'] = null;
      stages.forEach(s => { clear['users/' + uid + '/epochs/' + s] = firebase.database.ServerValue.increment(1); });
      // Membership, name, votes and all tombstones change in ONE server commit.
      await db.ref(base()).update(clear);
      unsubscribe.forEach(fn => fn()); unsubscribe = [];
      stages.forEach(s => clearStage(s, destructive[S.key(party, uid, s, 'epoch')] + 1));
      localStorage.removeItem(partyKey); ready = false;
    } catch (e) { restoreSnapshot(); stopped = false; fail(e); throw e; }
    finally { finishSnapshot(); }
  }
  function retry() { lastError = ''; if (db && ready && !listenerErrors.size) { db.goOnline(); flush(); } else location.reload(); }
  window.EurovisionSession = { auth, enter, connect, save, reset, leave, retry, status, fail, key,
    state(code) { return listenerErrors.size || lastError ? 'Not shared / retry' : S.read(key('pending'))[code] ? (!connected ? 'Offline / pending' : 'Pending') : 'Shared'; },
    get uid() { return uid; }, get ready() { return ready && epochReady && !stopped && !listenerErrors.size; } };
})();
