/* Browser and Node contract; no build step. */
(function (root) {
  const fields = ['vocals', 'performance', 'song', 'original', 'stage'];
  function valid(v) {
    return !!v && Object.keys(v).every(k => [...fields, 'total', 'remind', 'epoch', 'updatedAt'].includes(k)) && fields.every(f => Number.isInteger(v[f]) && v[f] >= 0 && v[f] <= 5) &&
      v.total === fields.reduce((n, f) => n + v[f], 0) &&
      typeof v.remind === 'string' && v.remind.length <= 200;
  }
  function stageVotes(node, stage) {
    const allowed = root.EUROVISION_DATA?.shows[stage] || [];
    return Object.fromEntries(Object.entries(node?.[stage] || {}).filter(([code, v]) => allowed.includes(code) && valid(v)));
  }
  const api = { fields, valid, stageVotes };
  root.EurovisionScoring = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
