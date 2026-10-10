/* All new local data is scoped to authenticated identity, party and contest.
   Legacy keys are deliberately untouched and never uploaded automatically. */
window.EurovisionStorage = {
  key(party, uid, stage, kind) { return ['ev', window.EurovisionConfig?.year || '2026', 'v2', party, uid, stage, kind].join(':'); },
  read(key, fallback = {}) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { throw new Error('Device storage is full or unavailable. Download your results before closing this page.'); }
  }
};
