// Heuristic humor scorer for vote comments.
// Deterministic so every client picks the same funniest comment from same input.
// Range 0–25. Threshold for display is 4. Exposed on window for use by
// both party-votes.html (read/render) and index.html (write on save).
(function () {
  'use strict';

  const SCORER_VERSION = 'heuristic-v1';
  const DISPLAY_THRESHOLD = 4;

  function scoreComment(text) {
    if (!text || typeof text !== 'string') return 0;
    const s = text.trim();
    if (!s) return 0;
    const lower = s.toLowerCase();
    const len = s.length;

    if (/https?:\/\//i.test(s)) return 0;
    if (/(.)\1{10,}/.test(s)) return 0;
    const lettersOnly = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
    const emojiMatches = s.match(/\p{Extended_Pictographic}/gu) || [];
    if (len > 20 && lettersOnly.length === 0) return 0;

    let score = 0;
    const buckets = new Set();

    if (emojiMatches.length > 0) {
      score += Math.min(emojiMatches.length * 3, 9);
      buckets.add('typo');
    }
    const exRuns = (s.match(/!{2,}/g) || []).length;
    if (exRuns) { score += Math.min(exRuns * 2, 4); buckets.add('typo'); }
    if (/[?!][!?]/.test(s)) { score += 3; buckets.add('typo'); }
    if (/\?{3,}/.test(s)) { score += 2; buckets.add('typo'); }
    const capWords = (s.match(/\b[A-Z]{3,}\b/g) || []).length;
    if (capWords >= 1) { score += Math.min(capWords * 2, 6); buckets.add('typo'); }
    const repChars = (s.match(/([A-Za-z])\1{2,}/g) || []).length;
    if (repChars) { score += Math.min(repChars * 2, 4); buckets.add('typo'); }
    if (/(\.{3,}|…)\s*$/.test(s)) { score += 1; buckets.add('typo'); }
    if (/\b\w*[a-z][A-Z]\w*[a-z][A-Z]/.test(s)) { score += 3; buckets.add('typo'); }
    if (/—| -- /.test(s)) { score += 1; buckets.add('typo'); }
    if (/\([^)]{2,}\)/.test(s)) { score += 2; buckets.add('typo'); }

    const KEYWORDS = /\b(lol|lmao|rofl|wtf|omg|bruh|slay|iconic|dead|fr|bestie|girlboss|gagged|unhinged|chaos|crime|illegal|robbed|ate|serving|cooked|nope|yikes|oof)\b/gi;
    const kw = (lower.match(KEYWORDS) || []).length;
    if (kw) { score += Math.min(kw * 2, 8); buckets.add('lex'); }
    const similes = (lower.match(/\b(like a|like an|looks like|sounds like)\b/g) || []).length;
    if (similes) { score += Math.min(similes * 2, 4); buckets.add('lex'); }
    const COMEDY_NOUNS = /\b(goblin|roomba|sock|gremlin|raccoon|frog|toad|cabbage|gherkin|toast|meatloaf|goose|hamster|potato|moose|sloth|llama|ferret)\b/i;
    if (similes > 0 && COMEDY_NOUNS.test(lower)) { score += 3; buckets.add('lex'); }
    if (/\b(abba|céline|celine|beyoncé|beyonce|loreen|lordi|scooch|conchita|måneskin|maneskin)\b/i.test(s)) { score += 2; buckets.add('lex'); }
    if (COMEDY_NOUNS.test(lower)) { score += 2; buckets.add('lex'); }
    if (/\b(10\/10|0\/10|-?\d+\s*stars?|\d+(\.\d+)?\s*chairs?)\b/i.test(s)) { score += 2; buckets.add('lex'); }
    if (/\b(not bad.*(terrible|awful|bad)|kinda slaps.*kinda|wait,? actually)\b/i.test(lower)) { score += 2; buckets.add('lex'); }
    if (/\b(worst.*ever|best.*history|made me weep|literally died|i died)\b/i.test(lower)) { score += 2; buckets.add('lex'); }
    if (/\b(i'?m crying|i can'?t|send help|goodbye|i'?m done)\b/i.test(lower)) { score += 2; buckets.add('lex'); }
    if (/\b(whoosh|boom|splat|oof|eek|thud|kapow)\b/i.test(lower)) { score += 2; buckets.add('lex'); }
    const proflite = (lower.match(/\b(heck|dang|frick|cursed)\b/g) || []).length;
    if (proflite) { score += Math.min(proflite, 3); buckets.add('lex'); }

    if (/\b(nordic moodboard|balkan ballad|bloc voting|douze points)\b/i.test(lower)) { score += 2; buckets.add('euro'); }
    if (/\b(smoke machine|wind machine|led|pyro|wig|cape|glitter|fireworks)\b/i.test(lower)) { score += 2; buckets.add('euro'); }
    if (/\b(schlager|power ballad|euro-?banger|key change|bagpipe)\b/i.test(lower)) { score += 2; buckets.add('euro'); }

    const POS = /\b(love|amazing|gorgeous|stunning|brilliant|perfect|incredible|fantastic|beautiful|fab|great|excellent|legendary)\b/i;
    const NEG = /\b(cursed|awful|terrible|bad|hate|worst|trash|painful|disaster|nightmare|messy)\b/i;
    if (POS.test(lower) && NEG.test(lower)) { score += 3; buckets.add('contrast'); }
    if (/\b(who hurt|what was that|why is|why are|who let|how is this)\b.*\?/i.test(lower)) { score += 2; buckets.add('contrast'); }

    if (lettersOnly.length >= 12 && /^[^A-Z]*$/.test(s)) { score += 1; buckets.add('fmt'); }
    if (/^(yes|no|wow|huh|nope|oof|same|mood|wait)\.$/i.test(s)) { score += 2; buckets.add('fmt'); }
    if (emojiMatches.length >= 2 && lettersOnly.length === 0) { score += 4; buckets.add('fmt'); }
    if (len >= 15 && len <= 120) score += 2;
    else if (len < 8) score -= 3;

    if (/^\s*\d+\s*(stars?|\/\s*\d+|points?)\s*[.!]?\s*$/i.test(s)) score -= 2;
    if (/^(good|nice|meh|fine|okay|ok|cool|alright)\.?$/i.test(s)) score -= 3;
    if (/\b(pitchy|flat|sharp|off-key|out of tune|breath control)\b/i.test(lower)) score -= 1;

    if (buckets.size >= 2) score += 2;

    if (score > 25) score = 25;
    if (score < 0) score = 0;
    return score;
  }

  window.EurovisionHumor = {
    scoreComment,
    SCORER_VERSION,
    DISPLAY_THRESHOLD,
  };
})();
