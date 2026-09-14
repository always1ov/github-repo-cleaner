# Changelog

## 1.0.0

The single-page tool grew into a product: documented, tested, and safe to hand a token
to.

### Trust

- A `Content-Security-Policy` restricts the page to one network destination,
  `api.github.com`. No remote images, fonts, scripts, styles or frames — the avatar is
  drawn locally so nothing has to be fetched.
- Documented the token-handling guarantees in `SECURITY.md` and covered every one of
  them with tests that run in CI.
- **Demo mode**: the whole UI on generated data, with no requests at all, so the tool can
  be evaluated before a token is pasted.
- **Token scopes** panel reports what the token can and cannot do up front, instead of
  leaving it to be discovered on the first 403.

### Safety

- **Archive / Unarchive** actions — a reversible alternative to deleting.
- **Backup script** generation (`git clone --mirror`) for the current selection.
- **Export** the selection as CSV or JSON, and download a CSV report after every run.
- Long runs can be **stopped mid-flight**.
- Items an action cannot apply to are skipped with a stated reason (archived
  repositories are read-only, so visibility changes now exclude them up front).

### Correctness

- Request layer honours `Retry-After` and `x-ratelimit-reset`, backs off on secondary
  rate limits, and retries 5xx and network failures — replacing a fixed 250 ms sleep.
- Pagination follows the `Link` header instead of assuming 20 pages, and says so when a
  listing is truncated.
- Selection changes no longer re-render the whole table; large accounts are paginated.

### Product

- English and Chinese throughout, switchable at any time, remembered locally.
- Light and dark themes following the system setting, with a manual override.
- Stats strip (count, disk usage, forks, archived, stale, empty) doubling as filters;
  new staleness and template filters.
- Keyboard shortcuts, focus-trapped dialogs, and a layout that holds up on a phone.
- 55 tests: unit, structural and end-to-end in real Chromium, run in CI.

### Moved

- `github-repo-cleaner.html` is now `index.html`, so the repository can be served
  directly as a site.
