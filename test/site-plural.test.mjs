import test from 'node:test';
import assert from 'node:assert/strict';
import { copy, singularCopy, extra, replaceTranslations } from '../site/app.mjs';

test('English-only singular overrides do not require a Chinese singular source key', () => {
  assert.equal(Object.keys(copy).some(key => key.endsWith('.one')), false);
  assert.equal(singularCopy['backup.title.one'], 'Generate Git backup script · {n} repository');
  for (const key of Object.keys(singularCopy)) assert.ok(copy[key.slice(0, -4)]);
  const source = "en: {'backup.title':'Old plural','backup.title.one':'Old singular'}, zh: {'backup.title':'旧标题'}";
  const result = replaceTranslations(source, { 'backup.title': copy['backup.title'] });
  assert.ok(result.includes('Generate Git backup script'));
  assert.ok(result.includes('生成 Git 备份脚本'));
  assert.deepEqual(Object.keys(extra.en).sort(), Object.keys(extra.zh).sort());
});
