// Loads the single-file app for testing without a DOM.
// The pure-logic region of index.html is delimited by /* <core> */ ... /* </core> */
// and is evaluated verbatim, so the tests exercise shipped code rather than a copy.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');

export const SCRIPT = (() => {
  const m = HTML.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('index.html has no <script> block');
  return m[1];
})();

const CORE_SRC = (() => {
  const start = SCRIPT.indexOf('/* <core>');
  const end = SCRIPT.indexOf('/* </core> */');
  if (start < 0 || end < 0) throw new Error('index.html is missing the /* <core> */ markers');
  return SCRIPT.slice(start, end);
})();

const EXPORTS = [
  'I18N', 't', 'tn', 'DAY', 'fmtSize', 'daysSince', 'fmtDate', 'fmtClock',
  'parseNextLink', 'backoffMs', 'retryPlan', 'MAX_ATTEMPTS',
  'pkgKey', 'keyOf', 'isAdmin', 'passesRepo', 'passesPkg', 'sortList', 'selectItems', 'TEXT_KEYS',
  'repoStats', 'scopeReport', 'lacksDeleteScope',
  'csvCell', 'toCSV', 'repoCsvRows', 'pkgCsvRows', 'REPO_CSV_HEAD', 'PKG_CSV_HEAD', 'RUN_CSV_HEAD',
  'backupScript', 'shellQuote', 'ticketBody', 'demoData'
];

export const core = new Function(`${CORE_SRC}\nreturn {${EXPORTS.join(',')}};`)();
