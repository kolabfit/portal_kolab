// Every table a route or lib queries must be created by scripts/migrate.js or schema.sql. The Mitra page
// returned 500 on 2026-10-20 because `mitras` was only created by a migration nobody ran; the server now
// runs migrate() on start, and this test catches a table that no migration creates at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.join(apiDir, '..');
const SKIP = new Set(['node_modules', 'tests', 'scratch']);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (SKIP.has(e.name) ? [] : walk(path.join(dir, e.name))) : [path.join(dir, e.name)]);

test('every table used by routes and lib is created by a migration or schema.sql', () => {
  const sources = walk(apiDir).filter((f) => f.endsWith('.js'));
  const schemaFiles = [...sources, path.join(repoDir, 'schema.sql')].filter((f) => fs.existsSync(f));
  const created = new Set();
  for (const file of schemaFiles) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/CREATE TABLE (?:IF NOT EXISTS )?`?([A-Za-z_][A-Za-z0-9_]*)/g)) created.add(m[1].toLowerCase());
  }
  const missing = [];
  for (const file of sources.filter((f) => /[\\/](routes|lib)[\\/]/.test(f))) {
    // `ON DUPLICATE KEY UPDATE col=...` names a column, not a table.
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/\b(?:FROM|INTO|(?<!KEY )UPDATE|JOIN)\s+`?([a-z_][a-z0-9_]*)`?/g)) {
      if (!created.has(m[1])) missing.push(`${m[1]} (${path.relative(repoDir, file)})`);
    }
  }
  assert.deepEqual([...new Set(missing)], [], 'add a CREATE TABLE IF NOT EXISTS to api/scripts/migrate.js');
});

test('the server runs the schema migration before it starts listening', () => {
  const server = fs.readFileSync(path.join(apiDir, 'server.js'), 'utf8');
  assert.match(server, /import \{ migrate \} from '\.\/scripts\/migrate\.js'/);
  assert.ok(server.indexOf('await migrate()') !== -1 && server.indexOf('await migrate()') < server.indexOf('app.listen('));
});
