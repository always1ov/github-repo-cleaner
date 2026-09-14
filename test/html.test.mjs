import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { HTML, SCRIPT, core } from './load.mjs';

const { I18N } = core;
const MARKUP = HTML.slice(0, HTML.indexOf('<script>'));
const APP = SCRIPT.slice(SCRIPT.indexOf('/* </core> */'));
const CSP = (HTML.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];

test('the page ships valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(SCRIPT));
});

test('a Content-Security-Policy is present and denies by default', () => {
  assert.ok(CSP, 'no CSP meta tag');
  assert.match(CSP, /default-src 'none'/);
  assert.match(CSP, /base-uri 'none'/);
  assert.match(CSP, /form-action 'none'/);
});

test('CSP allows exactly one network destination: api.github.com', () => {
  const connect = (CSP.match(/connect-src ([^;]+)/) || [])[1];
  assert.equal(connect.trim(), 'https://api.github.com',
    'the whole trust story is that a token cannot be posted anywhere else');
  const img = (CSP.match(/img-src ([^;]+)/) || [])[1];
  assert.equal(img.trim(), 'data:', 'remote images would be a side channel');
});

test('nothing is loaded from a third party', () => {
  assert.doesNotMatch(HTML, /<script[^>]+src=/i, 'no external script');
  assert.doesNotMatch(HTML, /<link[^>]+stylesheet/i, 'no external stylesheet');
  assert.doesNotMatch(HTML, /@import/i, 'no CSS import');
  assert.doesNotMatch(HTML, /url\(\s*['"]?https?:/i, 'no remote CSS asset');
  assert.doesNotMatch(HTML, /<iframe/i, 'no frames');
  assert.doesNotMatch(MARKUP, /<img[^>]+src=/i, 'no remote avatars');
});

test('the app evaluates no dynamic code', () => {
  assert.doesNotMatch(APP, /\beval\s*\(/);
  assert.doesNotMatch(APP, /new\s+Function\s*\(/);
});

test('the token never reaches persistent storage', () => {
  const stores = [...APP.matchAll(/\b(localStorage|sessionStorage|indexedDB)\b/g)].map(m => m[1]);
  assert.deepEqual(stores, ['localStorage', 'localStorage'],
    'localStorage may only be touched by prefGet/prefSet');
  assert.doesNotMatch(APP, /document\.cookie/);
  for (const call of APP.matchAll(/localStorage\.\w+\('([^']*)'/g))
    assert.equal(call[1], 'grc.', 'preference keys are namespaced');
  const prefCalls = [...APP.matchAll(/prefSet\('(\w+)'/g)].map(m => m[1]);
  assert.deepEqual([...new Set(prefCalls)].sort(), ['lang', 'pageSize', 'theme'],
    'only display preferences are saved');
});

test('outbound requests can only go to the GitHub API', () => {
  const fetches = [...APP.matchAll(/\bfetch\s*\(/g)];
  assert.equal(fetches.length, 1, 'one fetch call, one place to audit');
  assert.match(APP, /const API = 'https:\/\/api\.github\.com'/);
});

test('every external link is safe against tabnabbing', () => {
  for (const a of HTML.matchAll(/<a\s[^>]*href="https?:[^"]*"[^>]*>/g))
    assert.match(a[0], /rel="noopener noreferrer"/, `unsafe link: ${a[0]}`);
  for (const open of APP.matchAll(/window\.open\([^)]*\)/g))
    assert.match(open[0], /noopener/, `unsafe window.open: ${open[0]}`);
});

test('the document declares the basics', () => {
  assert.match(HTML, /^<!DOCTYPE html>/);
  assert.match(HTML, /<html lang="[a-z-]+">/);
  assert.match(HTML, /name="viewport"/);
  assert.match(HTML, /<title>[^<]+<\/title>/);
  assert.match(HTML, /name="description"/);
});

/* ---- i18n coverage ---- */
const markupKeys = [...MARKUP.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
const literalKeys = [...APP.matchAll(/\bTN?\('([a-zA-Z0-9._]+)'\s*[,)]/g)].map(m => m[1]);
// A key counts as used if it appears as a bare string literal anywhere in the app region
// (it may sit in a ternary or be handed around in a variable).
const mentioned = new Set([...APP.matchAll(/'([a-zA-Z0-9._]+)'/g)].map(m => m[1]));
// Keys reached through computed expressions, e.g. T('task.' + kind + '.title').
const COMPUTED = ['task.', 'f.kind.', 'f.age.', 'f.vis.', 'trust.', 'perm.cap.', 'theme.'];

test('every key the UI asks for is defined in both languages', () => {
  const asked = [...new Set([...markupKeys, ...literalKeys])];
  assert.ok(asked.length > 60, 'sanity: the scan found the call sites');
  for (const k of asked) {
    assert.ok(I18N.en[k], `missing en translation: ${k}`);
    assert.ok(I18N.zh[k], `missing zh translation: ${k}`);
  }
});

test('every task button has a full set of strings', () => {
  const kinds = [...MARKUP.matchAll(/data-task="(\w+)"/g)].map(m => m[1]);
  assert.ok(kinds.length >= 8, `expected every action to be wired up, found ${kinds.length}`);
  for (const k of kinds)
    for (const part of ['btn', 'title', 'verb', 'note'])
      for (const lang of ['en', 'zh'])
        assert.ok(I18N[lang][`task.${k}.${part}`], `missing ${lang} task.${k}.${part}`);
});

test('every declared capability has a label', () => {
  for (const cap of core.scopeReport('classic', 'repo'))
    for (const lang of ['en', 'zh'])
      assert.ok(I18N[lang][`perm.cap.${cap.id}`], `missing ${lang} perm.cap.${cap.id}`);
});

test('no dictionary entry is dead weight', () => {
  const used = new Set([...markupKeys, ...literalKeys, ...mentioned]);
  const dead = Object.keys(I18N.en)
    .filter(k => !k.endsWith('.one') || !I18N.en[k.slice(0, -4)])  // singulars ride on their base key
    .filter(k => !used.has(k) && !COMPUTED.some(p => k.startsWith(p)));
  assert.deepEqual(dead, [], 'unused translation keys');
});
