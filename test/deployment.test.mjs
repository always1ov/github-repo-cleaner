import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderPage, normalizeSiteURL } from '../site/build.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const config = JSON.parse(read('wrangler.jsonc'));
const pkg = JSON.parse(read('package.json'));

test('Cloudflare deploys static assets only, with directory routes and real 404s', () => {
  assert.equal(config.assets.directory, './dist');
  assert.equal(config.assets.html_handling, 'force-trailing-slash');
  assert.equal(config.assets.not_found_handling, '404-page');
  assert.equal(config.workers_dev, true);
  for (const key of ['main','account_id','vars','kv_namespaces','d1_databases','r2_buckets']) assert.equal(config[key], undefined);
  assert.match(config.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
});

test('both README buttons target the actual website branch, not master or the default branch', () => {
  for (const path of ['README.md','README.zh-CN.md']) {
    const text = read(path);
    const match = text.match(/\]\((https:\/\/deploy\.workers\.cloudflare\.com\/\?url=[^)]+)\)/);
    assert.ok(match, `${path} is missing its deployment button`);
    assert.equal(new URL(match[1]).searchParams.get('url'), 'https://github.com/always1ov/github-repo-cleaner/tree/free-tool');
    assert.match(text, /npm run build/);
    assert.match(text, /npm run deploy/);
  }
});

test('deploy rebuilds first and the CI check never publishes', () => {
  assert.equal(pkg.scripts.predeploy, 'npm run build');
  assert.match(pkg.scripts.deploy, /wrangler@4 deploy$/);
  assert.match(pkg.scripts['deploy:check'], /--dry-run$/);
  assert.match(read('.github/workflows/ci.yml'), /npm run deploy:check/);
  assert.doesNotMatch(read('.github/workflows/pages.yml'), /\bpush:/);
});

test('first deploy does not require a domain or emit a wrong canonical URL', () => {
  assert.equal(normalizeSiteURL(), null);
  assert.equal(normalizeSiteURL('  '), null);
  for (const locale of ['en','zh']) {
    const html = renderPage({locale});
    assert.doesNotMatch(html, /rel="canonical"|property="og:url"|hreflang="x-default"/);
    assert.doesNotMatch(html, /always1ov\.github\.io/);
    const data = JSON.parse(html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data.url, undefined);
  }
});

test('setting the final SITE_URL generates destination-specific canonical URLs', () => {
  const html = renderPage({locale:'zh',kind:'guide',siteURL:'https://cleaner.example/tools/'});
  assert.match(html, /rel="canonical" href="https:\/\/cleaner\.example\/tools\/zh\/guide\/"/);
  assert.match(html, /hreflang="x-default" href="https:\/\/cleaner\.example\/tools\/guide\/"/);
});

test('build output, local deployment data and secrets stay out of git', () => {
  const ignored = read('.gitignore').split('\n');
  for (const entry of ['dist/','.wrangler/','node_modules/','.env','.env.*','.dev.vars','test-results/']) assert.ok(ignored.includes(entry));
});
