import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderPage, normalizeSiteURL, relativeLink, routeFor } from '../site/build.mjs';
import { replaceOnce, replaceTranslations, extra } from '../site/app.mjs';
const css = readFileSync(new URL('../site/theme.css', import.meta.url), 'utf8');

test('English homepage is useful without JavaScript and presents a free product', () => {
  const html = renderPage({css});
  assert.match(html, /<html lang="en">/);
  assert.match(html, /Clean up your GitHub/);
  assert.match(html, /No sign-up\. No subscription\. All features are free/);
  assert.match(html, /href="app\/index\.html#demo"/);
  assert.match(html, /href="app\/index\.html#en"/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/<details>/g) || []).length, 6);
  assert.doesNotMatch(html, /<script(?! type="application\/ld\+json")/);
});

test('all ten localized pages have correct language, navigation, canonical and hreflang', () => {
  const base = 'https://example.com/tools/cleaner/';
  for (const locale of ['en','zh']) for (const kind of ['home','guide','security','privacy','terms']) {
    const html = renderPage({locale,kind,css,siteURL:base});
    const route = routeFor(locale,kind);
    assert.match(html, new RegExp(`<html lang="${locale === 'en' ? 'en' : 'zh-CN'}">`));
    assert.ok(html.includes(`href="${new URL(route.replace('index.html',''),base).href}"`));
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="zh-CN"/);
    assert.match(html, /hreflang="x-default"/);
    assert.ok(html.includes(relativeLink(route,'app/index.html') + (locale === 'zh' ? '#zh' : '#en')));
    assert.match(html, /<main id="main"/);
    assert.match(html, /class="skip"/);
  }
});

test('relative routes work at domain root and under GitHub Pages project paths', () => {
  assert.equal(relativeLink('index.html','app/index.html'),'app/index.html');
  assert.equal(relativeLink('zh/index.html','app/index.html'),'../app/index.html');
  assert.equal(relativeLink('zh/guide/index.html','app/index.html'),'../../app/index.html');
  assert.equal(relativeLink('guide/index.html','zh/guide/index.html'),'../zh/guide/index.html');
});

test('canonical origin validation rejects credentials, queries, fragments and non-HTTPS URLs', () => {
  assert.equal(normalizeSiteURL('https://example.com/project'),'https://example.com/project/');
  for (const url of ['http://example.com','https://user:pass@example.com','https://example.com/?token=x','https://example.com/#x','javascript:alert(1)','not a URL']) assert.throws(()=>normalizeSiteURL(url));
});

test('marketing pages do not load trackers, remote assets, forms or account flows', () => {
  for (const locale of ['en','zh']) for (const kind of ['home','guide','security','privacy','terms']) {
    const html = renderPage({locale,kind,css});
    assert.doesNotMatch(html, /<(iframe|form|input)\b/i);
    assert.doesNotMatch(html, /<script[^>]+src=/i);
    assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
    assert.doesNotMatch(html, /url\(\s*['"]?https?:/i);
    assert.match(html, /connect-src 'none'/);
    assert.doesNotMatch(html, /on(click|load|error)=/i);
  }
});

test('all external hyperlinks prevent tabnabbing', () => {
  for (const locale of ['en','zh']) for (const kind of ['home','guide','security','privacy','terms']) {
    for (const link of renderPage({locale,kind}).matchAll(/<a\b[^>]*href="https?:[^>]+>/g)) assert.match(link[0], /rel="noopener noreferrer"/);
  }
});

test('structured data describes the free app without fabricated ratings or customers', () => {
  const html = renderPage();
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.offers.price, '0');
  assert.equal(schema.isAccessibleForFree, true);
  assert.equal(schema.aggregateRating, undefined);
  assert.equal(schema.review, undefined);
});

test('privacy and security copy distinguish app data from hosting logs and security limitations', () => {
  const privacy = renderPage({kind:'privacy'});
  assert.match(privacy, /IP addresses/);
  assert.match(privacy, /access\/security logs/);
  assert.match(privacy, /localStorage/);
  const security = renderPage({kind:'security'});
  assert.match(security, /not proof of absolute safety/);
  assert.match(security, /Browser extensions/);
  assert.doesNotMatch(security, /Nothing leaves your browser/);
});

test('guide does not equate a generated Git script with a complete or verified backup', () => {
  const guide = renderPage({kind:'guide'});
  assert.match(guide, /does not run or verify a backup/);
  assert.match(guide, /Git LFS objects/);
  assert.match(guide, /90 days/);
  assert.match(guide, /not unseen repositories/);
});

test('responsive and accessibility treatments are included', () => {
  assert.match(css, /max-width:760px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /focus-visible/);
  assert.match(css, /summary/);
});

test('source adapters fail closed on missing or duplicate anchors', () => {
  assert.equal(replaceOnce('a target b','target','next'),'a next b');
  assert.throws(()=>replaceOnce('none','target','next'));
  assert.throws(()=>replaceOnce('target target','target','next'));
  assert.throws(()=>replaceTranslations("{'a':'one'}", {a:['x','y']}));
});

test('translation replacement handles escaping and preserves unrelated keys', () => {
  const source = "{'a.b':'It\\'s old','keep':'same'}, {'a.b':'旧'}";
  const changed = replaceTranslations(source, {'a.b':['New "quoted" text','新的文字']});
  assert.ok(changed.includes('New \\"quoted\\" text'));
  assert.ok(changed.includes("'keep':'same'"));
  assert.ok(changed.includes('新的文字'));
  assert.deepEqual(Object.keys(extra.en).sort(),Object.keys(extra.zh).sort());
});

test('static rendering is deterministic', () => {
  assert.equal(renderPage({css,locale:'zh',kind:'guide'}),renderPage({css,locale:'zh',kind:'guide'}));
});
