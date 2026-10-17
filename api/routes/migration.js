import express from 'express';
import db from '../lib/db.js';
import axios from 'axios';
import crypto from 'node:crypto';
import { requireSession } from '../lib/session.js';

const router = express.Router();
const collections = {
  getAssets: 'assets', getStartups: 'startup_teams', getInformasi: 'information',
  getSchedules: 'schedules', getEvents: 'events', getArticles: 'articles',
  getCategories: 'article_categories', getTags: 'article_tags', getAnnouncements: 'announcements'
};

router.post('/pull', requireSession, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' });
  const gasUrl = req.body.gasUrl || process.env.GAS_URL;
  if (!gasUrl) return res.status(400).json({ status: 'error', message: 'GAS deployment URL is required' });
  try {
    const parsed = new URL(gasUrl);
    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ status: 'error', message: 'GAS URL harus menggunakan protokol HTTPS.' });
    }
    const allowedHosts = ['script.google.com', 'script.googleusercontent.com'];
    if (!allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
      return res.status(400).json({ status: 'error', message: 'GAS URL harus mengarah ke domain resmi script.google.com.' });
    }
  } catch {
    return res.status(400).json({ status: 'error', message: 'Format GAS URL tidak valid.' });
  }
  let connection;
  try {
    const fetched = {};
    for (const action of Object.keys(collections)) {
      const response = await axios.get(gasUrl, { params: { action }, timeout: 20000 });
      const value = response.data;
      if (action === 'getAssets' ? !value || typeof value !== 'object' || Array.isArray(value) || value.status === 'error' : !Array.isArray(value)) {
        throw new Error(`Invalid collection: ${action}`);
      }
      fetched[action] = value;
    }
    connection = await db.getConnection();
    await connection.beginTransaction();
    async function upsert(table, item) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
      const aliases = { ...(table === 'startup_teams' ? { logoUrl: 'logo' } : {}), image: 'image_url', videoID: 'video_id' };
      const row = {};
      for (const [key, value] of Object.entries(item)) {
        const column = aliases[key] || key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
        const definition = columns.find(c => c.Field === column);
        if (!definition) continue;
        let converted = value;
        if (['student_policy', 'lecturer_policy', 'tags'].includes(column)) converted = JSON.stringify(value || (column === 'tags' ? [] : {}));
        if (column === 'location_online' && table === 'schedules') converted = [true, 1, 'true', 'Yes', 'on'].includes(value);
        if (/^(date|datetime|timestamp)/i.test(definition.Type) && value) converted = String(value).replace('T', ' ').replace(/Z$/, '').slice(0, definition.Type === 'date' ? 10 : 19);
        row[column] = converted ?? null;
      }
      if (table === 'article_tags' && !row.slug) row.slug = String(row.name || item.id).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (item.target) { row.target_type = item.target.type; row.target_value = item.target.value || ''; }
      if (table === 'assets') {
        const [[existing]] = await connection.query('SELECT id FROM assets ORDER BY id LIMIT 1');
        row.id = existing?.id || 1;
      } else if (!row.id && table !== 'yplaylists') row.id = crypto.randomUUID();
      const keys = Object.keys(row);
      await connection.execute(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${keys.map(key => `${key}=VALUES(${key})`).join(',')}`, Object.values(row));
    }
    const results = {};
    for (const [action, table] of Object.entries(collections)) {
      const rows = action === 'getAssets' ? [fetched[action]] : fetched[action];
      for (const row of rows) await upsert(table, row);
      results[table] = rows.length;
    }
    for (const [property, table] of [['yPlaylists', 'yplaylists'], ['tvChannels', 'tvlive']]) {
      const rows = fetched.getAssets[property] || [];
      for (const row of rows) await upsert(table, row);
      results[table] = rows.length;
    }
    await connection.commit();
    res.json({ status: 'success', results });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(502).json({ status: 'error', message: error.message });
  } finally { if (connection) connection.release(); }
});
export default router;
