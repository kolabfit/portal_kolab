import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSnapshot, confirmedMissing } from '../lib/repoCdnSnapshot.js';

const file = { id: 'a', project_id: 'p', name: 'photo.png', size: 12, mime_type: 'image/png', status: 'ready' };
test('inventory validates project scope and rejects partial or malformed responses', () => {
  assert.equal(normalizeSnapshot([file], 'p')[0].status, 'READY');
  assert.deepEqual(normalizeSnapshot([], 'p'), []);
  for (const input of [{ files: [], total: 12 }, { error: 'unavailable' }, [file, file], [{ ...file, project_id: 'other' }], [{ ...file, size: -1 }]]) {
    assert.throws(() => normalizeSnapshot(input, 'p'));
  }
});
test('absence requires two inventories separated by 30 seconds and ignores new uploads', () => {
  const rows = [{ cdn_asset_id: 'a', is_recent: 0 }, { cdn_asset_id: 'new', is_recent: 1 }];
  const first = confirmedMissing(rows, new Set(), new Map(), 1000);
  assert.deepEqual(first.removed, []);
  assert.deepEqual(confirmedMissing(rows, new Set(), first.pending, 30000).removed, []);
  assert.deepEqual(confirmedMissing(rows, new Set(), first.pending, 31000).removed, ['a']);
  assert.equal(confirmedMissing(rows, new Set(['a']), first.pending, 31000).pending.size, 0);
});
