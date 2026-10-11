import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Intercept SDK downloads with installed compat SDK; no production network is permitted.
export const faults = new WeakMap();
export async function isolate(context) {
  const control = { mode: null, dispatched: false, acknowledged: false };
  faults.set(context, control);
  const forbidden = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.gstatic.com' && /firebase-.*-compat.js$/.test(url.pathname)) {
      return route.fulfill({ contentType: 'application/javascript', body: readFileSync('node_modules/firebase/' + url.pathname.split('/').at(-1)) });
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) {
      if (control.disconnected && url.port === '9000') return route.abort();
      return route.continue();
    }
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.abort();
    // Firebase Auth probes its optional popup/redirect iframe on Firefox/WebKit.
    // Anonymous emulator auth needs neither Google API script nor production iframe.
    if (url.hostname === 'apis.google.com' && url.pathname === '/js/api.js') return route.abort();
    forbidden.push(url.toString()); return route.abort();
  });
  // WebSocket destinations are also restricted, preventing accidental production DB access.
  await context.routeWebSocket('**/*', ws => {
    const u = new URL(ws.url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname)) { forbidden.push(ws.url()); ws.close(); }
    else if (control.disconnected) ws.close();
    else {
      const server = ws.connectToServer();
      let heldRequest;
      ws.onMessage(message => {
        let packet; try { packet = JSON.parse(String(message)); } catch {}
        if (control.mode && packet?.d?.a === 'm') {
          control.dispatched = true; heldRequest = packet.d.r;
          if (control.mode === 'before-commit') return;
        }
        server.send(message);
      });
      server.onMessage(message => {
        let packet; try { packet = JSON.parse(String(message)); } catch {}
        if (heldRequest !== undefined && packet?.d?.r === heldRequest) {
          control.acknowledged = true; return; // server committed, browser never got ACK
        }
        ws.send(message);
      });
    }
  });
  return forbidden;
}
export const test = base.extend({ context: async ({ context }, use) => {
  const forbidden = await isolate(context);
  await use(context); expect(forbidden, 'No production requests').toEqual([]);
} });
export async function host(page, name='Host') {
  await page.goto('/index.html?emulator=1');
  await page.locator('#nameInput').fill(name);
  await expect(page.locator('#nameSave')).toHaveText('Start Party');
  await page.locator('#nameSave').click();
  await expect(page.locator('#nameModal')).not.toHaveClass(/active/);
  await expect(page.locator('#syncMessage')).toContainText('Shared');
  await expect.poll(() => page.evaluate(() => EurovisionSession.ready)).toBe(true);
  return page.locator('#partyCodeValue').textContent();
}
export async function rate(page, value=0) {
  for (const field of ['vocals','performance','song','original','stage']) await page.locator(`label[for="s_${field}_${value}"]`).click();
  await expect(page.locator('#btnSave')).toBeEnabled(); await page.locator('#btnSave').click();
}
export async function remote(page) {
  return page.evaluate(async () => {
    const S = EurovisionSession;
    return (await firebase.database().ref('2026/parties/' + localStorage.ev_2026_party + '/users/' + S.uid).once('value')).val();
  });
}
