/**
 * Kroombox CDN Service — Portal Ko+Lab
 * Centralized service for all CDN operations.
 *
 * Credentials are loaded from environment variables only.
 * NEVER expose API_KEY or JWT to frontend.
 *
 * Endpoints per GUIDANCE-KROOMBOX-CDN-API.md:
 *   Upload:   POST /api/bridge/upload
 *   List:     GET  /api/bridge/files
 *   View:     GET  /api/bridge/view/:id
 *   Others:   follow Kroombox CDN guide
 */

import axios from 'axios';
import FormData from 'form-data';
import { normalizeSnapshot } from './repoCdnSnapshot.js';

const BASE_URL = process.env.KROOMBOX_CDN_BASE_URL || 'https://api-cdn.kroombox.com';
const API_KEY = process.env.KROOMBOX_CDN_API_KEY;
const CDN_JWT = process.env.KROOMBOX_CDN_JWT;
const PROJECT_ID = process.env.KROOMBOX_CDN_PROJECT_ID;

// Upload timeout 60s, others 15s
const cdnClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-api-key': API_KEY
  }
});

// Add JWT if available
cdnClient.interceptors.request.use(config => {
  if (CDN_JWT && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${CDN_JWT}`;
  }
  return config;
});

// Never log credential headers
cdnClient.interceptors.request.use(config => {
  return config;
}, null, { synchronous: true });

/**
 * Upload a file to Kroombox CDN.
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {object} options - { parentId, featureType }
 * @returns {{ fileId, status, deliveryUrl }}
 */
export async function uploadFile(buffer, fileName, mimeType, options = {}) {
  const form = new FormData();
  form.append('file', buffer, {
    filename: sanitizeFilename(fileName),
    contentType: mimeType
  });
  if (PROJECT_ID) form.append('projectId', PROJECT_ID);
  if (options.parentId) form.append('parentId', options.parentId);
  form.append('fileName', sanitizeFilename(fileName));
  form.append('mimeType', mimeType);

  const response = await cdnClient.post('/api/bridge/upload', form, {
    headers: { ...form.getHeaders() },
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });

  const data = response.data;
  return normalizeUploadResponse(data);
}

/**
 * Get the status of a CDN file.
 * If CDN does not have a dedicated status endpoint, falls back to file list lookup.
 * @param {string} fileId
 */
export async function getFileStatus(fileId, { signal } = {}) {
  try {
    // Check actual delivery using a signed URL, including private files.
    const deliveryUrl = getDeliveryUrl(fileId);
    const response = await axios.get(await createSignedUrl(fileId, 900, { signal }), {
      responseType: 'stream', timeout: 15000, maxRedirects: 5, signal
    });
    response.data.destroy();
    if (response.status === 202) return { fileId, status: 'PROCESSING' };
    return { fileId, status: 'READY', deliveryUrl };
  } catch (err) {
    err.response?.data?.destroy?.();
    if (err.response?.status === 404) {
      return { fileId, status: 'PROCESSING' };
    }
    throw new Error(`CDN status check failed: ${err.message}`);
  }
}

/**
 * Get the public delivery URL for a file.
 * Uses CDN endpoint: GET /api/bridge/view/:id
 * @param {string} fileId
 * @param {object} transform - Optional image transform params (width, height, quality, format, fit)
 */
export function getDeliveryUrl(fileId, transform = {}) {
  const url = new URL(`${BASE_URL}/api/bridge/view/${fileId}`);
  for (const [key, val] of Object.entries(transform)) {
    if (val !== undefined && val !== null) url.searchParams.set(key, val);
  }
  return url.toString();
}

/**
 * List files from CDN.
 * GET /api/bridge/files
 */
export async function listFiles(params = {}) {
  const response = await cdnClient.get('/api/bridge/files', {
    params: { projectId: PROJECT_ID, ...params },
    timeout: 15000
  });
  return response.data;
}

// Resolve CDN paths before returning them to a browser on the Portal host.
export function resolveDeliveryUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('CDN returned an empty delivery URL');
  }
  const url = new URL(value, `${BASE_URL.replace(/\/+$/, '')}/`);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('CDN returned an invalid delivery URL protocol');
  }
  return url.href;
}

// Use the signed URL itself for delivery; never forward project credentials
// to a delivery host or its redirects.
export async function openImageStream(deliveryUrl, { processing = false, maxAttempts = 7, retryDelayMs = 500 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetchImageStream(deliveryUrl);
    } catch (err) {
      const status = err.response?.status;
      // A newly uploaded asset can exist in the CDN index before its bytes
      // are available. Do not retry authorization failures or old missing files.
      if (!processing || ![404, 202, 502, 503, 504].includes(status)) throw err;
      if (attempt === maxAttempts - 1) {
        const pending = new Error('CDN image is still processing');
        pending.code = 'CDN_PROCESSING';
        pending.upstreamStatus = status;
        throw pending;
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(retryDelayMs * 2 ** attempt, 4000)));
    }
  }
}

async function fetchImageStream(deliveryUrl) {
  let response;
  try {
    response = await axios.get(resolveDeliveryUrl(deliveryUrl), {
    responseType: 'stream', timeout: 15000, maxRedirects: 5
    });
  } catch (err) {
    // Axios stream responses must be closed even when the HTTP status fails.
    err.response?.data?.destroy?.();
    throw err;
  }
  if (response.status === 202) {
    response.data.destroy();
    const pending = new Error('CDN image is still processing');
    pending.response = { status: 202 };
    throw pending;
  }
  const mime = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!/^image\/(png|jpeg|gif|webp|avif|bmp|x-icon)$/.test(mime)) {
    response.data.destroy();
    throw new Error('CDN did not return a supported image');
  }
  return { stream: response.data, mime };
}

/**
 * Delete a file from CDN.
 * Follows guide: uses available delete endpoint.
 * @param {string} fileId
 */
export async function deleteFile(fileId) {
  try {
    // Per guide, delete endpoint path should be confirmed from Kroombox docs.
    // Using most common RESTful pattern.
    const response = await cdnClient.delete(`/api/bridge/files/${fileId}`, {
      timeout: 15000
    });
    return response.data;
  } catch (err) {
    // A 404 can also mean the delete endpoint is unavailable. Confirm absence
    // from the project inventory before removing Portal metadata.
    if (err.response?.status === 404) {
      const inventory = normalizeSnapshot(await listFiles(), PROJECT_ID);
      if (!inventory.some(file => file.id === fileId)) return { status: 'deleted', fileId };
    }
    throw new Error(`CDN delete failed for ${fileId}: ${err.message}`);
  }
}

/**
 * Rename a file on CDN.
 * fileId remains immutable, only display name changes.
 * @param {string} fileId
 * @param {string} newName
 */
export async function renameFile(fileId, newName) {
  const response = await cdnClient.patch(`/api/bridge/files/${fileId}`, {
    fileName: sanitizeFilename(newName)
  }, { timeout: 15000 });
  return response.data;
}

/**
 * Move a file to a different parent/folder on CDN.
 * @param {string} fileId
 * @param {string} newParentId
 */
export async function moveFile(fileId, newParentId) {
  const response = await cdnClient.patch(`/api/bridge/files/${fileId}`, {
    parentId: newParentId
  }, { timeout: 15000 });
  return response.data;
}

/**
 * Create a signed URL for a private file.
 * Per guide: Signed URL supported.
 * @param {string} fileId
 * @param {number} expiresInSeconds - Default 15 minutes
 */
export async function createSignedUrl(fileId, expiresInSeconds = 900, { signal } = {}) {
  const response = await cdnClient.post(`/api/bridge/sign/${fileId}`, {
    expiresIn: expiresInSeconds
  }, { timeout: 15000, signal });
  return resolveDeliveryUrl(response.data?.url);
}

/**
 * Purge CDN cache for a file.
 * @param {string} fileId
 */
export async function purgeCache(fileId) {
  try {
    const response = await cdnClient.post(`/api/bridge/files/${fileId}/purge`, {}, {
      timeout: 15000
    });
    return response.data;
  } catch (err) {
    // Non-critical: log but don't throw
    console.warn(`[CDN] Cache purge failed for ${fileId}:`, err.message);
    return null;
  }
}

/**
 * Check CDN health/connectivity.
 */
export async function checkHealth() {
  try {
    const response = await cdnClient.get('/api/bridge/files', {
      params: { limit: 1, projectId: PROJECT_ID },
      timeout: 10000
    });
    return response.status === 200 ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/**
 * Wait for a CDN file to reach READY status.
 * Polls with exponential backoff.
 * @param {string} fileId
 * @param {number} maxAttempts - Default 10
 */
export async function waitForReady(fileId, maxAttempts = 10, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  const signal = AbortSignal.timeout(timeoutMs);
  for (let i = 0; i < maxAttempts; i++) {
    if (signal.aborted) break;
    let result;
    try { result = await getFileStatus(fileId, { signal }); }
    catch (error) { if (signal.aborted) break; throw error; }
    if (result.status === 'READY') return result;
    if (result.status === 'FAILED') throw new Error(`CDN processing failed for ${fileId}`);
    // Exponential backoff: 500ms, 1s, 2s, 4s... max 8s
    if (i === maxAttempts - 1) break;
    const delay = Math.min(500 * Math.pow(2, i), 8000, Math.max(0, deadline - Date.now()));
    await new Promise(r => setTimeout(r, delay));
  }
  // Return as PROCESSING if not ready after max attempts
  return { fileId, status: 'PROCESSING', deliveryUrl: getDeliveryUrl(fileId) };
}

// --- Internal helpers ---

function sanitizeFilename(name) {
  return String(name || 'file')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 200);
}

function normalizeUploadResponse(data) {
  // Normalize CDN response to Portal Asset format
  const fileId = data?.fileId || data?.file_id || data?.id || data?.data?.fileId;
  if (typeof fileId !== 'string' || !fileId) throw new Error('CDN upload did not return a file ID');
  const status = data?.status || 'PROCESSING';
  const deliveryUrl = fileId ? getDeliveryUrl(fileId) : null;
  return { fileId, status: mapCdnStatus(status), deliveryUrl, raw: undefined };
}

function mapCdnStatus(cdnStatus) {
  const s = String(cdnStatus).toUpperCase();
  if (s === 'READY' || s === 'SUCCESS' || s === 'DONE') return 'READY';
  if (s === 'FAILED' || s === 'ERROR') return 'FAILED';
  return 'PROCESSING';
}
