const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/lib/ios-haptic-taps.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const bridge = { exports: {} }; vm.runInNewContext(source, bridge);
test('direct-tap bridge selects touch Apple devices without replacing native vibration', () => {
  const detect = bridge.exports.needsIOSHapticTap;
  assert.equal(detect({ userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 }), true);
  assert.equal(detect({ userAgent: 'Safari', platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(detect({ userAgent: 'Safari', platform: 'MacIntel', maxTouchPoints: 0 }), false);
  assert.equal(detect({ userAgent: 'Android', platform: 'Linux', maxTouchPoints: 5, vibrate() {} }), false);
  assert.equal(detect({ userAgent: 'iPhone', maxTouchPoints: 5, vibrate() {} }), false);
  assert.doesNotThrow(() => bridge.exports.installIOSHapticTaps(() => true)());
});

let playwright;
try { playwright = require(process.env.HAPTIC_PLAYWRIGHT_MODULE || 'playwright'); } catch {}
test('trusted touch activates once; submits, preference, dynamic controls, keyboard and teardown remain correct', { skip: !playwright }, async () => {
  const browser = await playwright.chromium.launch({ executablePath: process.env.HAPTIC_BROWSER || undefined, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5 like Mac OS X) AppleWebKit/605.1.15 Version/26.5 Mobile Safari/604.1' });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.setContent(`<style>button{height:52px;min-width:160px;border-radius:12px;margin:10px}body{height:2200px}</style>
      <form id="form"><button data-ios-haptic="on" id="submit">Place order</button></form>
      <button data-ios-haptic="on" id="qty" type="button">Increase</button>
      <button data-ios-haptic="on" id="disabled" disabled>Unavailable</button>
      <button id="normal">Ordinary</button><a data-ios-haptic="on" href="#saved" id="link">View bag</a>
      <button data-ios-haptic="on" aria-haspopup="dialog" id="widget">Open widget</button>
      <script>window.count=0;window.submits=0;window.allowed=true;document.querySelector('#qty').onclick=()=>window.count++;document.querySelector('#form').onsubmit=e=>{e.preventDefault();window.submits++};</script>`);
    await page.evaluate(() => { Object.defineProperty(navigator, 'vibrate', { value: undefined }); });
    await page.addScriptTag({ content: `var exports={};${source};window.cleanup=exports.installIOSHapticTaps(()=>window.allowed);` });
    assert.equal(await page.locator('[data-ios-haptic-overlay]').count(), 4);
    await page.locator('#qty').tap(); await page.waitForFunction(() => window.count === 1);
    await page.locator('#submit').tap(); await page.waitForFunction(() => window.submits === 1);
    assert.equal(await page.evaluate(() => [...new FormData(document.querySelector('#form'))].length), 0);
    assert.equal(await page.locator('#qty input').getAttribute('tabindex'), '-1');
    assert.equal(await page.locator('#qty input').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('#disabled input').isDisabled(), true);
    assert.equal(await page.locator('#widget input').count(), 0);
    await page.evaluate(() => { window.allowed = false; window.dispatchEvent(new Event('haptics-preference')); });
    assert.equal(await page.locator('#qty input').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    await page.locator('#qty').tap(); await page.waitForFunction(() => window.count === 2);
    await page.evaluate(() => { window.allowed = true; window.dispatchEvent(new Event('haptics-preference')); document.querySelector('#qty').disabled = true; });
    await page.waitForFunction(() => document.querySelector('#qty input').disabled);
    await page.evaluate(() => { document.querySelector('#qty').disabled = false; });
    await page.waitForFunction(() => !document.querySelector('#qty input').disabled);
    await page.locator('#qty').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.count === 3);
    await page.evaluate(() => { const b=document.createElement('button'); b.id='dynamic';b.textContent='Dynamic';b.dataset.iosHaptic='on';b.onclick=()=>window.count++;document.body.appendChild(b); });
    await page.waitForFunction(() => !!document.querySelector('#dynamic input'));
    await page.locator('#dynamic').tap(); await page.waitForFunction(() => window.count === 4);
    await page.locator('#link').tap(); await page.waitForURL('about:blank#saved');
    // A real touch scroll starting over a control must not become a purchase/counter click.
    await page.evaluate(() => window.scrollTo(0, 0));
    const box = await page.locator('#qty').boundingBox();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 50, y: box.y + 25 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 50, y: box.y - 80 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.count), 4);
    await page.evaluate(() => window.cleanup());
    assert.equal(await page.locator('[data-ios-haptic-overlay]').count(), 0);
    assert.equal(await page.locator('#qty').evaluate(el => el.style.position), '');
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); }
});
