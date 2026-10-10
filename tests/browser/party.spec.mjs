import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Intercept SDK downloads with installed compat SDK; no production network is permitted.
async function isolate(context) {
  const forbidden = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.gstatic.com' && /firebase-.*-compat.js$/.test(url.pathname)) {
      return route.fulfill({ contentType: 'application/javascript', body: readFileSync('node_modules/firebase/' + url.pathname.split('/').at(-1)) });
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.abort();
    forbidden.push(url.toString()); return route.abort();
  });
  // WebSocket destinations are also restricted, preventing accidental production DB access.
  await context.routeWebSocket('**/*', ws => {
    const u = new URL(ws.url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname)) { forbidden.push(ws.url()); ws.close(); }
    else ws.connectToServer();
  });
  return forbidden;
}
const test = base.extend({ context: async ({ context }, use) => {
  const forbidden = await isolate(context);
  await use(context); expect(forbidden, 'No production requests').toEqual([]);
} });
async function host(page, name='Host') {
  await page.goto('/index.html?emulator=1');
  await page.locator('#nameInput').fill(name);
  await expect(page.locator('#nameSave')).toHaveText('Start Party');
  await page.locator('#nameSave').click();
  await expect(page.locator('#nameModal')).not.toHaveClass(/active/);
  await expect(page.locator('#syncMessage')).toContainText('Shared');
  return page.locator('#partyCodeValue').textContent();
}
async function rate(page, value=0) {
  for (const field of ['vocals','performance','song','original','stage']) await page.locator(`label[for="s_${field}_${value}"]`).click();
  await expect(page.locator('#btnSave')).toBeEnabled(); await page.locator('#btnSave').click();
}
async function remote(page) {
  return page.evaluate(async () => {
    const S = EurovisionSession;
    return (await firebase.database().ref('2026/parties/' + localStorage.ev_2026_party + '/users/' + S.uid).once('value')).val();
  });
}
test('hosting default, invite join, two guests, no overwrite; all pages load', async ({ page, browser }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const code = await host(page); await page.locator('#btnStart').click(); await rate(page);
  const ctx = await browser.newContext(); const guest = await ctx.newPage();
  // Apply the same network isolation to the second independent client.
  const guestForbidden = await isolate(ctx);
  await guest.goto('/index.html?emulator=1&party=' + code);
  await guest.locator('#nameInput').fill('Guest'); await expect(guest.locator('#nameSave')).toHaveText('Join Party');
  await guest.locator('#nameSave').click(); await expect(guest.locator('#nameModal')).not.toHaveClass(/active/);
  await guest.locator('#btnStart').click(); await guest.locator('#btnSkip').click(); await rate(guest, 5);
  await expect(guest.locator('#syncMessage')).toContainText('Shared');
  const users = await page.evaluate(async () => (await firebase.database().ref('2026/parties/' + localStorage.ev_2026_party + '/users').once('value')).val());
  expect(Object.keys(users)).toHaveLength(2);
  expect(Object.values(users).map(u=>u.votes['semi-2'])).toEqual(expect.arrayContaining([expect.objectContaining({BG:expect.objectContaining({total:0})}),expect.objectContaining({AZ:expect.objectContaining({total:25})})]));
  for (const url of ['party-votes.html','party-trivia.html','help.html']) { await page.goto('/'+url+'?emulator=1'); await expect(page.locator('body')).toBeVisible(); if(url!=='help.html') await expect(page.locator('#syncMessage')).toContainText('Shared'); }
  expect(errors).toEqual([]); expect(guestForbidden).toEqual([]); await ctx.close();
});
test('partial scoring blocked; drafts survive refresh; explicit zero; skipped recovery; keyboard dialogs', async ({ page }) => {
  await host(page); await page.locator('#btnStart').click(); await expect(page.locator('#btnSave')).toBeDisabled();
  await page.locator('label[for="s_vocals_0"]').click(); await page.locator('#fRemind').fill('Draft note'); await expect(page.locator('#btnSave')).toBeDisabled();
  await page.reload(); await page.locator('#btnStart').click(); await expect(page.locator('#s_vocals_0')).toBeChecked(); await expect(page.locator('#fRemind')).toHaveValue('Draft note');
  await rate(page); await expect(page.locator('#syncMessage')).toContainText('Shared');
  expect((await remote(page)).votes['semi-2'].BG.total).toBe(0);
  for(let i=1;i<18;i++) await page.locator('#btnSkip').click();
  await expect(page.locator('#donePanel h2')).toHaveText('1 of 18 acts rated');
  await page.locator('#btnReviewSkipped').click(); await expect(page.locator('#actCountry')).toHaveText('Azerbaijan');
  await page.getByRole('button',{name:'Settings',exact:true}).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.locator('#nameModal')).not.toHaveClass(/active/);
  await page.locator('#s_vocals_0').focus(); await page.keyboard.press('ArrowRight'); await expect(page.locator('#s_vocals_1')).toBeChecked();
});
test('offline save queued, reconnect acknowledged; reset preserves other stage; stale other tab cannot resurrect', async ({ page, context }) => {
  await host(page); await page.locator('#btnStart').click(); await rate(page,2); await expect(page.locator('#syncMessage')).toContainText('Shared');
  await page.evaluate(() => firebase.database().goOffline()); await context.setOffline(true); await expect(page.locator('#syncMessage')).toContainText('Offline');
  await rate(page,3); await expect(page.locator('#syncMessage')).toContainText('Offline');
  await context.setOffline(false); await page.evaluate(() => firebase.database().goOnline()); await expect(page.locator('#syncMessage')).toContainText('Shared');
  expect((await remote(page)).votes['semi-2'].AZ.total).toBe(15);
  // Other contest is deliberately seeded through the same authenticated own-write contract.
  await page.evaluate(async () => { await firebase.database().ref('2026/parties/'+localStorage.ev_2026_party+'/users/'+EurovisionSession.uid+'/votes/semi-1/MD').set({vocals:1,performance:1,song:1,original:1,stage:1,total:5,remind:'',epoch:0,updatedAt:firebase.database.ServerValue.TIMESTAMP}); });
  const tab=await context.newPage(); await tab.goto('/index.html?emulator=1'); await expect(tab.locator('#syncMessage')).toContainText('Shared');
  await tab.evaluate(()=>firebase.database().goOffline()); await tab.locator('#btnStart').click(); await rate(tab,4);
  page.on('dialog',d=>d.accept()); await page.locator('#namePill').click(); await page.locator('#nameReset').click();
  await expect(page.locator('#ratingsCount')).toHaveText('0 / 18');
  await tab.evaluate(()=>firebase.database().goOnline()); await expect(tab.locator('#ratingsCount')).toHaveText('0 / 18');
  const user=await remote(page); expect(user.votes['semi-1'].MD.total).toBe(5); expect(user.votes['semi-2']).toBeUndefined();
  await tab.close();
});
test('missing invite gives recovery; denied writes never shared', async ({ page }) => {
  await page.goto('/index.html?emulator=1&party=ZZZZZZ'); await page.locator('#nameInput').fill('Lost'); await page.locator('#nameSave').click();
  await expect(page.locator('#syncMessage')).toContainText('Party not found'); await expect(page.locator('#nameModal')).toHaveClass(/active/);
  await page.locator('#nameModalPartyCode').fill(''); await page.locator('#nameSave').click(); await expect(page.locator('#nameModal')).not.toHaveClass(/active/);
  await page.evaluate(async () => { await firebase.database().ref('2026/parties/'+localStorage.ev_2026_party+'/members/'+EurovisionSession.uid).remove(); });
  await page.locator('#btnStart').click();
  for (const field of ['vocals','performance','song','original','stage']) await page.locator(`label[for="s_${field}_2"]`).click();
  await expect(page.locator('#syncMessage')).toContainText('Not shared');
  await expect(page.locator('#btnSave')).toBeDisabled();
  expect(await page.evaluate(() => EurovisionSession.ready)).toBe(false);
  // Still exercise an actual denied SDK write; disabled UI alone isn't proof.
  expect(await page.evaluate(async () => {
    try {
      await firebase.database().ref('2026/parties/'+localStorage.ev_2026_party+'/users/'+EurovisionSession.uid+'/votes/semi-2/BG').set({ vocals:2, performance:2, song:2, original:2, stage:2, total:10, remind:'', epoch:0, updatedAt:firebase.database.ServerValue.TIMESTAMP });
      return 'accepted';
    } catch (e) { return e.code; }
  })).toBe('PERMISSION_DENIED');
  await expect(page.locator('#syncMessage')).toContainText('Not shared');
});

test('same identity tabs preserve distinct acts, documented same-act last-server-write wins, leave cancels queues', async ({ page, context }) => {
  const code=await host(page); await page.locator('#btnStart').click(); await rate(page,1); await expect(page.locator('#syncMessage')).toContainText('Shared');
  const tab=await context.newPage(); await tab.goto('/index.html?emulator=1'); await expect(tab.locator('#syncMessage')).toContainText('Shared');
  expect(await tab.evaluate(()=>EurovisionSession.uid)).toBe(await page.evaluate(()=>EurovisionSession.uid));
  await tab.locator('#btnStart').click(); await rate(tab,2); await expect(tab.locator('#syncMessage')).toContainText('Shared');
  await page.locator('#tableBody tr[data-code="BG"]').click(); await rate(page,3); await expect(page.locator('#syncMessage')).toContainText('Shared');
  let user=await remote(page); expect(user.votes['semi-2'].BG.total).toBe(15); expect(user.votes['semi-2'].AZ.total).toBe(10);
  await tab.locator('#tableBody tr[data-code="BG"]').click(); await rate(tab,5); await expect(tab.locator('#syncMessage')).toContainText('Shared');
  user=await remote(page); expect(user.votes['semi-2'].BG.total).toBe(25); expect(user.votes['semi-2'].AZ.total).toBe(10);
  await tab.evaluate(()=>firebase.database().goOffline()); await tab.locator('#tableBody tr[data-code="BG"]').click(); await rate(tab,4);
  page.on('dialog',d=>d.accept()); await page.locator('#namePill').click(); await page.locator('#nameDelete').click();
  await expect(page.locator('#nameModal')).toHaveClass(/active/);
  await expect(page).toHaveURL(/index.html\?emulator=1$/);
  await expect(page.locator('#nameInput')).toHaveValue('');
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.endsWith(':left-votes')))).toBe(true);
  await tab.evaluate(()=>firebase.database().goOnline());
  // Rejoin same code intentionally: epochs retained, stale queue cannot return.
  await page.locator('#nameInput').fill('Rejoined'); await page.locator('#nameModalPartyCode').fill(code); await page.locator('#nameSave').click();
  await expect(page.locator('#nameModal')).not.toHaveClass(/active/); await expect(page.locator('#ratingsCount')).toHaveText('0 / 18');
  user=await remote(page); expect(user.votes).toBeUndefined(); await tab.close();
});
test('drafts isolated across stages; mobile layout and recovery screens', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await host(page);
  await page.screenshot({path:'test-results/mobile-onboarding-complete.png',fullPage:true});
  await page.locator('#btnStart').click(); await page.locator('label[for="s_vocals_2"]').click(); await page.locator('#fRemind').fill('Semi 2 draft');
  await page.locator('#namePill').click(); await page.locator('#stageSelect').selectOption('semi-1'); await page.locator('#nameSave').click();
  await page.locator('#btnStart').click(); await expect(page.locator('#actCountry')).toHaveText('Moldova'); await expect(page.locator('#fRemind')).toHaveValue('');
  await expect(page.locator('#btnSave')).toBeDisabled();
  await page.locator('#namePill').click(); await page.locator('#stageSelect').selectOption('semi-2'); await page.locator('#nameSave').click(); await page.locator('#btnStart').click();
  await expect(page.locator('#fRemind')).toHaveValue('Semi 2 draft'); await expect(page.locator('#s_vocals_2')).toBeChecked();
  await page.screenshot({path:'test-results/mobile-rating.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({width:1440,height:1000}); await page.screenshot({path:'test-results/desktop-rating.png',fullPage:true});
});
