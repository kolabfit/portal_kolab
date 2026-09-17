import express from 'express';
import db from '../lib/db.js';
import axios from 'axios';
import { requireSession } from '../lib/session.js';

const router = express.Router();

/**
 * @desc Get all photobooth settings (config, icons, frames, filters, backgrounds)
 * Equivalent to action=getAll in GAS
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT category, data FROM photobooth_settings');
    
    const result = {
      config: {},
      icons: [],
      frames: [],
      filters: [],
      backgrounds: []
    };

    rows.forEach(row => {
      try {
        result[row.category] = JSON.parse(row.data);
      } catch (e) {
        console.error(`Error parsing JSON for category ${row.category}:`, e.message);
        result[row.category] = row.category === 'config' ? {} : [];
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching photobooth settings:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @desc Save all photobooth settings
 * Equivalent to action=saveAll in GAS
 */
router.post('/', requireSession, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' });
  const { action, data } = req.body;

  // For compatibility with the current frontend payload structure
  const payloadData = data || req.body; 

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const categories = ['config', 'icons', 'frames', 'filters', 'backgrounds'];
    
    for (const category of categories) {
      if (payloadData[category] !== undefined) {
        if (category === 'config' ? !payloadData[category] || typeof payloadData[category] !== 'object' || Array.isArray(payloadData[category]) : !Array.isArray(payloadData[category])) {
          throw Object.assign(new Error(`Data ${category} tidak valid.`), { status: 400 });
        }
        const jsonData = JSON.stringify(payloadData[category]);
        
        // Use UPSERT (INSERT ... ON DUPLICATE KEY UPDATE)
        await connection.execute(
          'INSERT INTO photobooth_settings (category, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?',
          [category, jsonData, jsonData]
        );
      }
    }

    await connection.commit();
    res.json({ status: 'success', message: 'Photobooth settings saved' });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving photobooth settings:', error);
    res.status(error.status || 500).json({ status: 'error', message: error.message });
  } finally { connection.release(); }
});

/**
 * @desc API QR Download
 * Serves the image from the storage server as a downloadable attachment
 */
router.get('/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const STORAGE_URL = 'https://repofoto.kolab.top/foto/';
  const fileUrl = `${STORAGE_URL}${filename}`;

  try {
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream'
    });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
    
    response.data.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error.message);
    res.status(404).json({ status: 'error', message: 'File not found or storage server unreachable' });
  }
});

export default router;
