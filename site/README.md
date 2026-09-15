# Static website layer

`npm run build` combines this directory with the preserved root tool and writes `dist/`.
No framework, backend, runtime CDN, or subscription infrastructure is introduced.

- `content.mjs`: complete static English/Chinese page copy.
- `theme.css`: marketing and documentation styles.
- `app.css`: matching workspace styles, including dark mode and phone layout.
- `app.mjs`: fail-closed adapter plus a small inline integration script. Existing
  archive/delete/transfer/package execution functions remain in the source engine.
- `build.mjs`: routes, metadata, static pages, CSP hash, sitemap, robots, and host headers.
- `serve.mjs`: local-only static preview; not a production application backend.

When updating the root engine, run all tests. If an adapter anchor changes, deliberately
review and update it rather than loosening the unique-match assertion. The structural
and core suites load the generated app, and the browser suite drives that same file.

Set SITE_URL to the final public HTTPS base before production builds. Publish dist/.
