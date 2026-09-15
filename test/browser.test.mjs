// Real Chromium tests of the published site. All API traffic is blocked or mocked.
// No real token or destructive operation is used by this suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = pathToFileURL(join(ROOT,'dist/app/index.html')).href;
const HOME = pathToFileURL(join(ROOT,'dist/index.html')).href;
const ZH = pathToFileURL(join(ROOT,'dist/zh/index.html')).href;
let chromium = null;
try { ({chromium} = await import('playwright')); } catch { /* optional for zero-dependency unit runs */ }
if (!chromium) {
  test('browser tests', {skip:'playwright not installed; run npm run test:browser'},()=>{});
} else {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  test.after(()=>browser.close());
  async function open(opts = {}, url = PAGE) {
    const page = await browser.newPage(opts);
    const errors = [];
    const requests = [];
    page.on('console', m=>{if(m.type()==='error') errors.push(m.text());});
    page.on('pageerror', e=>errors.push('pageerror: '+e.message));
    page.on('request', req=>{if(req.url().startsWith('https://api.github.com')) requests.push(req.url());});
    await page.route('https://api.github.com/**', route=>route.abort('blockedbyclient'));
    await page.goto(url);
    page.errors = errors;
    page.apiRequests = requests;
    return page;
  }
  async function demo(opts) { const page=await open(opts); await page.click('#demo'); await page.waitForSelector('tbody tr'); return page; }
  const clean = page=>assert.deepEqual(page.errors,[],'console was not clean');
  const noOverflow = async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);

  test('workspace opens in English with no token and no errors',async()=>{
    const page=await open({locale:'zh-CN'});
    assert.equal(await page.textContent('h1'),'GitHub Repo Cleaner');
    assert.equal(await page.getAttribute('html','lang'),'en');
    assert.ok(await page.isVisible('#token'));
    assert.equal(await page.isVisible('#action.on'),false);
    clean(page); await page.close();
  });
  test('demo fills table and stats without any GitHub request',async()=>{
    const page=await demo();
    assert.ok((await page.$$('tbody tr')).length>10);
    assert.equal((await page.$$('#stats .stat')).length,7);
    assert.match(await page.textContent('#notice'),/Demo mode/);
    assert.ok(await page.isVisible('#demoFlag'));
    assert.deepEqual(page.apiRequests,[]);
    clean(page); await page.close();
  });
  test('search, filters and sorting drive the table',async()=>{
    const page=await demo();
    const all=(await page.$$('tbody tr')).length;
    await page.fill('#q','definitely-not-a-repo'); await page.waitForSelector('.empty');
    await page.fill('#q',''); await page.waitForSelector('tbody tr');
    assert.equal((await page.$$('tbody tr')).length,all);
    await page.click('#stats button[data-stat="archived"]');
    assert.equal(await page.inputValue('#fKind'),'archived');
    const archived=(await page.$$('tbody tr')).length;
    assert.ok(archived>0 && archived<all);
    await page.selectOption('#fKind','all');
    await page.click('thead th[data-k="size"]');
    const first=await page.textContent('tbody tr:first-child .num');
    await page.click('thead th[data-k="size"]');
    assert.notEqual(first,await page.textContent('tbody tr:first-child .num'));
    clean(page); await page.close();
  });
  test('selection never selects repositories without admin access',async()=>{
    const page=await demo();
    await page.click('tbody tr:first-child td:nth-child(2)');
    assert.ok(await page.isVisible('#action.on'));
    assert.equal(await page.textContent('#aCount'),'1 repository selected');
    await page.click('#selAll');
    const selected=Number((await page.textContent('#aCount')).match(/\d+/)[0]);
    const admins=await page.evaluate(()=>S.repos.filter(r=>r.permissions.admin).length);
    assert.equal(selected,admins);
    await page.click('#selNone');
    assert.equal(await page.isVisible('#action.on'),false);
    clean(page); await page.close();
  });
  test('destructive actions require both confirmation controls',async()=>{
    const page=await demo();
    await page.click('#selAll'); await page.click('[data-task="delete"]'); await page.waitForSelector('#cRun');
    assert.ok(await page.isDisabled('#cRun'));
    await page.click('#cFill'); assert.ok(await page.isDisabled('#cRun'));
    await page.check('#cAck'); assert.equal(await page.isDisabled('#cRun'),false);
    assert.match(await page.textContent('#mBody'),/no undo in this tool/);
    await page.click('#cCancel'); assert.equal(await page.isVisible('.mask.on'),false);
    assert.deepEqual(page.apiRequests,[]);
    clean(page); await page.close();
  });
  test('a demo batch produces one result per item and a report',async()=>{
    const page=await demo();
    await page.click('#selAll'); await page.click('[data-task="archive"]'); await page.waitForSelector('#cRun');
    const planned=Number((await page.textContent('#mTitle')).match(/\d+/)[0]);
    await page.click('#cRun'); await page.waitForSelector('#pClose:not([disabled])',{timeout:120000});
    assert.equal((await page.$$('#pLog div')).length,planned);
    assert.match(await page.textContent('#pTip'),/succeeded/);
    assert.ok(await page.isVisible('#pReport'));
    await page.click('#pClose');
    assert.deepEqual(page.apiRequests,[]);
    clean(page); await page.close();
  });
  test('packages remain available and hide repository-only filters',async()=>{
    const page=await demo(); await page.click('#tabP'); await page.waitForSelector('tbody tr');
    assert.ok((await page.$$('tbody tr')).length>0);
    assert.equal(await page.isVisible('#fAge'),false);
    assert.equal(await page.isVisible('#quickFilters'),false);
    clean(page); await page.close();
  });
  test('language and theme can change in a connected workspace',async()=>{
    const page=await demo(); await page.click('#lang');
    assert.equal(await page.textContent('#tabR'),'仓库');
    assert.equal(await page.getAttribute('html','lang'),'zh-CN');
    await page.waitForFunction(()=>document.querySelector('#productGuide').getAttribute('href').includes('../zh/'));
    await page.click('#lang'); assert.equal(await page.textContent('#tabR'),'Repositories');
    await page.click('#theme'); assert.equal(await page.getAttribute('html','data-theme'),'light');
    await page.click('#theme'); assert.equal(await page.getAttribute('html','data-theme'),'dark');
    clean(page); await page.close();
  });
  test('backup, export and support dialogs remain usable with accurate backup limits',async()=>{
    const page=await demo(); await page.click('#selAll'); await page.click('#backup'); await page.waitForSelector('#tTxt');
    const script=await page.inputValue('#tTxt');
    assert.ok(script.startsWith('#!/usr/bin/env bash')); assert.ok(script.includes('git clone --mirror'));
    assert.match(await page.textContent('#mBody'),/only generates commands/);
    await page.click('#cCancel'); await page.click('#export'); await page.waitForSelector('#tTxt');
    assert.ok((await page.inputValue('#tTxt')).startsWith('full_name,owner,'));
    await page.click('#cCancel'); await page.click('#ticket'); await page.waitForSelector('#tTxt');
    assert.ok((await page.inputValue('#tTxt')).includes('GitHub username: octo-demo'));
    await page.click('#cCancel'); clean(page); await page.close();
  });
  test('keyboard shortcuts work and Escape clears a selection',async()=>{
    const page=await demo(); await page.keyboard.press('/');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'q');
    await page.keyboard.press('Escape'); await page.click('body'); await page.keyboard.press('a');
    assert.ok(await page.isVisible('#action.on')); await page.keyboard.press('Escape');
    assert.equal(await page.isVisible('#action.on'),false);
    clean(page); await page.close();
  });
  test('disconnect clears account state, selection and the token input',async()=>{
    const page=await demo(); await page.click('#logout');
    assert.ok(await page.isVisible('#token'));
    assert.equal(await page.evaluate(()=>S.repos.length+S.sel.size),0);
    assert.equal(await page.inputValue('#token'),'');
    assert.equal(await page.evaluate(()=>S.token),'');
    clean(page); await page.close();
  });
  test('workspace does not overflow phone width in either theme',async()=>{
    const page=await demo({viewport:{width:390,height:844}}); await noOverflow(page);
    await page.click('#theme'); await page.click('#theme'); await noOverflow(page);
    await page.click('#selAll'); await noOverflow(page);
    clean(page); await page.close();
  });
  test('homepage demo CTA reaches the real interactive workspace',async()=>{
    const page=await open({},HOME);
    assert.ok(await page.isVisible('h1'));
    await page.locator('a.button').filter({hasText:'Try the demo'}).first().click();
    await page.waitForSelector('tbody tr');
    assert.ok(await page.isVisible('#demoFlag'));
    assert.deepEqual(page.apiRequests,[]);
    clean(page); await page.close();
  });
  test('Chinese homepage demo preserves Chinese in the workspace',async()=>{
    const page=await open({},ZH);
    assert.equal(await page.getAttribute('html','lang'),'zh-CN');
    await page.locator('a.button').filter({hasText:'体验演示'}).first().click();
    await page.waitForSelector('tbody tr');
    assert.equal(await page.getAttribute('html','lang'),'zh-CN');
    assert.equal(await page.textContent('#tabR'),'仓库');
    clean(page); await page.close();
  });
  test('static marketing pages and FAQ remain usable without JavaScript',async()=>{
    const page=await open({javaScriptEnabled:false},HOME);
    assert.match(await page.textContent('h1'),/Clean up your GitHub/);
    await page.locator('summary').first().click();
    assert.ok(await page.locator('details').first().getAttribute('open') !== null);
    await page.locator('.nav-links a').filter({hasText:'How to use'}).click();
    assert.match(await page.textContent('h1'),/careful cleanup/);
    clean(page); await page.close();
  });
  test('quick filters clear previous selection and match the displayed criterion',async()=>{
    const page=await demo(); await page.click('#selAll');
    await page.click('[data-quick="forks"]');
    assert.equal(await page.inputValue('#fKind'),'fork');
    assert.equal(await page.inputValue('#fAge'),'1');
    assert.equal(await page.evaluate(()=>S.sel.size),0);
    assert.ok(await page.evaluate(()=>S.list.every(r=>r.fork)));
    await page.click('[data-quick="all"]');
    assert.equal(await page.inputValue('#fKind'),'all');
    assert.equal(await page.inputValue('#fAge'),'all');
    clean(page); await page.close();
  });
  test('entering demo clears a pasted token without sending it anywhere',async()=>{
    const page=await open(); await page.fill('#token','test-only-never-a-real-token'); await page.click('#demo');
    assert.equal(await page.inputValue('#token'),'');
    assert.equal(await page.evaluate(()=>S.token),'');
    assert.deepEqual(page.apiRequests,[]);
    clean(page); await page.close();
  });
  test('failed authentication clears the in-memory token',async()=>{
    const page=await open();
    await page.route('https://api.github.com/**',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'Bad credentials'})}));
    await page.fill('#token','test-only-invalid-token'); await page.click('#go'); await page.waitForSelector('#err:not([hidden])');
    assert.equal(await page.evaluate(()=>S.token),'');
    assert.equal(await page.inputValue('#token'),'');
    assert.equal(await page.evaluate(()=>S.user),null);
    await page.close();
  });
  test('foreign API origins are rejected before any fetch',async()=>{
    const page=await open();
    const message=await page.evaluate(async()=>{try{await ghRaw('https://example.com/steal');return 'not rejected';}catch(e){return e.message;}});
    assert.match(message,/Refusing a request outside/);
    assert.deepEqual(page.apiRequests,[]);
    clean(page); await page.close();
  });
  test('malformed successful list responses are not silently treated as a complete list',async()=>{
    const page=await open();
    await page.route('https://api.github.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"unexpected":true}'}));
    const message=await page.evaluate(async()=>{try{await ghAll('/fixture');return 'not rejected';}catch(e){return e.message;}});
    assert.match(message,/unexpected list response/);
    await page.close();
  });
  test('pagination cap visibly reports an incomplete list and loaded-only selection',async()=>{
    const page=await demo(); let calls=0;
    await page.route('https://api.github.com/**',route=>{calls++;return route.fulfill({status:200,contentType:'application/json',headers:{link:`<https://api.github.com/fixture?page=${calls+1}>; rel="next"`},body:JSON.stringify([{id:calls}])});});
    await page.evaluate(async()=>{await ghAll('/fixture');render();});
    assert.equal(calls,30);
    assert.match(await page.textContent('#notice'),/INCOMPLETE LIST/);
    assert.match(await page.textContent('#selAll'),/loaded/);
    await page.close();
  });
  test('localized desktop and mobile pages render cleanly and produce review screenshots',async()=>{
    mkdirSync(join(ROOT,'test-results'),{recursive:true});
    for(const [name,url,width] of [['home-desktop',HOME,1440],['home-mobile',HOME,390],['home-zh',ZH,1440]]) {
      const page=await open({viewport:{width,height:960}},url);
      await noOverflow(page); clean(page);
      await page.screenshot({path:join(ROOT,'test-results',name+'.png'),fullPage:true});
      await page.close();
    }
    const page=await demo({viewport:{width:1440,height:960}});
    await page.screenshot({path:join(ROOT,'test-results','workspace.png'),fullPage:true});
    await page.click('#theme'); await page.click('#theme');
    await page.screenshot({path:join(ROOT,'test-results','workspace-dark.png'),fullPage:true});
    clean(page); await page.close();
  });
}
