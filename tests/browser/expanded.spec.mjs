import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, host, rate, remote, isolate, faults } from './helpers.mjs';

async function losePage(page, context, browserName) {
  if (browserName === 'chromium') {
    const crashed = page.waitForEvent('crash');
    const cdp = await context.newCDPSession(page);
    cdp.send('Page.crash').catch(() => {});
    await crashed;
  }
  // Firefox/WebKit expose no renderer-crash API: abrupt document disposal,
  // not an OS process kill. The context retains real localStorage/IndexedDB.
  await page.close({ runBeforeUnload: false });
}

async function axe(page, label, selector) {
  let scan = new AxeBuilder({ page });
  if (selector) scan = scan.include(selector);
  const result = await scan.analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target:n.target, summary:n.failureSummary })) })), label).toEqual([]);
}
async function seed(page, scores, notes={}) {
  await page.evaluate(async ({ scores, notes }) => {
    const updates = {};
    for (const [code, n] of Object.entries(scores)) updates[code] = {vocals:n,performance:n,song:n,original:n,stage:n,total:n*5,remind:notes[code] || '',epoch:0,updatedAt:firebase.database.ServerValue.TIMESTAMP};
    await firebase.database().ref('2026/parties/'+localStorage.ev_2026_party+'/users/'+EurovisionSession.uid+'/votes/semi-2').update(updates);
  }, { scores, notes });
}
async function guest(browser, code, name) {
  const context = await browser.newContext(); const forbidden = await isolate(context);
  const page = await context.newPage(); await page.goto('/index.html?emulator=1&party='+code);
  await page.locator('#nameInput').fill(name);
  return { context, page, forbidden };
}

test('axe named host/guest onboarding, rating, populated results and trivia explanation', async ({ page, browser }) => {
  await page.goto('/index.html?emulator=1'); await page.locator('#nameInput').fill('Ada');
  await axe(page, 'host onboarding', '#nameModal');
  await page.locator('#nameSave').click(); await expect(page.locator('#syncMessage')).toContainText('Shared');
  const code = await page.locator('#partyCodeValue').textContent();
  const g = await guest(browser, code, 'Bea'); await axe(g.page, 'guest onboarding', '#nameModal');
  await g.page.locator('#nameSave').click(); await expect(g.page.locator('#syncMessage')).toContainText('Shared');
  await page.locator('#btnStart').click(); await axe(page, 'rating');
  await seed(page, {BG:1,AZ:2,RO:3}); await seed(g.page,{BG:3,AZ:2,RO:1});
  await page.goto('/party-votes.html?emulator=1'); await expect(page.locator('#ratingsCount')).toHaveText('3 ratings');
  await page.locator('#expandAllBtn').click(); await axe(page, 'results and guest breakdown');
  await page.goto('/party-trivia.html?emulator=1'); await expect(page.locator('.trivia-card').first()).toBeVisible();
  // Both guests average 10.0; ties use the documented name/UID order.
  for (const title of ['Biggest Hater', 'Biggest Lover']) {
    await expect(page.locator('.trivia-card').filter({ has: page.locator('.tc-title', { hasText: title }) }).locator('.tc-voter')).toHaveText('Ada');
  }
  await axe(page, 'trivia');
  const trigger = page.locator('.trivia-card[data-explain]').first();
  await trigger.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Biggest Hater' })).toBeVisible();
  await axe(page, 'trivia explanation', '#triviaExplainBackdrop');
  await expect(page.locator('#triviaExplainClose')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#triviaExplainClose')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await trigger.click(); await page.locator('#triviaExplainClose').click(); await expect(trigger).toBeFocused();
  expect(g.forbidden).toEqual([]); await g.context.close();
});

test('rendered scoreboard averages, tie order, winners, guest totals and trivia controlled aggregates', async ({ page, browser }) => {
  const code = await host(page,'Ada'); const g = await guest(browser,code,'Bea');
  await g.page.locator('#nameSave').click(); await expect(g.page.locator('#syncMessage')).toContainText('Shared');
  await seed(page,{BG:5,AZ:4,RO:0},{BG:'Long thoughtful note',AZ:'Short'});
  await seed(g.page,{BG:3,AZ:4,RO:1});
  // Local partial drafts must not enter rendered averages or superlatives.
  await page.evaluate(() => EurovisionStorage.write(EurovisionSession.key('drafts'),{MT:{vocals:5,remind:'not submitted'}}));
  await page.goto('/party-votes.html?emulator=1'); await expect(page.locator('#ratingsCount')).toHaveText('3 ratings');
  expect(await page.locator('#tableBody > .body-row').evaluateAll(rows=>rows.map(r=>r.dataset.code))).toEqual(['BG','AZ','RO']);
  await expect(page.locator('#tableBody > .body-row .total')).toHaveText(['20.0','20.0','2.5']);
  await expect(page.locator('#partyWinner .tp-country')).toHaveText(['Bulgaria','Azerbaijan']);
  await expect(page.locator('#partyWinner .tp-points')).toHaveText(['20.0 pts','20.0 pts']);
  await page.locator('#tableBody > .body-row[data-code="BG"]').click();
  const breakdown = page.locator('.bd-inner-table');
  await expect(breakdown).toContainText('Ada'); await expect(breakdown).toContainText('Bea');
  await expect(breakdown.locator('td.total')).toHaveText(['25','15']);
  await page.goto('/party-trivia.html?emulator=1');
  const card = title => page.locator('.trivia-card').filter({has:page.locator('.tc-title',{hasText:title})});
  await expect(card('Biggest Hater').locator('.tc-voter')).toHaveText('Bea');
  await expect(card('Biggest Hater').locator('.tc-value')).toHaveText('13.3 avg');
  await expect(card('Biggest Lover').locator('.tc-voter')).toHaveText('Ada');
  await expect(card('Biggest Lover').locator('.tc-value')).toHaveText('15.0 avg');
  await expect(card('Most Verbose Comment').locator('.tc-value')).toHaveText('20 chars');
  await expect(card('Most Verbose Overall').locator('.tc-value')).toHaveText('25 chars');
  expect(g.forbidden).toEqual([]); await g.context.close();
});

test('pending vote and partial draft survive abrupt page loss and reload, reconnect acknowledged once', async ({ page, context, browserName }) => {
  await host(page); await page.locator('#btnStart').click();
  await page.evaluate(()=>firebase.database().goOffline()); await expect(page.locator('#syncMessage')).toContainText('Offline');
  await rate(page,3); await page.locator('label[for="s_vocals_2"]').click(); await page.locator('#fRemind').fill('Crash draft');
  const pending = await page.evaluate(()=>EurovisionStorage.read(EurovisionSession.key('pending')));
  expect(pending.BG.vote.total).toBe(15);
  await losePage(page, context, browserName);
  const recovered = await context.newPage(); await recovered.goto('/index.html?emulator=1');
  await expect(recovered.locator('#syncMessage')).toContainText('Shared');
  expect((await remote(recovered)).votes['semi-2'].BG.total).toBe(15);
  expect(await recovered.evaluate(()=>EurovisionStorage.read(EurovisionSession.key('pending')))).toEqual({});
  await recovered.locator('#btnStart').click(); await expect(recovered.locator('#actCountry')).toHaveText('Azerbaijan');
  await expect(recovered.locator('#fRemind')).toHaveValue('Crash draft'); await expect(recovered.locator('#s_vocals_2')).toBeChecked();
  await recovered.reload(); await expect(recovered.locator('#ratingsCount')).toHaveText('1 / 18');
});

test('pending reload during emulator transport outage retains exact operation and draft until recovery', async ({ page, context }) => {
  await host(page); await page.locator('#btnStart').click();
  await page.evaluate(() => firebase.database().goOffline());
  await expect(page.locator('#syncMessage')).toContainText('Offline');
  await rate(page, 4); await page.locator('label[for="s_vocals_1"]').click(); await page.locator('#fRemind').fill('Reload draft');
  const stored = await page.evaluate(() => ({ pendingKey: EurovisionSession.key('pending'), draftKey: EurovisionSession.key('drafts'), pending: EurovisionStorage.read(EurovisionSession.key('pending')), drafts: EurovisionStorage.read(EurovisionSession.key('drafts')) }));
  const control = faults.get(context); control.disconnected = true;
  await page.reload();
  await expect(page.locator('#syncMessage')).toContainText('Connection timed out', { timeout: 18000 });
  expect(await page.evaluate(k => EurovisionStorage.read(k), stored.pendingKey)).toEqual(stored.pending);
  expect(await page.evaluate(k => EurovisionStorage.read(k), stored.draftKey)).toEqual(stored.drafts);
  control.disconnected = false; await page.reload();
  await expect(page.locator('#syncMessage')).toContainText('Shared');
  expect((await remote(page)).votes['semi-2'].BG.total).toBe(20);
  await expect(page.locator('#ratingsCount')).toHaveText('1 / 18');
  await page.locator('#btnStart').click(); await expect(page.locator('#fRemind')).toHaveValue('Reload draft');
  await expect(page.locator('#s_vocals_1')).toBeChecked();
});

test('cold reload cannot open a blank draft before authenticated storage keys initialize', async ({ page, context }) => {
  await host(page); await page.locator('#btnStart').click();
  await page.locator('label[for="s_vocals_2"]').click(); await page.locator('#fRemind').fill('Slow auth draft');
  let release; let intercepted = false;
  const gate = new Promise(resolve => { release = resolve; });
  await context.route('http://127.0.0.1:9099/**', async route => { intercepted = true; await gate; await route.fallback(); });
  const response = await page.reload(); await expect.poll(() => intercepted).toBe(true);
  expect(await response.text()).toMatch(/<button[^>]*id="btnStart"[^>]*disabled/);
  // Firefox can restore currentUser from IndexedDB while token refresh is held;
  // that valid UID may enable rating without waiting for unrelated refresh.
  expect(await page.evaluate(() => !!EurovisionSession.uid || document.getElementById('btnStart').disabled)).toBe(true);
  release(); await expect(page.locator('#btnStart')).toBeEnabled();
  await page.locator('#btnStart').click(); await expect(page.locator('#fRemind')).toHaveValue('Slow auth draft');
  await expect(page.locator('#s_vocals_2')).toBeChecked();
});

for (const operation of ['reset','leave']) for (const mode of ['before-commit','after-commit']) {
  test(`${operation} abrupt restart with ${mode} acknowledgement ambiguity preserves or cancels drafts correctly`, async ({ page, context, browserName }) => {
    const code = await host(page); await page.locator('#btnStart').click(); await rate(page,2);
    await expect(page.locator('#syncMessage')).toContainText('Shared');
    await page.locator('label[for="s_vocals_4"]').click(); await page.locator('#fRemind').fill('Ambiguous draft');
    const uid = await page.evaluate(()=>EurovisionSession.uid);
    const control = faults.get(context); control.mode = mode;
    await page.evaluate(operation => { EurovisionSession[operation]().catch(()=>{}); }, operation);
    await expect.poll(()=>control.dispatched).toBe(true);
    if(mode==='after-commit') await expect.poll(()=>control.acknowledged).toBe(true);
    expect(await page.evaluate(()=>Object.keys(EurovisionStorage.read(EurovisionSession.key('destructive-snapshot'))).length)).toBeGreaterThan(0);
    await losePage(page, context, browserName); control.mode = null;
    const recovered = await context.newPage(); await recovered.goto('/index.html?emulator=1');
    if(operation==='leave' && mode==='after-commit') {
      await expect(recovered.locator('#syncMessage')).toContainText('Join this party');
      await expect(recovered.locator('#nameModal')).toHaveClass(/active/); await recovered.locator('#nameInput').fill('Rejoined');
      await recovered.locator('#nameModalPartyCode').fill(code); await recovered.locator('#nameSave').click();
    }
    await expect(recovered.locator('#syncMessage')).toContainText('Shared');
    expect(await recovered.evaluate(()=>EurovisionSession.uid)).toBe(uid);
    const user = await remote(recovered);
    if(mode==='before-commit') {
      expect(user.votes['semi-2'].BG.total).toBe(10);
      await recovered.locator('#btnStart').click(); await expect(recovered.locator('#fRemind')).toHaveValue('Ambiguous draft');
      await expect(recovered.locator('#s_vocals_4')).toBeChecked();
    } else {
      expect(user.votes?.['semi-2']).toBeUndefined();
      expect(await recovered.evaluate(()=>EurovisionStorage.read(EurovisionSession.key('drafts')))).toEqual({});
      await expect(recovered.locator('#ratingsCount')).toHaveText('0 / 18');
      await recovered.reload(); await expect(recovered.locator('#ratingsCount')).toHaveText('0 / 18');
    }
  });
}
