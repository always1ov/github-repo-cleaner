/** Deterministic adapter around the existing, tested single-file tool.
 * Keep destructive action implementations in index.html. Fail the build if an
 * expected source anchor changes rather than silently publishing a partial patch.
 */
export function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error(`Expected exactly one source anchor: ${before.slice(0, 90)}`);
  return source.replace(before, () => after);
}
export function replaceTranslations(source, replacements) {
  for (const [key, values] of Object.entries(replacements)) {
    if (values.length !== 2) throw new Error(`Translation pair required: ${key}`);
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`('${escaped}'\\s*:\\s*)'(?:\\\\.|[^'\\\\])*'`, 'g');
    let count = 0;
    source = source.replace(pattern, (_, prefix) => prefix + JSON.stringify(values[count++]));
    if (count !== 2) throw new Error(`Expected en/zh values for ${key}; found ${count}`);
  }
  return source;
}
export const copy = {
  'app.lede': ['Find forgotten projects, review your selection, and archive or delete in bulk. Start with the demo, or connect using a short-lived GitHub token. All features are free.', '筛选遗忘的项目，检查列表，再批量归档或删除。可以先体验演示，或使用短期 GitHub Token 连接账号。全部功能免费。'],
  'trust.1t': ['Directly to GitHub', '直接连接 GitHub'],
  'trust.1d': ['Your token is sent to api.github.com, not an application backend. No analytics or third-party scripts.', 'Token 发送给 api.github.com，不经过应用后端。不加载统计分析或第三方脚本。'],
  'trust.2d': ['Held in memory for this session, never saved in browser storage or URLs. Disconnect or reload to clear it; revoke it on GitHub afterwards.', 'Token 仅在本次会话内存中使用，不写入浏览器存储或 URL。断开或刷新后清除，用完请到 GitHub 撤销。'],
  'trust.3t': ['Free and inspectable', '免费，代码可检查'],
  'trust.3d': ['The built workspace is one self-contained HTML file. No runtime dependencies, sign-up, subscription, or paid feature gates.', '构建后的工作台是一个自包含 HTML 文件。没有运行时依赖、注册、订阅或付费功能限制。'],
  'hint.scopes': ['For repositories, prefer a short-lived fine-grained token limited to selected repositories. Read-only browsing needs metadata access; archive, visibility changes, and deletion need <code>Administration: Read and write</code>. This is a powerful permission. Packages need a classic token; transfers have separate restrictions.', '整理仓库时，优先使用短期、限定仓库范围的 fine-grained Token。只读浏览需要 Metadata 权限；归档、修改可见性和删除需要 <code>Administration: Read and write</code>，这是一项高权限。软件包需要 Classic Token，转移还有单独限制。'],
  'hint.storage': ['Only language, theme, and page-size preferences are saved locally. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Create a fine-grained token</a>. Read the guide above before granting permissions, and revoke the token when finished.', '本地只保存语言、主题和分页偏好。<a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">创建细粒度 Token</a>。授权前请阅读上方指南，用完后撤销 Token。'],
  'act.connect': ['Load repositories', '加载仓库'],
  'act.logout': ['Disconnect', '断开连接'],
  'act.selAll': ['Select loaded matches', '选择已加载的匹配项'],
  'act.backup': ['Git backup script', 'Git 备份脚本'],
  'count.showing': ['{shown} of {total} loaded items shown · {sel} selected', '已加载 {total} 项，显示 {shown} 项 · 已选 {sel} 项'],
  'notice.pageCap': ['INCOMPLETE LIST: a listing stopped at {n} items. Filters and selection cover loaded data only; they cannot retrieve missing repositories or packages. Do not treat this as a complete account inventory.', '列表不完整：某个列表加载到 {n} 项后达到上限。筛选与选择只覆盖已加载数据，无法补全未加载的仓库或软件包。不要将此结果视为完整账号清单。'],
  'task.delete.note': ['There is no undo in this tool. GitHub may restore eligible repositories within 90 days, with restrictions; do not rely on recovery. Archive when unsure. A generated Git backup script has not been executed or verified and does not back up the complete GitHub project.', '本工具无法撤销删除。GitHub 可能在 90 天内恢复部分符合条件的仓库，但存在限制，请勿依赖恢复。不确定时先归档。生成 Git 备份脚本不代表备份已执行或验证，也不覆盖完整 GitHub 项目。'],
  'task.private.note': ['Changing visibility affects anonymous access, Pages availability, forks, and security features, depending on the repository and plan. Public forks may remain public. Review GitHub’s visibility rules before continuing.', '修改可见性可能影响匿名访问、Pages、Fork 与安全功能，具体取决于仓库和套餐。公开 Fork 可能继续公开。请先检查 GitHub 的可见性规则。'],
  'task.prune.ack': ['I understand this tool cannot undo package deletion, recovery is conditional, and deleting versions or image tags may break deployments.', '我理解本工具无法撤销软件包删除，恢复存在条件，删除版本或镜像标签可能破坏部署。'],
  'perm.intro': ['Classic scopes can be reported by GitHub. Fine-grained permissions may remain unknown; GitHub authorizes each request.', 'GitHub 可返回 Classic Token 的权限范围。细粒度权限可能无法完整获知，最终由 GitHub 对每次请求授权。'],
  'perm.fineNote': ['Fine-grained PAT permissions cannot be inferred reliably here. Repository writes need Administration: Read and write and selected-repository access. Packages require a classic token; repository transfer does not support fine-grained PATs. Organization policies may impose additional restrictions.', '这里无法可靠识别细粒度 PAT 的全部权限。仓库写操作需要 Administration: Read and write 及对应仓库授权。软件包需要 Classic Token，仓库转移不支持 fine-grained PAT。组织策略可能另有限制。'],
  'backup.title': ['Generate Git backup script · {n} repositories', '生成 Git 备份脚本 · {n} 个仓库'],
  'backup.intro': ['This only generates commands. Run and verify the backup yourself before deleting. Git mirrors include history and refs, not a complete GitHub project backup: issues, pull requests, release assets, settings, secrets, packages, LFS objects, and separate wikis need additional handling.', '这里只生成命令。删除前请自行运行并验证备份。Git 镜像包含历史和引用，不是完整的 GitHub 项目备份：Issues、PR、发布附件、设置、密钥、软件包、LFS 对象和独立 Wiki 需要另行处理。'],
  'backup.note': ['For private repositories, use a credential helper or gh auth login. Never paste a token into this script or a shareable URL. Downloading the script does not run it.', '私有仓库请使用凭据助手或 gh auth login。不要将 Token 写入脚本或可分享的 URL。下载脚本不代表已经执行。'],
  'keys.all': ['Select loaded matches', '选择已加载的匹配项'],
  'foot.note': ['Free & open source · Browser → GitHub API · No subscription', '免费开源 · 浏览器直连 GitHub API · 没有订阅']
};
// English has singular forms; Chinese intentionally falls back to its base key.
export const singularCopy = { 'backup.title.one': 'Generate Git backup script · {n} repository' };
export const extra = {
  en: {
    'site.free':'Free & open source','site.guide':'Guide','site.security':'Security','site.token':'GitHub personal access token',
    'site.step1':'01 · Limit access','site.step1d':'Select repositories and a short expiry. Read the permission guide first.',
    'site.step2':'02 · Find candidates','site.step2d':'Browse first. Filters are clues, never automatic deletion advice.',
    'site.step3':'03 · Review & confirm','site.step3d':'Archive when unsure. Every action shows what it will touch.',
    'site.quick':'Start with a filter:','site.forks':'Old forks','site.stale':'Untouched 1+ year','site.archived':'Already archived','site.all':'All loaded',
    'site.reminder':'Filters are not safety scores. Check dependencies and verify backups before deleting. All actions are free.',
    'site.partialPackages':'Some package listings failed. This is a partial result; check permissions and reload before treating it as complete.'
  },
  zh: {
    'site.free':'免费 · 开源','site.guide':'使用指南','site.security':'安全说明','site.token':'GitHub 个人访问令牌',
    'site.step1':'01 · 限定权限','site.step1d':'选择必要仓库与短期有效期，先阅读权限说明。',
    'site.step2':'02 · 找出候选项','site.step2d':'先浏览，筛选只是线索，不是自动删除建议。',
    'site.step3':'03 · 检查并确认','site.step3d':'不确定时先归档，每次操作都会展示影响列表。',
    'site.quick':'从筛选开始：','site.forks':'旧 Fork','site.stale':'一年未更新','site.archived':'已归档','site.all':'全部已加载项',
    'site.reminder':'筛选条件不是安全评分。删除前请检查依赖并验证备份。所有操作均免费。',
    'site.partialPackages':'部分软件包列表加载失败，当前结果不完整。请检查权限并重新加载。'
  }
};
export const boot = `
/* ---------- free-tool website integration ---------- */
(function freeToolSite() {
  const bar = document.querySelector('#bar');
  const tabs = document.querySelector('.tabs');
  const quick = document.querySelector('#quickFilters');
  const reminder = document.querySelector('#reviewReminder');
  function reflect() {
    const shown = bar.classList.contains('on') && S.view === 'repos';
    quick.classList.toggle('on', shown);
    reminder.classList.toggle('on', shown);
    const prefix = S.lang === 'zh' ? '../zh/' : '../';
    document.querySelector('#productHome').href = prefix + 'index.html';
    document.querySelector('#productGuide').href = prefix + 'guide/index.html';
    document.querySelector('#productSecurity').href = prefix + 'security/index.html';
  }
  const observer = new MutationObserver(reflect);
  observer.observe(bar, { attributes: true, attributeFilter: ['class'] });
  observer.observe(tabs, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.querySelectorAll('[data-quick]').forEach(button => {
    button.addEventListener('click', () => {
      if (!S.user || S.busy || S.view !== 'repos') return;
      const kind = button.dataset.quick;
      document.querySelector('#q').value = '';
      document.querySelector('#fOwner').value = 'all';
      document.querySelector('#fVis').value = 'all';
      document.querySelector('#fKind').value = kind === 'forks' ? 'fork' : kind === 'archived' ? 'archived' : 'all';
      document.querySelector('#fAge').value = kind === 'forks' || kind === 'stale' ? '1' : 'all';
      S.sel.clear(); S.lastIdx = null; S.page = 1;
      render();
    });
  });
  const mode = window.location.hash;
  if (mode === '#zh' || mode === '#demo-zh') setLang('zh');
  else if (mode === '#en' || mode === '#demo') setLang('en');
  if (mode === '#demo' || mode === '#demo-zh') startDemo();
  reflect();
})();
`;
const mark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h4"/></svg>';
export function enhanceApp(source, css) {
  let html = replaceTranslations(source, copy);
  html = replaceOnce(html, '/* </core> */', `Object.assign(I18N.en, ${JSON.stringify({ ...extra.en, ...singularCopy })});\nObject.assign(I18N.zh, ${JSON.stringify(extra.zh)});\n/* </core> */`);
  html = replaceOnce(html, '</style>', css + '\n</style>');
  html = replaceOnce(html, '<body>', `<body>\n<a class="app-skip" href="#workspace">Skip to workspace</a>\n<nav class="product-nav" aria-label="Product"><a class="product-brand" id="productHome" href="../index.html"><span class="product-mark">${mark}</span>Repo Cleaner</a><div class="product-nav-links"><span class="free-badge" data-i18n="site.free"></span><a id="productGuide" href="../guide/index.html" data-i18n="site.guide"></a><a id="productSecurity" href="../security/index.html" data-i18n="site.security"></a></div></nav>\n<noscript><p style="padding:20px">JavaScript is required for the workspace. The guide and security pages work without JavaScript.</p></noscript>`);
  const steps = [1,2,3].map(n => `<div><b data-i18n="site.step${n}"></b><span data-i18n="site.step${n}d"></span></div>`).join('');
  html = replaceOnce(html, '    <div class="connect">', `    <div class="onboarding">${steps}</div>\n<label class="token-label" for="token" data-i18n="site.token"></label>\n    <div class="connect">`);
  html = replaceOnce(html, '<main>', `<main id="workspace" tabindex="-1">\n<div class="quick-filters" id="quickFilters"><small data-i18n="site.quick"></small>${['forks','stale','archived','all'].map(k => `<button type="button" data-quick="${k}" data-i18n="site.${k}"></button>`).join('')}</div><p class="review-reminder" id="reviewReminder" data-i18n="site.reminder"></p>`);
  html = replaceOnce(html, '</script>', boot + '\n</script>');
  html = replaceOnce(html, "const url = /^https?:/.test(path) ? path : API + path;", "const url = /^https?:/.test(path) ? path : API + path;\n  const destination = new URL(url);\n  if (destination.origin !== API || destination.username || destination.password) throw new Error('Refusing a request outside the GitHub API.');");
  html = replaceOnce(html, 'if (!Array.isArray(r.data)) break;', "if (!Array.isArray(r.data)) throw new Error('GitHub returned an unexpected list response. Reload before making changes.');");
  html = replaceOnce(html, "el.className = 'notice' + (S.demo ?", "el.className = 'notice' + (S.demo || S.capped ?");
  html = replaceOnce(html, 'let denied = 0, tried = 0;', 'let denied = 0, tried = 0, failed = 0;');
  html = replaceOnce(html, 'catch (e) { if (e.aborted) throw e; if (e.status === 401 || e.status === 403) denied++; }', 'catch (e) { if (e.aborted) throw e; failed++; if (e.status === 401 || e.status === 403) denied++; }');
  html = replaceOnce(html, "S.pkgWarn = denied === tried ? T('notice.pkgWarn') : '';", "S.pkgWarn = denied === tried ? T('notice.pkgWarn') : (failed ? T('notice.pkgFail', { msg: T('site.partialPackages') }) : '');");
  html = replaceOnce(html, 'async function connect() {\n  const raw', "async function connect() {\n  if ($('#go').disabled || S.busy) return;\n  const raw");
  html = replaceOnce(html, '  S.token = raw;\n  S.demo = false;', "  S.token = raw;\n  $('#token').value = '';\n  S.demo = false;");
  html = replaceOnce(html, "go.disabled = true; go.textContent = T('act.connecting');", "go.disabled = true; $('#demo').disabled = true; go.textContent = T('act.connecting');");
  html = replaceOnce(html, "go.disabled = false; go.textContent = T('act.connect');", "go.disabled = false; $('#demo').disabled = false; go.textContent = T('act.connect');");
  html = replaceOnce(html, "    showErr(e.status === 401 ? T('err.badToken')", "    S.token = ''; S.user = null; S.repos = []; S.pkgs = [];\n    showErr(e.status === 401 ? T('err.badToken')");
  html = replaceOnce(html, "S.demo = true; S.token = ''; S.tokenKind = 'classic';", "S.sel.clear(); S.status.clear(); S.gone.clear(); S.blocked.clear(); S.failed.clear();\n  S.capped = 0; S.notice = ''; S.noticeKind = ''; S.pkgWarn = '';\n  $('#token').value = '';\n  S.demo = true; S.token = ''; S.tokenKind = 'classic';");
  html = replaceOnce(html, "S.token = ''; S.user = null; S.demo = false;", "S.token = ''; S.user = null; S.demo = false;\n  $('#token').value = '';");
  html = replaceOnce(html, ": (nav.startsWith('zh') ? 'zh' : 'en');", ": 'en';");
  html = replaceOnce(html, '<meta name="color-scheme" content="light dark">', '<meta name="color-scheme" content="light dark">\n<meta name="robots" content="noindex, nofollow">\n<meta name="referrer" content="no-referrer">');
  html = replaceOnce(html, '<meta name="description" content="Bulk-manage your GitHub repositories and packages from one page. Runs entirely in your browser; the only host it can reach is api.github.com.">', '<meta name="description" content="Free GitHub repository cleanup. Review, archive and delete in bulk. No registration, subscription, analytics or application backend.">');
  return html;
}
