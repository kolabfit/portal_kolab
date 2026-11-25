import express from 'express';
import db from '../lib/db.js';
import { record } from '../lib/serializers.js';
import { listRepository } from '../lib/repository.js';
import { sanitizeArticleHtml } from '../lib/articleHtml.js';
import { requireSession } from '../lib/session.js';
import { listInternships } from '../lib/internships.js';

const router = express.Router();
const GAS_URL = process.env.GAS_URL;

router.get('/internships', requireSession, async (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' });
  res.set('Cache-Control', 'no-store');
  try { res.json(await listInternships(db)); } catch (error) { next(error); }
});

// Get Assets
router.get('/assets', async (req, res) => {
  try {
    const [assetsRows] = await db.execute('SELECT * FROM assets LIMIT 1');
    const [adminRows] = await db.execute('SELECT * FROM admins LIMIT 1');
    const [studentCount] = await db.execute('SELECT COUNT(*) as count FROM students');
    const [lecturerCount] = await db.execute('SELECT COUNT(*) as count FROM lecturers');
    
    const assets = assetsRows[0] || {};
    const admin = adminRows[0] || {};

    // Fetch dynamic data from MySQL
    const [yPlaylists] = await db.execute('SELECT * FROM yplaylists');
    const [tvChannels] = await db.execute('SELECT * FROM tvlive');

    res.json({
      bgFront: assets.bg_front || "",
      bgBack: assets.bg_back || "",
      logoUrl: assets.logo_url || "",
      studentPolicy: JSON.parse(assets.student_policy || '{}'),
      lecturerPolicy: JSON.parse(assets.lecturer_policy || '{}'),
      adminYoutube: assets.admin_youtube || admin.youtube || "",
      adminSpotify: assets.admin_spotify || admin.spotify || "",
      memberCount: (studentCount[0].count || 0) + (lecturerCount[0].count || 0),
      yPlaylists: yPlaylists.map(r => ({
        playlistId: r.playlist_id,
        title: r.title,
        thumbnail: r.thumbnail,
        publishedAt: r.published_at,
        channelTitle: r.channel_title
      })),
      tvChannels: tvChannels.map(r => ({
        id: r.id,
        title: r.title,
        videoId: r.video_id,
        thumbnail: r.thumbnail
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 30');
    res.json(rows.map(record));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Announcements
router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(rows.map(r => ({
      id: r.id,
      author: r.author,
      title: r.title,
      content: r.content,
      createdAt: r.created_at,
      target: { type: r.target_type, value: r.target_value }
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Startups
router.get('/startups', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM startup_teams');
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      website: r.website,
      ig: r.ig, tiktok: r.tiktok, linkedin: r.linkedin,
      logoUrl: r.logo
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// informasi
router.get('/informasi', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM information');
    res.json(rows.map(record));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedules
router.get('/schedules', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM schedules');
    res.json(rows.map(r => ({ ...record(r), locationOnline: !!r.location_online }))); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Events
router.get('/events', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM events');
    res.json(rows.map(r => ({ ...record(r), image: r.image_url }))); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Articles
router.get('/articles', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM articles');
    const articles = rows.map(record);
    articles.forEach(article => { article.content = sanitizeArticleHtml(article.content); });
    
    if (articles.length > 0) {
      const articleIds = articles.map(a => a.id);
      const placeholders = articleIds.map(() => '?').join(',');
      
      const [tagRows] = await db.execute(`SELECT m.article_id, t.id, t.name, t.slug FROM article_tag_map m JOIN article_tags t ON m.tag_id = t.id WHERE m.article_id IN (${placeholders})`, articleIds);
      const [attRows] = await db.execute(`SELECT id, article_id, file_id, original_name, mime_type, size, storage_provider FROM article_attachments WHERE article_id IN (${placeholders})`, articleIds);
      
      const tagsByArticle = {};
      tagRows.forEach(r => {
        if (!tagsByArticle[r.article_id]) tagsByArticle[r.article_id] = [];
        tagsByArticle[r.article_id].push({ id: r.id, name: r.name, slug: r.slug });
      });
      
      const attsByArticle = {};
      attRows.forEach(r => {
        if (!attsByArticle[r.article_id]) attsByArticle[r.article_id] = [];
        const origin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`).replace(/\/$/, '');
        attsByArticle[r.article_id].push({ id: r.id, fileId: r.file_id, originalName: r.original_name, mimeType: r.mime_type, size: Number(r.size), url: r.storage_provider === 'KROOMBOX_CDN' ? `${origin}/assets/${encodeURIComponent(r.file_id)}/access` : `${origin}/files/${encodeURIComponent(r.file_id)}` });
      });
      
      articles.forEach(a => {
        a.tagList = tagsByArticle[a.id] || [];
        a.attachments = attsByArticle[a.id] || [];
      });
    }
    
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Article categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM article_categories ORDER BY name ASC');
    res.json(rows.map(record));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Article tags
router.get('/tags', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM article_tags ORDER BY name ASC');
    res.json(rows.map(record));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Both legacy GET and the UI POST use the same MySQL serializer.
router.get('/getRepoFiles', requireSession, async (req, res, next) => {
  try { res.json(await listRepository(req.user, false, process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`)); } catch (error) { next(error); }
});
router.get('/getAdminRepoData', requireSession, async (req, res, next) => {
  try { res.json(await listRepository(req.user, true, process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}/api`)); } catch (error) { next(error); }
});
export default router;
