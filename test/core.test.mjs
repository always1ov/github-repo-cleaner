import test from 'node:test';
import assert from 'node:assert/strict';
import { core } from './load.mjs';

const {
  I18N, t, fmtSize, daysSince, fmtDate, parseNextLink, retryPlan, MAX_ATTEMPTS,
  pkgKey, keyOf, passesRepo, passesPkg, sortList, selectItems, repoStats,
  scopeReport, lacksDeleteScope, csvCell, toCSV, repoCsvRows, backupScript,
  ticketBody, demoData
} = core;

const DAY = 86400000;
const NOW = Date.parse('2026-09-14T00:00:00Z');
const ago = days => new Date(NOW - days * DAY).toISOString();

const repo = (over = {}) => ({
  full_name: (over.owner_login || 'me') + '/' + (over.name || 'thing'),
  name: over.name || 'thing',
  owner: { login: over.owner_login || 'me' },
  description: null, private: false, fork: false, archived: false, is_template: false,
  size: 100, stargazers_count: 0, forks_count: 0, language: 'Go',
  pushed_at: ago(10), created_at: ago(400),
  html_url: 'https://github.com/me/thing', clone_url: 'https://github.com/me/thing.git',
  permissions: { admin: true },
  ...over
});

// English singular variants are keyed "<base>.one"; Chinese has no plural inflection
// and deliberately defines none, so tn() falls back to the base key there.
const isSingular = k => k.endsWith('.one');

test('i18n: both languages define exactly the same keys', () => {
  const en = Object.keys(I18N.en).sort();
  const zh = Object.keys(I18N.zh).sort();
  assert.deepEqual(zh.filter(k => !I18N.en[k]), [], 'zh has keys missing from en');
  assert.deepEqual(en.filter(k => !I18N.zh[k] && !isSingular(k)), [], 'en has keys missing from zh');
  assert.deepEqual(en.filter(isSingular).filter(k => !I18N.en[k.slice(0, -4)]), [],
    'every singular form needs its plural base');
});

test('tn picks the singular only for a count of one, and only where one exists', () => {
  assert.equal(core.tn('en', 'sel.repos', 1), '1 repository selected');
  assert.equal(core.tn('en', 'sel.repos', 2), '2 repositories selected');
  assert.equal(core.tn('en', 'sel.repos', 0), '0 repositories selected');
  assert.equal(core.tn('zh', 'sel.repos', 1), '已选 1 个仓库', 'Chinese has no singular form');
  assert.equal(core.tn('en', 'stats.archived', 1), 'archived', 'no singular defined, base is used');
  assert.equal(core.tn('en', 'task.delete.title', 1), 'Delete 1 repository');
  assert.equal(core.tn('en', 'task.skipped', 1, { why: 'archived' }), '1 more will be skipped (archived).');
});

test('i18n: no empty strings', () => {
  for (const lang of ['en', 'zh'])
    for (const [k, v] of Object.entries(I18N[lang]))
      assert.ok(typeof v === 'string' && v.length, `${lang}.${k} is empty`);
});

test('i18n: placeholders match across languages', () => {
  const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const k of Object.keys(I18N.en).filter(k => !isSingular(k)))
    assert.deepEqual(vars(I18N.zh[k]), vars(I18N.en[k]), `placeholders differ for ${k}`);
});

test('t: interpolates, falls back to English, and never throws', () => {
  assert.equal(t('en', 'sel.repos', { n: 3 }), '3 repositories selected');
  assert.equal(t('zh', 'sel.repos', { n: 3 }), '已选 3 个仓库');
  assert.equal(t('fr', 'act.done'), I18N.en['act.done'], 'unknown language falls back to en');
  assert.equal(t('en', 'no.such.key'), 'no.such.key');
  assert.equal(t('en', 'sel.repos', {}), '{n} repositories selected', 'missing var is left visible');
});

test('fmtSize scales KB to MB and GB', () => {
  assert.equal(fmtSize(0, 'en'), '0 KB');
  assert.equal(fmtSize(512, 'en'), '512 KB');
  assert.equal(fmtSize(2048, 'en'), '2.0 MB');
  assert.equal(fmtSize(1024 * 20, 'en'), '20 MB');
  assert.equal(fmtSize(1024 * 1024 * 3, 'en'), '3.00 GB');
});

test('daysSince and fmtDate handle missing and malformed dates', () => {
  assert.equal(daysSince(null, NOW), Infinity);
  assert.equal(daysSince('not-a-date', NOW), Infinity);
  assert.equal(daysSince(ago(30), NOW), 30);
  assert.equal(fmtDate(null, 'en', NOW), '—');
  assert.equal(fmtDate('garbage', 'en', NOW), '—');
  assert.match(fmtDate(ago(0), 'en', NOW), /today$/);
  assert.match(fmtDate(ago(45), 'en', NOW), /1mo ago$/);
  assert.match(fmtDate(ago(800), 'zh', NOW), /2 年前$/);
  assert.match(fmtDate(ago(5), 'en', NOW), /^2026-09-09/);
});

test('parseNextLink reads the GitHub Link header', () => {
  const h = '<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=9>; rel="last"';
  assert.equal(parseNextLink(h), 'https://api.github.com/user/repos?page=2');
  assert.equal(parseNextLink('<https://api.github.com/x?page=1>; rel="prev"'), null);
  assert.equal(parseNextLink(''), null);
  assert.equal(parseNextLink(null), null);
});

test('retryPlan: network failures back off and are retried', () => {
  const p = retryPlan({ status: 0, attempt: 0, headers: {}, nowMs: NOW });
  assert.equal(p.retry, true);
  assert.equal(p.reason, 'network');
  assert.ok(p.waitMs > 0);
  const later = retryPlan({ status: 0, attempt: 2, headers: {}, nowMs: NOW });
  assert.ok(later.waitMs > p.waitMs, 'backoff grows with attempts');
});

test('retryPlan: primary rate limit waits for the reset, or gives up when it is far off', () => {
  const soon = retryPlan({
    status: 403, message: 'API rate limit exceeded', attempt: 0, nowMs: NOW,
    headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String((NOW + 20000) / 1000) }
  });
  assert.equal(soon.retry, true);
  assert.equal(soon.reason, 'primary');
  assert.ok(soon.waitMs > 20000 && soon.waitMs < 25000);

  const far = retryPlan({
    status: 403, message: 'API rate limit exceeded', attempt: 0, nowMs: NOW,
    headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String((NOW + 1800000) / 1000) }
  });
  assert.equal(far.retry, false, 'never block the UI for half an hour');
  assert.equal(far.reason, 'primary');
});

test('retryPlan: secondary rate limits honour Retry-After', () => {
  const p = retryPlan({
    status: 403, message: 'You have exceeded a secondary rate limit', attempt: 0, nowMs: NOW,
    headers: { 'retry-after': '12' }
  });
  assert.equal(p.retry, true);
  assert.equal(p.reason, 'secondary');
  assert.equal(p.waitMs, 12000);

  const noHeader = retryPlan({ status: 429, message: 'slow down', attempt: 0, headers: {}, nowMs: NOW });
  assert.equal(noHeader.retry, true);
  assert.ok(noHeader.waitMs <= 60000, 'waits are capped');
});

test('retryPlan: 5xx retried, 4xx not, and attempts are bounded', () => {
  assert.equal(retryPlan({ status: 502, attempt: 0, headers: {}, nowMs: NOW }).retry, true);
  assert.equal(retryPlan({ status: 404, attempt: 0, headers: {}, nowMs: NOW }).retry, false);
  assert.equal(retryPlan({ status: 451, attempt: 0, headers: {}, nowMs: NOW }).retry, false);
  assert.equal(retryPlan({ status: 401, attempt: 0, headers: {}, nowMs: NOW }).retry, false);
  assert.equal(retryPlan({ status: 0, attempt: MAX_ATTEMPTS, headers: {}, nowMs: NOW }).retry, false);
});

test('identity keys are stable and namespaced by type', () => {
  const p = { package_type: 'container', owner: { login: 'me' }, name: 'app' };
  assert.equal(pkgKey(p), 'container:me/app');
  assert.equal(keyOf('packages', p), 'container:me/app');
  assert.equal(keyOf('repos', repo()), 'me/thing');
  assert.notEqual(pkgKey({ ...p, package_type: 'npm' }), pkgKey(p), 'same name, different type must not collide');
});

test('passesRepo: text search covers name and description', () => {
  const r = repo({ name: 'scraper', description: 'Pulls the weather' });
  assert.equal(passesRepo(r, { q: 'scrap' }, NOW), true);
  assert.equal(passesRepo(r, { q: 'WEATHER' }, NOW), true);
  assert.equal(passesRepo(r, { q: 'nonsense' }, NOW), false);
  assert.equal(passesRepo(repo({ description: null }), { q: 'x' }, NOW), false);
});

test('passesRepo: kind filters', () => {
  const cases = [
    ['source', repo(), true], ['source', repo({ fork: true }), false], ['source', repo({ archived: true }), false],
    ['fork', repo({ fork: true }), true], ['fork', repo(), false],
    ['archived', repo({ archived: true }), true], ['archived', repo(), false],
    ['template', repo({ is_template: true }), true], ['template', repo(), false],
    ['empty', repo({ size: 0 }), true], ['empty', repo({ size: 1 }), false],
    ['nostar', repo(), true], ['nostar', repo({ stargazers_count: 1 }), false]
  ];
  for (const [kind, r, want] of cases)
    assert.equal(passesRepo(r, { kind }, NOW), want, `${kind} on ${JSON.stringify({ f: r.fork, a: r.archived, s: r.size })}`);
});

test('passesRepo: undeletable filter consults the caller predicate', () => {
  const f = { kind: 'stuck', isStuck: n => n === 'me/blocked' };
  assert.equal(passesRepo(repo({ name: 'blocked' }), f, NOW), true);
  assert.equal(passesRepo(repo({ name: 'fine' }), f, NOW), false);
  assert.equal(passesRepo(repo(), { kind: 'stuck' }, NOW), false, 'no predicate means nothing is stuck');
});

test('passesRepo: age filters', () => {
  assert.equal(passesRepo(repo({ pushed_at: ago(400) }), { age: '1' }, NOW), true);
  assert.equal(passesRepo(repo({ pushed_at: ago(100) }), { age: '1' }, NOW), false);
  assert.equal(passesRepo(repo({ pushed_at: ago(1200) }), { age: '3' }, NOW), true);
  assert.equal(passesRepo(repo({ pushed_at: ago(100) }), { age: 'fresh' }, NOW), true);
  assert.equal(passesRepo(repo({ pushed_at: ago(900) }), { age: 'fresh' }, NOW), false);
  assert.equal(passesRepo(repo({ pushed_at: null }), { age: 'fresh' }, NOW), false, 'never-pushed is not fresh');
  assert.equal(passesRepo(repo({ pushed_at: null }), { age: '3' }, NOW), true, 'never-pushed counts as stale');
});

test('passesRepo: owner and visibility', () => {
  assert.equal(passesRepo(repo({ owner_login: 'acme' }), { owner: 'acme' }, NOW), true);
  assert.equal(passesRepo(repo({ owner_login: 'acme' }), { owner: 'me' }, NOW), false);
  assert.equal(passesRepo(repo(), { owner: 'all' }, NOW), true);
  assert.equal(passesRepo(repo({ private: true }), { vis: 'public' }, NOW), false);
  assert.equal(passesRepo(repo({ private: true }), { vis: 'private' }, NOW), true);
});

test('passesPkg filters by name, owner, visibility and type', () => {
  const p = { name: 'api-service', owner: { login: 'me' }, visibility: 'private', package_type: 'container' };
  assert.equal(passesPkg(p, { q: 'API' }), true);
  assert.equal(passesPkg(p, { q: 'nope' }), false);
  assert.equal(passesPkg(p, { vis: 'public' }), false);
  assert.equal(passesPkg(p, { kind: 'npm' }), false);
  assert.equal(passesPkg(p, { kind: 'container', vis: 'private', owner: 'me' }), true);
});

test('sortList orders text, numbers, dates and nulls predictably', () => {
  const list = [repo({ name: 'b', size: 5 }), repo({ name: 'a', size: 50 }), repo({ name: 'c', size: 0 })];
  assert.deepEqual(sortList(list, 'name', 1).map(r => r.name), ['a', 'b', 'c']);
  assert.deepEqual(sortList(list, 'name', -1).map(r => r.name), ['c', 'b', 'a']);
  assert.deepEqual(sortList(list, 'size', -1).map(r => r.size), [50, 5, 0]);
  const dated = [repo({ name: 'old', pushed_at: ago(900) }), repo({ name: 'new', pushed_at: ago(1) })];
  assert.deepEqual(sortList(dated, 'pushed_at', -1).map(r => r.name), ['new', 'old']);
  const nulls = [repo({ name: 'x', language: null }), repo({ name: 'y', language: 'Rust' })];
  assert.doesNotThrow(() => sortList(nulls, 'language', 1));
  assert.equal(sortList(list, 'name', 1) !== list, true, 'sortList does not mutate its input');
});

test('selectItems combines filtering and sorting for each view', () => {
  const repos = [repo({ name: 'a', pushed_at: ago(2) }), repo({ name: 'b', pushed_at: ago(900) }), repo({ name: 'c', fork: true })];
  const out = selectItems('repos', repos, [], { kind: 'source', age: '1' }, { key: 'name', dir: 1 }, NOW);
  assert.deepEqual(out.map(r => r.name), ['b']);
  const pkgs = [{ name: 'z', owner: { login: 'me' }, package_type: 'npm', visibility: 'public', version_count: 2 }];
  assert.equal(selectItems('packages', repos, pkgs, {}, { key: 'name', dir: 1 }, NOW).length, 1);
});

test('repoStats counts what the dashboard claims', () => {
  const s = repoStats([
    repo({ size: 100, private: true }),
    repo({ size: 0, fork: true, pushed_at: ago(900) }),
    repo({ size: 24, archived: true, pushed_at: ago(400) })
  ], NOW);
  assert.deepEqual(s, { count: 3, sizeKb: 124, priv: 1, forks: 1, archived: 1, stale: 2, empty: 1 });
  assert.deepEqual(repoStats([], NOW).count, 0);
});

test('scopeReport reflects classic token scopes', () => {
  const full = scopeReport('classic', 'repo, delete_repo, read:org, read:packages, delete:packages');
  assert.equal(full.every(c => c.ok === true), true);
  const thin = scopeReport('classic', 'repo');
  assert.equal(thin.find(c => c.id === 'delete').ok, false);
  assert.equal(thin.find(c => c.id === 'list').ok, true);
  const unknown = scopeReport('classic', '');
  assert.equal(unknown.every(c => c.ok === 'maybe'), true);
});

test('scopeReport marks packages impossible for fine-grained tokens', () => {
  const fine = scopeReport('fine', null);
  assert.equal(fine.find(c => c.id === 'pkgRead').ok, false);
  assert.equal(fine.find(c => c.id === 'pkgDelete').ok, false);
  assert.equal(fine.find(c => c.id === 'delete').ok, 'maybe');
});

test('lacksDeleteScope only fires when the scopes are actually known', () => {
  assert.equal(lacksDeleteScope('classic', 'repo, read:org'), true);
  assert.equal(lacksDeleteScope('classic', 'repo, delete_repo'), false);
  assert.equal(lacksDeleteScope('classic', ''), false, 'unknown scopes must not raise a false alarm');
  assert.equal(lacksDeleteScope('classic', null), false);
  assert.equal(lacksDeleteScope('fine', 'repo'), false);
  assert.equal(lacksDeleteScope('classic', 'repo, delete_repository'), true, 'prefix must not count as a match');
});

test('CSV quotes separators, quotes and newlines', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('two\nlines'), '"two\nlines"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(0), '0');
  assert.equal(toCSV(['a', 'b'], [[1, 2], [3, 4]]), 'a,b\r\n1,2\r\n3,4');
});

test('repoCsvRows lines up with its header', () => {
  const rows = repoCsvRows([repo({ description: 'has, a comma' })]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].length, core.REPO_CSV_HEAD.length);
  assert.ok(toCSV(core.REPO_CSV_HEAD, rows).includes('"has, a comma"'));
});

test('backupScript emits one mirror clone per repo and quotes hostile names', () => {
  const script = backupScript([repo({ name: 'a' }), repo({ name: 'b' })], 'me');
  assert.equal((script.match(/^clone /gm) || []).length, 2);
  assert.ok(script.startsWith('#!/usr/bin/env bash'));
  assert.ok(script.includes('git clone --mirror'));

  const nasty = backupScript([repo({ name: "x'; rm -rf ~ #" })], 'me');
  assert.ok(!/rm -rf ~ #'/.test(nasty.split('\n').find(l => l.startsWith('clone ')).replace(/'\\''/g, '')),
    'single quotes must be escaped, not closed');
  assert.ok(nasty.includes(`'\\''`), 'quote escaping present');
});

test('ticketBody names the account and every repository', () => {
  const items = [repo({ name: 'one' }), repo({ name: 'two' })];
  const body = ticketBody('octocat', items, r => 'blocked: ' + r.name);
  assert.ok(body.includes('GitHub username: octocat'));
  assert.ok(body.includes('- me/one  (blocked: one)'));
  assert.ok(body.includes('- me/two  (blocked: two)'));
  assert.ok(body.includes('not filing a counter notice'));
});

test('demoData is deterministic and shaped like the real API', () => {
  const a = demoData(NOW), b = demoData(NOW);
  assert.deepEqual(a.repos.map(r => r.full_name), b.repos.map(r => r.full_name));
  assert.ok(a.repos.length > 20);
  assert.equal(new Set(a.repos.map(r => r.full_name)).size, a.repos.length, 'names are unique');
  for (const r of a.repos) {
    assert.ok(r.owner && r.owner.login && r.full_name.startsWith(r.owner.login + '/'));
    assert.equal(typeof r.permissions.admin, 'boolean');
    assert.ok(!Number.isNaN(Date.parse(r.pushed_at)));
    assert.ok(r.clone_url.endsWith('.git'));
  }
  for (const p of a.pkgs) {
    assert.ok(p.version_count >= 1);
    assert.equal(pkgKey(p), `${p.package_type}:${p.owner.login}/${p.name}`);
  }
  assert.ok(repoStats(a.repos, NOW).stale > 0, 'demo shows something worth cleaning');
});
