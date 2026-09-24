import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { loadTs } from './load-ts.mjs';

test('article submit uploads selected attachments, retains successes on failure and retries without duplicates', async () => {
  const state = [], refs = [];
  let cursor = 0, refCursor = 0;
  const react = { ...React, useEffect() {}, useMemo: fn => fn(), useState(initial) {
    const i = cursor++;
    if (!(i in state)) state[i] = initial;
    return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
  }, useRef(initial) {
    const i = refCursor++;
    return refs[i] ||= { current: initial };
  } };
  const uploads = [], saves = [];
  let fail = true;
  const View = loadTs('views/ArticleView.tsx', { react, '../lib/articleHtml': { sanitizeArticleHtml: html => html, isRichTextEmpty: html => !html.trim() }, '../api': { api: {
    async uploadFileCdn(file, feature, articleId) {
      uploads.push({ name: file.name, feature, articleId });
      if (file.name === 'second.pdf' && fail) return { status: 'error', message: 'CDN unavailable' };
      return { status: 'success', asset: { id: file.name } };
    }
  } } }, { Error, FormData: class { get() { return null; } } }).default;
  const props = { articles: [], categories: [], tags: [], currentUser: 'Admin', isAdmin: true, showConfirm() {}, onAction: async (...args) => { saves.push(args); return true; } };
  const render = () => { cursor = 0; refCursor = 0; return View(props); };
  const find = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'form') return node;
    return React.Children.toArray(node.props?.children).map(find).find(Boolean);
  };
  render();
  state[1] = true; state[8] = 'category'; state[9] = 'Article'; state[10] = ['tag1'];
  state[12] = [{ name: 'first.pdf', type: 'application/pdf', size: 12 }, { name: 'second.pdf', type: 'application/pdf', size: 24 }];
  refs[0].current = { innerHTML: '<p>Content</p>', textContent: 'Content' };
  refs[1].current = 'article-draft';
  await find(render()).props.onSubmit({ preventDefault() {}, currentTarget: {} });
  assert.equal(saves.length, 0);
  assert.equal(state[1], true);
  assert.equal(state[5], false);
  assert.match(state[7], /CDN unavailable/);
  assert.equal(state[11][0].fileId, 'first.pdf');
  assert.equal(state[12].length, 1);
  fail = false;
  await find(render()).props.onSubmit({ preventDefault() {}, currentTarget: {} });
  assert.equal(uploads.filter(upload => upload.name === 'first.pdf').length, 1);
  assert.ok(uploads.every(upload => upload.feature === 'ARTICLE_ATTACHMENT' && upload.articleId === 'article-draft'));
  assert.equal(saves[0][1], 'article-draft');
  assert.equal(JSON.stringify(saves[0][2].tags), '["tag1"]');
  assert.equal(saves[0][2].attachments.length, 2);
  assert.equal(state[1], false);
});
