import db from '../lib/db.js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const GAS_URL = process.env.GAS_URL;

async function migrate() {
  if (!GAS_URL) {
    console.error('Error: GAS_URL not found in .env');
    return;
  }

  // List of standard fetch actions from backend.gs
  const actions = [
    'getAssets', 'getAnnouncements', 'getStartups', 
    'getInformasi', 'getSchedules', 'getEvents', 
    'getArticles', 'getCategories'
  ];

  console.log('--- Starting Migration from Google Sheets ---');

  for (const action of actions) {
    console.log(`Pulling [${action}]...`);
    try {
      const response = await axios.get(`${GAS_URL}?action=${action}`);
      const data = response.data;

      if (action === 'getAssets') {
        const d = data;
         await db.execute(
          'INSERT INTO assets (bg_front, bg_back, logo_url, student_policy, lecturer_policy, admin_youtube, admin_spotify) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [d.bgFront, d.bgBack, d.logoUrl, JSON.stringify(d.studentPolicy), JSON.stringify(d.lecturerPolicy), d.adminYoutube, d.adminSpotify]
        );
      } else if (action === 'getAnnouncements') {
        for (const itm of data) {
           await db.execute(
            'INSERT INTO announcements (id, author, title, content, created_at, target_type, target_value) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=?',
            [itm.id, itm.author, itm.title, itm.content, itm.createdAt, itm.target?.type, itm.target?.value, itm.title]
          );
        }
      } else if (action === 'getSchedules') {
        for (const itm of data) {
           await db.execute(
            'INSERT INTO schedules (id, title, date, time, location_offline, location_online, meet_link, organizer, description, end_time, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=?',
            [itm.id, itm.title, itm.date, itm.time, itm.locationOffline, itm.locationOnline, itm.meetLink, itm.organizer, itm.description, itm.endTime, itm.author, itm.title]
          );
        }
      } else if (action === 'getEvents') {
        for (const itm of data) {
           await db.execute(
            'INSERT INTO events (id, title, date, image_url, description, location_offline, location_online, max_participants, status, tags, meet_link, time, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=?',
            [itm.id, itm.title, itm.date, itm.image, itm.description, itm.locationOffline, itm.locationOnline, itm.maxParticipants, itm.status, (itm.tags || []).join(','), itm.meetLink, itm.time, itm.author, itm.title]
          );
        }
      } else if (action === 'getArticles') {
        for (const itm of data) {
           await db.execute(
            'INSERT INTO articles (id, title, content, date, author, tags, category_id, image_url, video_url, other_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=?',
            [itm.id, itm.title, itm.content, itm.date, itm.author, (itm.tags || []).join(','), itm.categoryId, itm.imageUrl, itm.videoUrl, itm.otherUrl, itm.title]
          );
        }
      }
      
      console.log(`Finished [${action}]`);
    } catch (e) {
      console.error(`Failed to migrate ${action}:`, e.message);
    }
  }

  // Specially handle Photobooth if we have its URL
  const PHOTOBOOTH_GAS = "https://script.google.com/macros/s/AKfycbxcSs47NFiYCG7t0FiKbwfxvBg_D_48mzkWN8v_1HNYx-lDx87UyOsvbpsFHgEO7Ko6/exec";
  console.log('Pulling Photobooth Settings...');
  try {
    const pbRes = await axios.get(`${PHOTOBOOTH_GAS}?action=getAll`);
    const pbData = pbRes.data;
    const categories = ['config', 'icons', 'frames', 'filters', 'backgrounds'];
    for (const cat of categories) {
      if (pbData[cat]) {
        const jsonData = JSON.stringify(pbData[cat]);
        await db.execute(
          'INSERT INTO photobooth_settings (category, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?',
          [cat, jsonData, jsonData]
        );
      }
    }
    console.log('Finished Photobooth Settings');
  } catch (e) {
    console.error('Failed to migrate Photobooth:', e.message);
  }

  console.log('--- Migration Completed ---');
  process.exit(0);
}

migrate();
 Greenland
