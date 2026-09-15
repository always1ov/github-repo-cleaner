import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix, resolve } from 'node:path';
import { locales, REPO, external } from './content.mjs';
import { enhanceApp, replaceOnce } from './app.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT = join(ROOT, 'dist');
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizeSiteURL(input) {
  if (input == null || input.trim() === '') return null;
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('SITE_URL must be an HTTPS public base URL without credentials, query, or fragment.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}
export function routeFor(locale, kind = 'home') { return (locale === 'zh' ? 'zh/' : '') + (kind === 'home' ? '' : kind + '/') + 'index.html'; }
export function relativeLink(from, target) { return posix.relative(posix.dirname(from), target) || 'index.html'; }
export const hash = text => createHash('sha256').update(text).digest('base64');
const logo = '<span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h4"/></svg></span>Repo Cleaner';
export function renderPage({ locale = 'en', kind = 'home', css = '', siteURL = normalizeSiteURL() } = {}) {
  if (!locales[locale] || (kind !== 'home' && !locales[locale].documents[kind])) throw new Error('Unknown page or locale');
  const d = locales[locale];
  const route = routeFor(locale, kind);
  const link = to => relativeLink(route, to);
  const app = link('app/index.html') + (locale === 'zh' ? '#zh' : '#en');
  const demo = link('app/index.html') + (locale === 'zh' ? '#demo-zh' : '#demo');
  const otherLocale = locale === 'en' ? 'zh' : 'en';
  const home = link(routeFor(locale));
  const buttons = `<div class="cta"><a class="button" href="${demo}">${d.demo}<span aria-hidden="true">→</span></a><a class="button secondary" href="${app}">${d.open}</a></div>`;
  const brand = `<a class="brand" href="${home}" aria-label="Repo Cleaner home">${logo}</a>`;
  const header = `<a class="skip" href="#main">${d.skip}</a><header class="container"><nav class="nav" aria-label="Main navigation">${brand}<div class="nav-links"><a class="wide" href="${link(routeFor(locale,'guide'))}">${d.navGuide}</a><a class="wide" href="${link(routeFor(locale,'security'))}">${d.navSecurity}</a><a class="language" href="${link(routeFor(otherLocale,kind))}" hreflang="${locales[otherLocale].code}" lang="${locales[otherLocale].code}">${d.other}</a><a class="nav-cta" href="${app}">${d.open}<span aria-hidden="true"> ↗</span></a></div></nav></header>`;
  const footer = `<footer class="container footer"><div>${brand}<p>${d.footerNote}</p></div><nav class="footer-links" aria-label="Footer"><a href="${link(routeFor(locale,'guide'))}">${d.guide}</a><a href="${link(routeFor(locale,'security'))}">${d.navSecurity}</a><a href="${link(routeFor(locale,'privacy'))}">${d.privacy}</a><a href="${link(routeFor(locale,'terms'))}">${d.terms}</a>${external(REPO + '/tree/free-tool', d.source + ' ↗')}</nav></footer>`;
  const rows = [['weekend-api','Fork · Last pushed 3 years ago','Fork',true],['react-playground','Fork · Last pushed 2 years ago','Fork',true],['personal-site','Last pushed 4 days ago','Keep',false],['tiny-cli','Last pushed 2 weeks ago','Keep',false]];
  const preview = `<div><div class="preview" role="img" aria-label="${locale === 'zh' ? '使用虚构数据展示仓库筛选和归档预览' : 'Illustrative repository selection preview using sample data'}"><div class="preview-top"><span>Repo Cleaner</span><span class="sample">${d.sample}</span></div><div class="preview-inner"><div class="preview-label">octo-demo / workspace</div><div class="preview-title">${d.workspace}</div><div class="preview-metrics">${[46,12,8].map((n,i)=>`<div><strong>${n}</strong><span>${d.previewMetrics[i]}</span></div>`).join('')}</div><div class="preview-filter"><span class="chip active">${d.previewAll}</span><span class="chip">${d.previewFilter}</span><span class="chip">${d.previewEmpty}</span></div>${rows.map(([name,desc,tag,selected])=>`<div class="preview-row"><span class="check${selected?' checked':''}">${selected?'✓':''}</span><span class="repo-name">${name}<small>${desc}</small></span><span class="row-tag">${tag}</span></div>`).join('')}</div><div class="preview-bottom"><span>${d.previewSelected}</span><span class="mini-button">${d.previewArchive} →</span></div></div><p class="preview-footnote">${d.previewCaption}</p></div>`;
  let body;
  if (kind === 'home') {
    body = `<main id="main" class="container"><section class="hero"><div><div class="eyebrow"><span class="dot"></span>${d.badge}</div><h1>${d.title}</h1><p class="intro">${d.intro}</p>${buttons}<p class="fineprint">${d.fine}</p></div>${preview}</section><div class="proof-line">${d.proof.map(text=>`<span><i class="tick" aria-hidden="true">✓</i>${text}</span>`).join('')}</div>
<section class="section" id="features"><div class="section-heading"><div><div class="kicker">${d.featuresKicker}</div><h2>${d.featuresTitle}</h2></div><p>${d.featuresIntro}</p></div><div class="features">${d.features.map(([title,text],i)=>`<article class="feature"><div class="feature-num">0${i+1} /</div><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></section>
<section class="section workflow" id="how-it-works"><div class="section-heading"><div><div class="kicker">${d.stepsKicker}</div><h2>${d.stepsTitle}</h2></div></div><div class="steps">${d.steps.map(([title,text],i)=>`<div class="step"><span class="step-number">${i+1}</span><div><h3>${title}</h3><p>${text}</p></div></div>`).join('')}</div></section>
<section class="security-card"><div><div class="kicker">${d.securityKicker}</div><h2>${d.securityTitle}</h2><p>${d.securityText}</p><a href="${link(routeFor(locale,'security'))}">${d.securityLink}</a></div><div class="data-flow"><div class="flow-line"><span class="flow-node"><strong>${d.browser}</strong><small>${d.browserNote}</small></span><span class="flow-arrow" aria-hidden="true">↔</span><span class="flow-node"><strong>GitHub API</strong><small>${d.githubNote}</small></span></div><p class="flow-note">${d.flowNote}</p></div></section>
<section class="section faq"><div class="section-heading"><div class="kicker">FAQ</div><h2>${d.faqTitle}</h2></div>${d.faq.map(([question,answer])=>`<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}</section><section class="bottom-cta"><h2>${d.bottomTitle}</h2><p>${d.bottomText}</p>${buttons}</section></main>`;
  } else {
    const doc = d.documents[kind];
    body = `<main id="main" class="container"><article class="document"><div class="kicker">${d.free}</div><h1>${doc.title}</h1><p class="doc-intro">${doc.intro}</p>${doc.body}<p class="updated">${locale === 'zh' ? '说明更新于' : 'Last reviewed'} September 16, 2026.</p><div class="cta"><a class="button" href="${demo}">${d.demo} →</a><a class="button secondary" href="${app}">${d.open}</a></div></article></main>`;
  }
  const title = kind === 'home' ? (locale === 'zh' ? 'Repo Cleaner — 免费 GitHub 仓库整理工具' : 'Repo Cleaner — Free GitHub Repository Cleanup') : d.documents[kind].title + ' — Repo Cleaner';
  const description = kind === 'home' ? d.description : d.documents[kind].intro;
  const canonical = siteURL ? new URL(route.replace(/index\.html$/, ''), siteURL).href : null;
  const seo = canonical ? [
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    ...['en','zh'].map(l => `<link rel="alternate" hreflang="${locales[l].code}" href="${escapeHtml(new URL(routeFor(l,kind).replace(/index\.html$/, ''),siteURL).href)}">`),
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(new URL(routeFor('en',kind).replace(/index\.html$/, ''),siteURL).href)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`
  ].join('\n') : '';
  const schema = kind === 'home' ? JSON.stringify({'@context':'https://schema.org','@type':'SoftwareApplication',name:'Repo Cleaner',applicationCategory:'DeveloperApplication',operatingSystem:'Web browser',isAccessibleForFree:true,inLanguage:d.code,...(canonical ? {url:canonical} : {}),description:d.description,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}}).replace(/</g, '\\u003c') : '';
  const csp = `default-src 'none'; connect-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src ${schema ? "'sha256-"+hash(schema)+"'" : "'none'"}; base-uri 'none'; form-action 'none'`;
  return `<!DOCTYPE html>\n<html lang="${d.code}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta http-equiv="Content-Security-Policy" content="${csp}">\n<meta name="referrer" content="no-referrer">\n<title>${escapeHtml(title)}</title>\n<meta name="description" content="${escapeHtml(description)}">\n${seo}\n<meta property="og:type" content="website">\n<meta property="og:title" content="${escapeHtml(title)}">\n<meta property="og:description" content="${escapeHtml(description)}">\n<meta name="twitter:card" content="summary">\n<meta name="theme-color" content="#285e49">\n<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%23285e49'/%3E%3Cpath d='M10 9h12M10 16h12M10 23h7' stroke='white' stroke-width='2'/%3E%3C/svg%3E">\n<style>${css}</style>\n${schema?`<script type="application/ld+json">${schema}</script>`:''}\n</head>\n<body>${header}${body}${footer}</body>\n</html>\n`;
}
export function build({ siteURL = normalizeSiteURL(process.env.SITE_URL), output = OUTPUT } = {}) {
  siteURL = normalizeSiteURL(siteURL);
  const source = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'site/theme.css'), 'utf8');
  const appCss = readFileSync(join(ROOT, 'site/app.css'), 'utf8');
  let app = enhanceApp(source, appCss);
  app = replaceOnce(app, `href="${REPO}"`, `href="${REPO}/tree/free-tool"`);
  const scripts = [...app.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw new Error('The published app must have exactly one inline script.');
  app = replaceOnce(app, "script-src 'unsafe-inline'", "script-src 'sha256-" + hash(scripts[0][1]) + "'");
  // Only write our generated directory; never accept a caller-controlled destination.
  if (resolve(output) !== OUTPUT) throw new Error('Build output must be the project dist directory.');
  mkdirSync(output, { recursive: true });
  const write = (path, text) => { const dest = join(output, path); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, text); };
  const routes = [];
  for (const locale of ['en','zh']) for (const kind of ['home','guide','security','privacy','terms']) {
    const route = routeFor(locale,kind);
    write(route, renderPage({locale,kind,css,siteURL}));
    routes.push(route);
  }
  write('app/index.html', app);
  if (siteURL) {
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + routes.map(r => `  <url><loc>${escapeHtml(new URL(r.replace(/index\.html$/, ''),siteURL).href)}</loc></url>`).join('\n') + '\n</urlset>\n');
  } else {
    // Remove only an obsolete generated sitemap if the public URL was unset.
    try { unlinkSync(join(output, 'sitemap.xml')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  write('robots.txt', 'User-agent: *\nAllow: /\n' + (siteURL ? 'Sitemap: ' + new URL('sitemap.xml',siteURL).href + '\n' : ''));
  write('.nojekyll', '');
  write('_headers', "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Content-Security-Policy: frame-ancestors 'none'\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n\n/app/*\n  Cache-Control: no-store\n");
  write('404.html', `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>Page not found — Repo Cleaner</title><style>${css}</style></head><body><main class="container document"><p class="kicker">404 / Repo Cleaner</p><h1>This page is not here.</h1><p>Your repositories have not been changed.</p><a class="button" href="${escapeHtml(siteURL || '/')}">Back to Repo Cleaner →</a></main></body></html>`);
  return { routes, appBytes: Buffer.byteLength(app), siteURL };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = build();
  console.log(`Built ${result.routes.length} static pages + standalone app (${result.appBytes} bytes) in dist/.`);
  console.log(result.siteURL ? `Canonical base: ${result.siteURL}` : 'SITE_URL is optional. Set it after deployment to enable canonical URLs and sitemap.');
}
