import express from 'express';
import db from '../lib/db.js';
const router = express.Router();
router.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'UP', database: 'UP', timestamp: new Date().toISOString(), version: '1.0.0' });
  } catch {
    res.status(503).json({ status: 'DOWN', database: 'DOWN' });
  }
});
export default router;
