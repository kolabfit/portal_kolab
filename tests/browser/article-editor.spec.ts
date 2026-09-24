import { test, expect } from '@playwright/test';

test('description stays visible while save promise is pending', async ({ page }) => {
  await page.goto('/tests/browser/article-editor.html');
  await page.getByRole('button', { name: 'New Entry' }).click();
  await page.locator('#title').fill('Student article');
  await page.locator('#categoryId').selectOption('cat1');
  await page.locator('[contenteditable]').fill('Description must survive submit.');
  await page.getByRole('button', { name: 'SIMPAN ARTIKEL' }).click();
  await expect.poll(() => page.evaluate(() => window.articlePayload?.content)).toContain('Description must survive submit.');
  await expect(page.locator('[contenteditable]')).toContainText('Description must survive submit.');
});

test('create draft survives category changes and pending/failed submit', async ({ page }) => {
  await page.goto('/tests/browser/article-editor.html');
  await page.getByRole('button', { name: 'New Entry' }).click();
  await page.locator('#title').fill('Student article');
  await page.locator('#categoryId').selectOption('cat1');
  const editor = page.locator('[contenteditable]');
  await editor.fill('First paragraph.\nSecond paragraph.');
  await page.locator('#categoryId').selectOption('cat2');
  await expect(editor).toContainText('Second paragraph.');
  await page.getByRole('button', { name: 'SIMPAN ARTIKEL' }).click();
  await expect(editor).toContainText('First paragraph.');
  await expect(editor).toHaveAttribute('contenteditable', 'false');
  await page.evaluate(() => window.completeSave(false));
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(editor).toContainText('Second paragraph.');
});

test('toolbar retains selected text and permits continued typing', async ({ page }) => {
  await page.goto('/tests/browser/article-editor.html');
  await page.getByRole('button', { name: 'New Entry' }).click();
  const editor = page.locator('[contenteditable]');
  await editor.fill('Alpha beta gamma');
  await editor.evaluate(el => {
    const range = document.createRange(); range.setStart(el.firstChild!, 6); range.setEnd(el.firstChild!, 10);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  });
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect(editor.locator('b,strong')).toHaveText('beta');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' continued');
  await expect(editor).toContainText('beta continued');
});

test('edit, paste sanitization, all formatting commands, long content and successful save', async ({ page }) => {
  await page.goto('/tests/browser/article-editor.html?edit');
  await page.getByRole('button', { name: 'Edit Existing article' }).click();
  const editor = page.getByRole('textbox', { name: 'Isi Artikel' });
  await expect(editor).toContainText('Original description');
  await editor.fill('Heading paragraph');
  for (const [button, tag] of [['Heading 2', 'h2'], ['Heading 3', 'h3'], ['Bullet List', 'ul'], ['Numbered List', 'ol']]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(editor.locator(tag)).toContainText('Heading paragraph');
  }
  await editor.fill('Select this text');
  await editor.press('Control+a');
  await page.getByRole('button', { name: 'Italic', exact: true }).click();
  await expect(editor.locator('i,em')).toHaveText('Select this text');
  await editor.press('ArrowRight');
  await editor.evaluate(el => {
    const data = new DataTransfer(); data.setData('text/html', '<p onclick="alert(1)">Pasted paragraph</p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">Unsafe link</a>');
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await expect(editor).toContainText('Select this text');
  await expect(editor).toContainText('Pasted paragraph');
  await expect(editor.locator('script,img,[onclick],[onerror],[href^="javascript:"]')).toHaveCount(0);
  const long = 'Long content remains intact. '.repeat(250);
  await editor.press('Control+End'); await page.keyboard.insertText(long);
  await page.locator('#categoryId').selectOption('cat2');
  await expect(editor).toContainText(long.trim());
  await page.getByRole('button', { name: 'SIMPAN ARTIKEL' }).click();
  await expect.poll(() => page.evaluate(() => window.articlePayload?.content.length)).toBeGreaterThan(7000);
  await expect(editor).toContainText(long.trim());
  await page.evaluate(() => window.completeSave(true));
  await expect(editor).toHaveCount(0);
});

test('thumbnail and attachment upload failure retains formatted draft and retry reuses uploaded IDs', async ({ page }) => {
  await page.goto('/tests/browser/article-editor.html');
  await page.getByRole('button', { name: 'New Entry' }).click();
  await page.locator('#title').fill('With media');
  await page.locator('#categoryId').selectOption('cat1');
  const editor = page.getByRole('textbox', { name: 'Isi Artikel' });
  await editor.fill('Formatted content survives media errors');
  await editor.press('Control+a'); await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await page.getByPlaceholder('Cari dan pilih tag...').fill('Test');
  await page.getByRole('button', { name: 'Test tag' }).click();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  await page.locator('input[type=file][accept^="image"]').setInputFiles({ name: 'thumb.png', mimeType: 'image/png', buffer: png });
  await page.locator('input[type=file][multiple]').setInputFiles({ name: 'guide.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  let uploads = 0, fail = true;
  await page.route('**/api/assets/upload', async route => {
    uploads++;
    const body = route.request().postDataBuffer()!.toString();
    const thumb = body.includes('ARTICLE_THUMBNAIL');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', asset: { id: thumb ? 'thumb' : 'pdf', cdnStatus: 'PROCESSING', deliveryUrl: '/ready.png' } }) });
  });
  await page.route(/\/api\/assets\/(thumb|pdf)$/, route => route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { message: 'Storage timeout' } : { cdnStatus: 'READY', deliveryUrl: '/ready.png' }) }));
  await page.getByRole('button', { name: 'SIMPAN ARTIKEL' }).click();
  await expect(page.getByText('Storage timeout')).toBeVisible();
  await expect(editor.locator('b,strong')).toHaveText('Formatted content survives media errors');
  await expect(page.locator('#title')).toHaveValue('With media');
  const uploadedBeforeRetry = uploads;
  fail = false;
  await page.getByRole('button', { name: 'SIMPAN ARTIKEL' }).click();
  await expect.poll(() => page.evaluate(() => window.articlePayload?.attachments.length)).toBe(1);
  expect(uploads).toBe(uploadedBeforeRetry);
  expect(await page.evaluate(() => window.articlePayload.tags)).toEqual(['tag1']);
  await expect(editor.locator('b,strong')).toHaveText('Formatted content survives media errors');
  await page.evaluate(() => window.completeSave(false));
  await expect(page.getByRole('button', { name: 'SIMPAN ARTIKEL' })).toBeEnabled();
});

test('upload and article request timeouts leave the draft visible and editable', async ({ page }) => {
  await page.addInitScript(() => {
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = milliseconds => timeout(Math.min(milliseconds, 150));
  });
  await page.goto('/tests/browser/article-editor.html?api');
  await page.getByRole('button', { name: 'New Entry' }).click();
  await page.locator('#title').fill('Timeout case');
  await page.locator('#categoryId').selectOption('cat1');
  const editor = page.getByRole('textbox', { name: 'Isi Artikel' });
  await editor.fill('Do not lose my draft.');
  await page.route('**/api/bridge', () => {});
  await page.getByRole('button', { name: 'SIMPAN ARTIKEL' }).click();
  await expect(page.getByText('Artikel belum tersimpan.', { exact: false })).toBeVisible();
  await expect(editor).toHaveText('Do not lose my draft.');
  await page.locator('input[type=file][multiple]').setInputFiles({ name: 'guide.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await page.route('**/api/assets/upload', () => {});
  await page.getByRole('button', { name: 'SIMPAN ARTIKEL' }).click();
  await expect(page.getByRole('button', { name: 'SIMPAN ARTIKEL' })).toBeEnabled();
  await expect(editor).toHaveText('Do not lose my draft.');
  await expect(editor).toHaveAttribute('contenteditable', 'true');
});

test('detail renders saved heading/list styles and keyboard toolbar keeps selection', async ({ page }) => {
  await page.goto('/tests/browser/article-editor.html?edit');
  await page.getByText('Existing article', { exact: true }).click();
  await expect(page.locator('.article-editor-content h2')).toHaveCSS('font-size', '24px');
  await expect(page.locator('.article-editor-content ul')).toHaveCSS('list-style-type', 'disc');
  await page.getByRole('button', { name: 'Kembali ke Indeks' }).click();
  await page.getByRole('button', { name: 'New Entry' }).click();
  const editor = page.getByRole('textbox', { name: 'Isi Artikel' });
  await editor.fill('Alpha beta gamma');
  await editor.evaluate(el => {
    const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode()!;
    const range = document.createRange(); range.setStart(text, 6); range.setEnd(text, 10);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  const bold = page.getByRole('button', { name: 'Bold', exact: true });
  await bold.focus(); await bold.press('Enter');
  await expect(editor.locator('b,strong')).toHaveText('beta');
  for (let i = 0; i < 2; i++) for (const name of ['Italic', 'Heading 2', 'Heading 3', 'Bullet List', 'Numbered List']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(editor).toHaveText('Alpha beta gamma');
  }
});
