import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import vm from 'node:vm';
import { OUTPUT, hash, routeFor } from '../site/build.mjs';
const app = readFileSync(join(OUTPUT,'app/index.html'),'utf8');
const script = app.match(/<script>([\s\S]*?)<\/script>/)[1];

test('published app has valid JavaScript and a matching script CSP hash', () => {
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.ok(app.includes(`script-src 'sha256-${hash(script)}'`));
  assert.doesNotMatch(app, /script-src 'unsafe-inline'/);
  assert.equal((app.match(/<script>/g)||[]).length,1);
});

test('published copy removes misleading privacy, recovery, permission and pagination claims', () => {
  assert.doesNotMatch(app, /Nothing leaves your browser/);
  assert.doesNotMatch(app, /GitHub offers no undo/);
  assert.doesNotMatch(app, /Narrow the list with filters if something is missing/);
  assert.doesNotMatch(app, /covers delete, transfer and visibility/);
  assert.match(app, /INCOMPLETE LIST/);
  assert.match(app, /not been executed or verified/);
  assert.match(app, /noindex, nofollow/);
});

test('only the GitHub API is permitted and guarded in the published workspace', () => {
  assert.match(app, /connect-src https:\/\/api\.github\.com;/);
  assert.match(script, /destination\.origin !== API/);
  assert.match(script, /destination\.username \|\| destination\.password/);
  assert.match(script, /if \(!Array\.isArray\(r\.data\)\) throw new Error/);
  assert.match(script, /failed\+\+/);
  assert.equal((script.match(/\bfetch\s*\(/g)||[]).length,1);
});

test('all generated navigation targets exist without relying on SPA redirects', () => {
  for (const locale of ['en','zh']) for (const kind of ['home','guide','security','privacy','terms']) {
    const route = routeFor(locale,kind);
    const html = readFileSync(join(OUTPUT,route),'utf8');
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      const href = match[1];
      if (/^(https?:|#)/.test(href)) continue;
      const target = posix.normalize(posix.join(posix.dirname(route), href.split('#')[0]));
      assert.ok(existsSync(join(OUTPUT,target)), `${route} -> ${href} is broken`);
    }
  }
});

test('sitemap lists content pages, not the token workspace', () => {
  if (process.env.SITE_URL) {
    const sitemap = readFileSync(join(OUTPUT,'sitemap.xml'),'utf8');
    assert.equal((sitemap.match(/<loc>/g)||[]).length,10);
    assert.doesNotMatch(sitemap, /\/app\//);
  } else {
    assert.equal(existsSync(join(OUTPUT,'sitemap.xml')),false);
    assert.doesNotMatch(readFileSync(join(OUTPUT,'robots.txt'),'utf8'), /Sitemap:/);
  }
  assert.ok(existsSync(join(OUTPUT,'robots.txt')));
  assert.ok(existsSync(join(OUTPUT,'404.html')));
});

test('marketing JSON-LD hashes match the allowed script bytes', () => {
  for (const locale of ['en','zh']) {
    const html = readFileSync(join(OUTPUT,routeFor(locale)),'utf8');
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    assert.ok(html.includes(`script-src 'sha256-${hash(json)}'`));
  }
});
