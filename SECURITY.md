# Security

## What this tool is

A single static HTML file that runs in your browser and calls the GitHub REST API with a
token you paste. There is no server, no account, no telemetry, and no build artifact —
what you read in `index.html` is exactly what runs.

## Threat model

The token you paste can read your private code and delete your repositories. The risk is
that the page sends it somewhere else, or keeps it around after you are done. Both are
addressed structurally rather than by promise:

**The browser enforces where the page may connect.** The document carries:

```
default-src 'none'; connect-src https://api.github.com; img-src data:;
style-src 'unsafe-inline'; script-src 'unsafe-inline';
base-uri 'none'; form-action 'none'
```

`default-src 'none'` denies everything by default. `connect-src` then permits exactly one
origin, so `fetch`, XHR, WebSocket and beacon calls to any other host are blocked by the
browser itself. There are no remote images, fonts, stylesheets, scripts or frames to act
as side channels — even the avatar is drawn locally from the first letter of your login.
`form-action 'none'` means nothing can be submitted anywhere, and `base-uri 'none'`
prevents a `<base>` tag from re-pointing relative URLs.

**The token is only ever in memory.** It is held in one variable and sent only as an
`Authorization` header. It is never written to `localStorage`, `sessionStorage`,
IndexedDB, a cookie, or the URL. Closing or reloading the tab discards it. The only
persisted data is three display preferences (`grc.lang`, `grc.theme`, `grc.pageSize`).

**No dynamic code.** No `eval`, no `new Function`, no dependency that could be updated
under you. The one `fetch` call site is a single function, so the network surface is
auditable in one read.

These properties are asserted by tests in `test/html.test.mjs` which run in CI, so a
regression fails the build rather than shipping quietly.

## What this does not protect you from

- **A malicious copy.** These guarantees apply to the file you actually open. If you get
  the page from somewhere else, read its CSP and its `fetch` call yourself, or download
  `index.html` from this repository and run it locally.
- **A browser extension.** Extensions can read page memory and are not bound by the
  page's CSP. If that is part of your threat model, run the file in a clean profile.
- **Your own mistakes.** Deletion is permanent and GitHub offers no undo. Use the backup
  script, or archive first — archiving is reversible.

## Handling tokens well

- Give the token only the scopes you need, and revoke it when you are finished.
- Prefer a short-lived token; classic tokens accept an expiry date.
- The **Token scopes** panel shows what your token can do before you act on anything.

## Reporting an issue

Open an issue at
https://github.com/always1ov/github-repo-cleaner/issues. If it concerns the
token-handling or CSP guarantees above, please say so in the title so it gets looked at
first.
