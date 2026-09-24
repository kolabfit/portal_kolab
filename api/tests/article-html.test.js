import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeArticleHtml, validateArticleContent } from '../lib/articleHtml.js';

test('article HTML keeps headings, inline formatting, paragraphs and lists', () => {
  const html = '<h2>Heading</h2><p><strong>Bold</strong> <em>Italic</em></p><h3>Subheading</h3><ul><li>Bullet</li></ul><ol><li>Number</li></ol>';
  assert.equal(validateArticleContent(html), html);
});
test('article HTML rejects visually empty descriptions', () => {
  for (const html of ['', '<p><br></p>', '<div>&nbsp; \n</div>', '<p>\u200b</p>', '<script>alert(1)</script>']) {
    assert.throws(() => validateArticleContent(html), { status: 400, field: 'content', error: 'VALIDATION_ERROR' });
  }
});
test('article HTML strips scripts, events, unsafe links and frames', () => {
  const clean = sanitizeArticleHtml('<p onclick="alert(1)">Safe</p><img src=x onerror="alert(1)"><script>alert(1)</script><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">Link</a>');
  assert.equal(clean, '<p>Safe</p><a>Link</a>');
});
