import express from 'express';
import db from '../lib/db.js';
import { checkHealth as cdnHealth } from '../lib/kroomboxCdn.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    const dbMs = Date.now() - dbStart;

    // CDN health check (non-blocking — don't bring API down if CDN is slow)
    let cdnStatus = 'unknown';
    try {
      const cdnStart = Date.now();
      cdnStatus = await Promise.race([
        cdnHealth(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      cdnStatus = cdnStatus === 'ok' ? 'ok' : 'error';
    } catch {
      cdnStatus = 'unavailable';
    }

    res.json({
      status: 'UP',
      api: 'ok',
      database: 'ok',
      databaseLatencyMs: dbMs,
      cdn: cdnStatus,
      timestamp: new Date().toISOString(),
      version: '1.1.0'
    });
  } catch {
    res.status(503).json({ status: 'DOWN', api: 'error', database: 'DOWN' });
  }
});

export default router;
