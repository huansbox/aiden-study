import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

// GitHub Pages reads this file as one hostname, without a scheme or repo path.
test('Pages publishes the agreed family subdomain', () => {
  const cname = readFileSync(fileURLToPath(new URL('../docs/CNAME', import.meta.url)), 'utf8');
  assert.match(cname, /^kids\.linshuhuan\.com\r?\n$/);
});
