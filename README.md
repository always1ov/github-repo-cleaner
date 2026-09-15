# Repo Cleaner

**A free little tool for a tidier GitHub.** Find forgotten projects, review your
selection, then archive or delete in bulk. English first, with a full Chinese site.
No registration, subscription, payment integration, advertising, or feature paywall.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Falways1ov%2Fgithub-repo-cleaner%2Ftree%2Ffree-tool)

[中文说明](README.zh-CN.md) · [Website branch](https://github.com/always1ov/github-repo-cleaner/tree/free-tool) · [Security](SECURITY.md)

## Deploy to Cloudflare

Click the button above. It targets **`free-tool`**, not the original `master` branch.
Sign in to Cloudflare, authorize GitHub when prompted, choose the new repository and
Worker names, then confirm **Deploy**. This is a shortcut into Cloudflare's setup flow,
not a bypass of login or deployment confirmation.

The official button creates a **new repository copy** and connects it to Workers Builds.
Future automatic deployments follow that copy's production branch, not this source branch.
To keep deploying this exact repository instead, use Workers & Pages → Create application
→ connect this repository, and select production branch **`free-tool`**.

| Setting | Value |
| --- | --- |
| Framework | None / static site |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Static files | `dist/` (set in `wrangler.jsonc`) |
| Node.js | 22 or newer |
| Required application secrets | None |

This uses **Workers Static Assets**, with no Worker JavaScript, database, OAuth server,
KV, R2, or application backend. The official button supports Workers, not Pages.
Do **not** put a GitHub cleanup token in build variables or source files. A user supplies
that token only in their browser when using the tool; it is unrelated to deployment.

`wrangler.jsonc` configures trailing-slash routes, a real 404 page, and a `workers.dev`
address. The static build needs no dependencies. Deployment uses Wrangler 4 via `npx`;
Cloudflare handles its own account authorization.

### Optional: custom domain and search metadata

The site works without `SITE_URL`. After deployment, set the **build environment** variable
`SITE_URL` to the actual public HTTPS address (for example your assigned `workers.dev`
address or custom domain), then rebuild. This enables canonical URLs, language-alternate
URLs, and the sitemap. Until then, those absolute-URL tags and the sitemap are omitted:
the site never claims that your Cloudflare deployment belongs to someone else's domain.

Custom domains still need to be connected in Cloudflare. Setting `SITE_URL` does not buy
or bind a domain. No application secrets are necessary.

Official references: [Deploy buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/),
[Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/),
[Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## What is included

- English and Chinese homepages, guides, security, privacy, and terms pages.
- Responsive light/sage design and light/dark interactive workspace.
- A no-token demo; quick filters for old forks, stale projects, and archives.
- Existing repository and package operations, exports, Git backup scripts, and run reports.
- Review lists and explicit confirmations before destructive actions. All features are free.

## Development and tests

Node.js 22+. No packages are required for the static build or unit tests.

```sh
npm run dev           # build once, then preview at http://127.0.0.1:4173
npm run build         # rebuild after edits; output is dist/
npm run preview       # preview an existing build
npm test              # build, then unit, security, and site checks
npm run test:browser  # install optional Playwright/Chromium and run browser checks
npm run deploy:check  # build and Wrangler dry run; does not publish
npm run deploy        # build and deploy after Cloudflare authorization
```

CI runs unit/security/site tests, Chromium tests, and a Cloudflare deployment dry run.
Browser tests use demo data and mocked requests, never real destructive API operations.
GitHub Pages deployment is **manual only** on this branch, so cloning the template does
not silently publish to Pages. To use Pages intentionally, configure its workflow's
`SITE_URL` for your destination and publish the generated `dist/` directory.

## Source layout

```text
index.html       Preserved single-file engine from the original starting branch
site/            Website content, styles, static builder, and checked engine adapter
test/            Tests of the actual generated workspace and website
wrangler.jsonc   Assets-only Cloudflare deployment configuration

dist/index.html       English homepage (generated)
dist/zh/index.html    Chinese homepage (generated)
dist/app/index.html   Standalone workspace (generated)
```

**Publish `dist/`, not the repository root.** `dist/`, `.wrangler/`, dependencies, local
secrets, and test screenshots are ignored by Git. The adapter fails on missing or
ambiguous source anchors; review it and run the tests when updating the original engine.
The generated workspace remains one self-contained HTML file; the UI and demo work
offline, while live GitHub operations require a connection.

## Safety

Prefer a short-lived token restricted to selected repositories. Repository administration
is a powerful permission, not a harmless login. Review the guide before granting it.
The token is sent directly from your browser to GitHub, not an application backend, and
is not saved in browser storage or URLs. Only display preferences are persisted.
The website host may still process ordinary access/security logs.

There is no in-tool undo. A Git backup script is only generated, not run or verified;
it is not a complete backup of GitHub issues, releases, settings, packages, LFS, or wikis.
Archive when unsure. See [SECURITY.md](SECURITY.md).

[MIT](LICENSE). Independent project; not affiliated with or endorsed by GitHub.
