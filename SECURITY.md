# Security

These statements describe the generated `dist/app/index.html` published by the site
build. The root `index.html` is a preserved engine/template; deploy `dist/`, not the root.

## Data flow

The workspace calls `https://api.github.com` directly from the browser. It has no
application backend, database, account system, payment integration, analytics, or
session recording. Your token is sent to GitHub in the Authorization header.

Tokens are held in memory, never intentionally stored in localStorage, sessionStorage,
IndexedDB, cookies, or URLs. The password input also contains the token while typing;
the published app clears it when connecting, entering the demo, or disconnecting.
A failed connection clears the in-memory token. Closing/reloading discards the session.
Only language, theme, and page-size preferences are persisted under `grc.` keys.
Exports and reports remain wherever the user explicitly saves them.

The static hosting provider still receives ordinary website requests and may process
IP addresses, user agents, and access/security logs under its own policies. No analytics
is not the same as no infrastructure logging.

## Defensive layers

- CSP denies network sources by default and permits app API connections only to
  `https://api.github.com`. The published inline script is authorized by its SHA-256 hash.
- No remote scripts, styles, images, fonts, frames, or runtime dependencies are needed.
- The request helper also rejects other origins and credential-bearing URLs before fetch.
- Tokens are not accepted from query parameters or fragments. Fragments only select
  English/Chinese or the no-network demo.
- Ambiguous/missing source-adapter anchors fail the build. Tests read the generated
  workspace, validate its CSP hash, and exercise its core logic and UI.
- On hosts supporting `_headers`, frame restrictions, MIME protection, and a referrer
  policy supplement the in-document CSP. Header support is host-specific.

## Limits

These controls are not an absolute security guarantee. An attacker controlling the
published HTML can change its code and CSP. Browser extensions, malware, a compromised
publisher/build environment, and user mistakes are outside these guarantees. Review the
source and the exact built artifact, use a clean browser profile when appropriate,
restrict repository access, set a short expiry, and revoke the token afterwards.

Deletion requires reviewing the target list, an acknowledgement, and the confirmation
text. There is no in-tool rollback. Stopping a run does not reverse completed requests.
GitHub may restore eligible deleted repositories within 90 days, subject to restrictions;
never rely on this instead of a verified backup. Archive when unsure.

A generated Git mirror script is only a script, not proof that a backup ran successfully.
Git history/refs are not a full backup of GitHub issues, pull requests, release assets,
settings, secrets, LFS objects, separate wikis, or package data.

Read GitHub's official guidance:
- https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository
- https://docs.github.com/en/repositories/archiving-a-github-repository/backing-up-a-repository
- https://docs.github.com/en/rest/repos/repos
- https://docs.github.com/en/packages/learn-github-packages/deleting-and-restoring-a-package

## Reporting

Open an issue at https://github.com/always1ov/github-repo-cleaner/issues without tokens,
credentials, private repository data, or immediately exploitable details. For sensitive
findings, request a private reporting route first. This independent free project does
not promise a staffed security response service or guaranteed response time.
