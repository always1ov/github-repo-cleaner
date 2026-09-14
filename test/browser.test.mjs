// End-to-end checks against real Chromium. Skipped when Playwright is not installed,
// so `npm test` stays dependency-free; CI installs it and runs the full set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const PAGE = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html')).href;

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* optional */ }

if (!chromium) {
  test('browser tests', { skip: 'playwright not installed' }, () => {});
} else {
  const browser = await chromium.launch();
  test.after(() => browser.close());

  /** Opens the page in demo mode and fails the test on any console or page error. */
  async function open(opts = {}) {
    const page = await browser.newPage(opts);
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.goto(PAGE);
    page.errors = errors;
    return page;
  }
  async function demo(opts) {
    const page = await open(opts);
    await page.click('#demo');
    await page.waitForSelector('tbody tr');
    return page;
  }
  const clean = page => assert.deepEqual(page.errors, [], 'console was not clean');

  test('the landing page loads with no token and no errors', async () => {
    const page = await open();
    assert.equal(await page.textContent('h1'), 'GitHub Repo Cleaner');
    assert.ok(await page.isVisible('#token'));
    assert.equal(await page.isVisible('#action.on'), false);
    clean(page);
    await page.close();
  });

  test('demo mode fills the table, stats and warning banner', async () => {
    const page = await demo();
    assert.ok((await page.$$('tbody tr')).length > 10);
    assert.equal((await page.$$('#stats .stat')).length, 7);
    assert.match(await page.textContent('#notice'), /Demo mode/);
    assert.ok(await page.isVisible('#demoFlag'));
    clean(page);
    await page.close();
  });

  test('search, filters and sorting drive the table', async () => {
    const page = await demo();
    const all = (await page.$$('tbody tr')).length;

    await page.fill('#q', 'definitely-not-a-repo');
    await page.waitForSelector('.empty');
    await page.fill('#q', '');
    await page.waitForSelector('tbody tr');
    assert.equal((await page.$$('tbody tr')).length, all, 'clearing the search restores every row');

    await page.click('#stats button[data-stat="archived"]');
    assert.equal(await page.inputValue('#fKind'), 'archived');
    const archived = (await page.$$('tbody tr')).length;
    assert.ok(archived > 0 && archived < all, 'the archived filter narrows the list');
    await page.selectOption('#fKind', 'all');

    await page.click('thead th[data-k="size"]');
    const first = await page.textContent('tbody tr:first-child .num');
    await page.click('thead th[data-k="size"]');
    assert.notEqual(first, await page.textContent('tbody tr:first-child .num'), 'sort flips');
    clean(page);
    await page.close();
  });

  test('selection drives the action bar and never selects rows you cannot act on', async () => {
    const page = await demo();
    await page.click('tbody tr:first-child td:nth-child(2)');
    assert.ok(await page.isVisible('#action.on'));
    assert.equal(await page.textContent('#aCount'), '1 repository selected');

    await page.click('#selAll');
    const selected = Number((await page.textContent('#aCount')).match(/\d+/)[0]);
    const admins = await page.evaluate(() => S.repos.filter(r => r.permissions.admin).length);
    assert.equal(selected, admins, 'non-admin repositories stay unselected');

    await page.click('#selNone');
    assert.equal(await page.isVisible('#action.on'), false);
    clean(page);
    await page.close();
  });

  test('destructive actions stay locked until both confirmations are given', async () => {
    const page = await demo();
    await page.click('#selAll');
    await page.click('[data-task="delete"]');
    await page.waitForSelector('#cRun');
    assert.ok(await page.isDisabled('#cRun'), 'delete is disabled by default');
    await page.click('#cFill');
    assert.ok(await page.isDisabled('#cRun'), 'typing DELETE alone is not enough');
    await page.check('#cAck');
    assert.equal(await page.isDisabled('#cRun'), false, 'both confirmations unlock it');
    await page.click('#cCancel');
    assert.equal(await page.isVisible('.mask.on'), false);
    clean(page);
    await page.close();
  });

  test('a batch run reports every item and can be closed', async () => {
    const page = await demo();
    await page.click('#selAll');
    await page.click('[data-task="archive"]');
    await page.waitForSelector('#cRun');
    const planned = Number((await page.textContent('#mTitle')).match(/\d+/)[0]);
    await page.click('#cRun');
    await page.waitForSelector('#pClose:not([disabled])', { timeout: 120000 });
    assert.equal((await page.$$('#pLog div')).length, planned, 'one log line per item');
    assert.match(await page.textContent('#pTip'), /succeeded/);
    assert.ok(await page.isVisible('#pReport'), 'a run report is offered');
    await page.click('#pClose');
    clean(page);
    await page.close();
  });

  test('packages view loads and switches filters', async () => {
    const page = await demo();
    await page.click('#tabP');
    await page.waitForSelector('tbody tr');
    assert.ok((await page.$$('tbody tr')).length > 0);
    assert.equal(await page.isVisible('#fAge'), false, 'age filter is repository-only');
    clean(page);
    await page.close();
  });

  test('language and theme can be changed while signed in', async () => {
    const page = await demo();
    await page.click('#lang');
    assert.equal(await page.textContent('#tabR'), '仓库');
    assert.equal(await page.getAttribute('html', 'lang'), 'zh-CN');
    await page.click('#lang');
    assert.equal(await page.textContent('#tabR'), 'Repositories');

    await page.click('#theme');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
    await page.click('#theme');
    assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
    clean(page);
    await page.close();
  });

  test('backup, export and ticket dialogs produce usable text', async () => {
    const page = await demo();
    await page.click('#selAll');

    await page.click('#backup');
    await page.waitForSelector('#tTxt');
    const script = await page.inputValue('#tTxt');
    assert.ok(script.startsWith('#!/usr/bin/env bash'));
    assert.ok(script.includes('git clone --mirror'));
    await page.click('#cCancel');

    await page.click('#export');
    await page.waitForSelector('#tTxt');
    assert.ok((await page.inputValue('#tTxt')).startsWith('full_name,owner,'));
    await page.click('#cCancel');

    await page.click('#ticket');
    await page.waitForSelector('#tTxt');
    assert.ok((await page.inputValue('#tTxt')).includes('GitHub username: octo-demo'));
    await page.click('#cCancel');
    clean(page);
    await page.close();
  });

  test('keyboard shortcuts work and Escape clears a selection', async () => {
    const page = await demo();
    await page.keyboard.press('/');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'q');
    await page.keyboard.press('Escape');
    await page.click('body');
    await page.keyboard.press('a');
    assert.ok(await page.isVisible('#action.on'));
    await page.keyboard.press('Escape');
    assert.equal(await page.isVisible('#action.on'), false);
    clean(page);
    await page.close();
  });

  test('signing out clears the account and returns to the landing page', async () => {
    const page = await demo();
    await page.click('#logout');
    assert.ok(await page.isVisible('#token'));
    assert.equal(await page.evaluate(() => S.repos.length + S.sel.size), 0, 'state is wiped');
    clean(page);
    await page.close();
  });

  test('the layout never scrolls sideways on a phone', async () => {
    const page = await demo({ viewport: { width: 390, height: 780 } });
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(overflow, 0, `overflows by ${overflow}px`);
    clean(page);
    await page.close();
  });
}
