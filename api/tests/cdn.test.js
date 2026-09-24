import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

test('CDN delivery URLs resolve to CDN without a profile submission', async t => {
  let returnedUrl = '/api/bridge/view/asset123?sig=test-signature&exp=1790087558';
  let transientRequests = 0;
  let failureRequests = 0;
  const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
      if (req.url === '/slow') return;
      assert.equal(req.headers['x-api-key'], undefined);
      assert.equal(req.headers.authorization, undefined);
      if (req.url === '/processing' && ++transientRequests < 3) {
        res.writeHead(404); res.end('Not ready'); return;
      }
      if (req.url === '/missing' || req.url === '/forbidden') {
        failureRequests++;
        res.writeHead(req.url === '/missing' ? 404 : 403); res.end('Unavailable'); return;
      }
      res.writeHead(200, { 'Content-Type': req.url === '/bad-image' ? 'text/html' : 'image/png' });
      res.end(req.url === '/bad-image' ? '<html>Not an image</html>' : Buffer.from('89504e470d0a1a0a', 'hex'));
      return;
    }
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/bridge/sign/asset123');
    req.resume();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: returnedUrl }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const previous = process.env.KROOMBOX_CDN_BASE_URL;
  process.env.KROOMBOX_CDN_BASE_URL = base;
  t.after(async () => {
    if (previous === undefined) delete process.env.KROOMBOX_CDN_BASE_URL;
    else process.env.KROOMBOX_CDN_BASE_URL = previous;
    await new Promise(resolve => server.close(resolve));
  });
  const cdn = await import('../lib/kroomboxCdn.js');
  await t.test('new upload becomes available after transient delivery 404s', async () => {
    const image = await cdn.openImageStream(base + '/processing', { processing: true, retryDelayMs: 1 });
    image.stream.destroy();
    assert.equal(transientRequests, 3);
  });
  await t.test('processing retries stop and report a pending asset', async () => {
    failureRequests = 0;
    await assert.rejects(cdn.openImageStream(base + '/missing', { processing: true, maxAttempts: 3, retryDelayMs: 1 }), { code: 'CDN_PROCESSING', upstreamStatus: 404 });
    assert.equal(failureRequests, 3);
  });
  await t.test('old missing files and permission errors are not retried', async () => {
    failureRequests = 0;
    await assert.rejects(cdn.openImageStream(base + '/missing'));
    assert.equal(failureRequests, 1);
    failureRequests = 0;
    await assert.rejects(cdn.openImageStream(base + '/forbidden', { processing: true, retryDelayMs: 1 }));
    assert.equal(failureRequests, 1);
  });
  await t.test('image delivery streams bytes without CDN credentials', async () => {
    const image = await cdn.openImageStream(base + '/image');
    const chunks = [];
    for await (const chunk of image.stream) chunks.push(chunk);
    assert.equal(image.mime, 'image/png');
    assert.equal(Buffer.concat(chunks).toString('hex'), '89504e470d0a1a0a');
  });
  await t.test('HTTP 200 HTML is rejected as an invalid image', async () => {
    await assert.rejects(cdn.openImageStream(base + '/bad-image'), /supported image/);
  });
  await t.test('relative signed response preserves signature on CDN host', async () => {
    assert.equal(await cdn.createSignedUrl('asset123'), base + returnedUrl);
  });
  await t.test('absolute signed response stays unchanged', async () => {
    returnedUrl = 'https://delivery.example.com/api/bridge/view/asset123?sig=abc%2B123&exp=1790087558';
    assert.equal(await cdn.createSignedUrl('asset123'), returnedUrl);
  });
  await t.test('missing signed URL fails instead of redirecting to an invalid path', async () => {
    returnedUrl = undefined;
    await assert.rejects(cdn.createSignedUrl('asset123'), /empty delivery URL/);
  });
  await t.test('stored relative public URLs resolve to CDN', () => {
    assert.equal(cdn.resolveDeliveryUrl('/api/bridge/view/asset123'), base + '/api/bridge/view/asset123');
    assert.equal(cdn.getDeliveryUrl('asset123'), base + '/api/bridge/view/asset123');
  });
  await t.test('non HTTP URLs are rejected', () => {
    assert.throws(() => cdn.resolveDeliveryUrl('javascript:alert(1)'), /invalid delivery URL protocol/);
  });
  await t.test('readiness polling has a wall-clock deadline even if delivery hangs', async () => {
    returnedUrl = '/slow';
    const started = performance.now();
    const result = await cdn.waitForReady('asset123', 10, 50);
    assert.equal(result.status, 'PROCESSING');
    assert.ok(performance.now() - started < 1500);
  });
});
