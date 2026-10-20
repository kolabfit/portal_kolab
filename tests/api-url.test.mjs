// VITE_API_BASE_URL is relative in production (/api). `new URL('/api/mitra')` without a base throws
// "Failed to construct 'URL': Invalid URL" (Mitra page, 2026-10-20), so every `new URL` built from the
// API base must pass a base URL as the second argument.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', 'dist', 'releases', 'current', 'api', 'tests', '.git']);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (SKIP.has(e.name) ? [] : walk(path.join(dir, e.name))) : [path.join(dir, e.name)]);

test('new URL() built from the API base always gets a base URL', () => {
  const offenders = [];
  for (const file of walk('.').filter((f) => /\.(ts|tsx|js|jsx)$/.test(f))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const m of source.matchAll(/new URL\(\s*(`\$\{\s*API_[A-Z_]*\s*\}[^`]*`|API_[A-Z_]*(?:\s*\+\s*[^,)]+)?)\s*\)/g)) {
      offenders.push(`${file}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, [], 'use new URL(url, window.location.origin)');
});
