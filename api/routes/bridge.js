import express from 'express';
import pool from '../lib/db.js';
import axios from 'axios';
import crypto from 'node:crypto';
import { requireSession } from '../lib/session.js';
import { record } from '../lib/serializers.js';
import { saveProfile } from '../lib/profile.js';
import { repositoryActions, repositoryAction } from '../lib/repository.js';

const router = express.Router();
const GAS_URL = process.env.GAS_URL;

const generatedId = (prefix, id) => id || `${prefix}-${crypto.randomUUID()}`;
const json = value => JSON.stringify(value || {});

async function proxyToGas(payload, action) {
  if (!GAS_URL) throw new Error('GAS_URL belum dikonfigurasi untuk integrasi Google Meet.');
  const response = await axios.post(GAS_URL, action ? { ...payload, action } : payload, { timeout: 20000 });
  return response.data;
}

router.post('/', requireSession, async (req, res) => {
  const payload = req.body || {};
  const { action, type } = payload;
  const id = payload.id || (type === 'add' || action === 'addAnnouncement' ? generatedId('item') : undefined);
  let data = payload.data || (action === 'updateAssets' ? payload : {});

  let db;
  try {
    if (repositoryActions.includes(action)) return res.json(await repositoryAction(req));
    const adminActions = ['getAllMembers', 'manageMember', 'updateMemberStorage', 'manageStartup', 'updateAssets', 'manageCategory', 'manageYPlaylist', 'yplaylistAction', 'manageTvLive', 'tvliveAction'];
    if (adminActions.includes(action) && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' });
    db = await pool.getConnection();
    await db.beginTransaction();
    const success = async result => {
      if (action !== 'getAllMembers') {
        await db.execute('INSERT INTO system_logs (timestamp,action,user_id,details) VALUES (NOW(),?,?,?)', [action, req.user.id, JSON.stringify({ id: id || payload.targetId || null, type })]);
        const notificationType = { manageSchedule: 'SCHEDULE', scheduleAction: 'SCHEDULE', manageInformasi: 'INFO', addAnnouncement: 'ANNOUNCEMENT' }[action];
        if (notificationType && (type === 'add' || action === 'addAnnouncement')) await db.execute('INSERT INTO notifications (id,type,title,message,timestamp) VALUES (?,?,?,?,NOW())', [crypto.randomUUID(), notificationType, 'Pembaruan portal', 'Konten baru tersedia di portal.']);
      }
      await db.commit();
      return res.json(result);
    };
    if (action === 'updateProfile') {
      await saveProfile(db, req.user.role, req.user.role === 'ADMIN' ? req.user.username : req.user.id, payload);
      return await success({ status: 'success', id });
    }
    const collection = { manageStartup: 'startup_teams', manageInformasi: 'information', manageSchedule: 'schedules', scheduleAction: 'schedules', manageEvent: 'events', eventAction: 'events', manageArticle: 'articles', articleAction: 'articles', manageCategory: 'article_categories', manageTvLive: 'tvlive', tvliveAction: 'tvlive', manageYPlaylist: 'yplaylists', yplaylistAction: 'yplaylists' }[action];
    if (collection) {
      if (!['add', 'edit', 'delete'].includes(type)) throw Object.assign(new Error('Operasi tidak valid.'), { status: 400 });
      if (type !== 'add') {
        const field = collection === 'yplaylists' ? 'playlist_id' : 'id';
        const [[existing]] = await db.execute(`SELECT * FROM ${collection} WHERE ${field}=? FOR UPDATE`, [id || '']);
        if (!existing) throw Object.assign(new Error('Data tidak ditemukan.'), { status: 404 });
        if (type === 'edit') data = { ...record(existing), ...(collection === 'events' ? { image: existing.image_url } : {}), ...(collection === 'startup_teams' ? { logoUrl: existing.logo } : {}), ...data };
      }
    }
    if (data.date) data.date = String(data.date).replace('T', ' ').replace(/Z$/, '').slice(0, 19);
    switch (action) {
      case 'getAllMembers': {
        const [students] = await db.execute('SELECT * FROM students ORDER BY created_at DESC');
        const [lecturers] = await db.execute('SELECT * FROM lecturers ORDER BY created_at DESC');
        return await success([
          ...students.map(user => ({
            studentId: user.nim, name: user.name, email: user.email, avatar: user.avatar, role: 'STUDENT',
            studentType: user.type, customQuota: user.custom_quota, customMaxUpload: user.custom_max_upload,
            startupId: user.startup_id, studentJobDesk: user.job_desk,
            isApproved: !!user.is_approved, isActive: !!user.is_active
          })),
          ...lecturers.map(user => ({
            studentId: user.nip, name: user.name, email: user.email, avatar: user.avatar,
            role: 'LECTURER', lecturerCode: user.code, customQuota: user.custom_quota, customMaxUpload: user.custom_max_upload,
            lecturerJobDesks: JSON.parse(user.job_desks || '[]'),
            isApproved: !!user.is_approved, isActive: !!user.is_active
          }))
        ]);
      }

      case 'manageStartup':
        if (type === 'delete') {
          await db.execute('DELETE FROM startup_teams WHERE id=?', [id]);
        } else if (type === 'add') {
          await db.execute(
            'INSERT INTO startup_teams (id, name, website, ig, tiktok, linkedin, logo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [generatedId('startup', id), data.name, data.website || '', data.ig || '', data.tiktok || '', data.linkedin || '', data.logoUrl || '']
          );
        } else {
          await db.execute(
            'UPDATE startup_teams SET name=?, website=?, ig=?, tiktok=?, linkedin=?, logo=? WHERE id=?',
            [data.name, data.website || '', data.ig || '', data.tiktok || '', data.linkedin || '', data.logoUrl || '', id]
          );
        }
        return await success({ status: 'success', id });

      case 'manageMember': {
        if (!['STUDENT', 'LECTURER'].includes(payload.role)) throw Object.assign(new Error('Peran member tidak valid.'), { status: 400 });
        const memberId = payload.targetId;
        const isStudent = payload.role === 'STUDENT';
        const table = isStudent ? 'students' : 'lecturers';
        const idField = isStudent ? 'nim' : 'nip';
        if (type === 'delete') {
          await db.execute(`DELETE FROM ${table} WHERE ${idField}=?`, [memberId]);
        } else if (type === 'updateIdentity') {
          await saveProfile(db, payload.role, memberId, data, true);
        } else {
          return res.status(400).json({ status: 'error', message: 'Operasi member tidak valid.' });
        }
        return await success({ status: 'success', id });
      }

      case 'updateMemberStorage': {
        if (!['STUDENT', 'LECTURER'].includes(payload.role) || ![payload.customQuota, payload.customMaxUpload].every(value => Number.isSafeInteger(value) && value >= 0)) throw Object.assign(new Error('Kuota tidak valid.'), { status: 400 });
        const isStudent = payload.role === 'STUDENT';
        await db.execute(
          `UPDATE ${isStudent ? 'students' : 'lecturers'} SET custom_quota=?, custom_max_upload=? WHERE ${isStudent ? 'nim' : 'nip'}=?`,
          [payload.customQuota, payload.customMaxUpload, payload.targetId]
        );
        return await success({ status: 'success', id });
      }

      case 'manageInformasi':
        if (type === 'delete') {
          await db.execute('DELETE FROM information WHERE id=?', [id]);
        } else if (type === 'add') {
          await db.execute(
            'INSERT INTO information (id, title, date, description, author, target_type, target_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [generatedId('info', id), data.title, data.date, data.description, data.author, data.targetType, data.targetValue || '']
          );
        } else {
          await db.execute(
            'UPDATE information SET title=?, date=?, description=?, author=?, target_type=?, target_value=? WHERE id=?',
            [data.title, data.date, data.description, data.author, data.targetType, data.targetValue || '', id]
          );
        }
        return await success({ status: 'success', id });

      case 'addAnnouncement':
        await db.execute(
          'INSERT INTO announcements (id, author, title, content, created_at, target_type, target_value) VALUES (?, ?, ?, ?, NOW(), ?, ?)',
          [id, payload.author, payload.title, payload.content, payload.targetType || 'ALL', payload.targetValue || '']
        );
        return await success({ status: 'success', id });

      case 'deleteAnnouncement':
        await db.execute('DELETE FROM announcements WHERE id=?', [payload.id]);
        return await success({ status: 'success', id });

      case 'manageCategory':
        if (type === 'delete') {
          await db.execute('DELETE FROM article_categories WHERE id=?', [id]);
        } else if (type === 'add') {
          await db.execute(
            'INSERT INTO article_categories (id, name) VALUES (?, ?)',
            [generatedId('category', id), data.name]
          );
        } else {
          await db.execute('UPDATE article_categories SET name=? WHERE id=?', [data.name, id]);
        }
        return await success({ status: 'success', id });

      case 'updateAssets': {
        const [rows] = await db.execute('SELECT * FROM assets ORDER BY id LIMIT 1 FOR UPDATE');
        const previous = rows[0] || {};
        for (const [key, column] of Object.entries({ bgFront: 'bg_front', bgBack: 'bg_back', logoUrl: 'logo_url', studentPolicy: 'student_policy', lecturerPolicy: 'lecturer_policy', adminYoutube: 'admin_youtube', adminSpotify: 'admin_spotify' })) {
          if (data[key] === undefined) data[key] = column.endsWith('_policy') ? JSON.parse(previous[column] || '{}') : previous[column] || '';
        }
        const values = [
          data.bgFront || '', data.bgBack || '', data.logoUrl || '',
          json(data.studentPolicy), json(data.lecturerPolicy),
          data.adminYoutube || '', data.adminSpotify || ''
        ];
        if (rows.length) {
          await db.execute(
            'UPDATE assets SET bg_front=?, bg_back=?, logo_url=?, student_policy=?, lecturer_policy=?, admin_youtube=?, admin_spotify=? WHERE id=?',
            [...values, rows[0].id]
          );
        } else {
          await db.execute(
            'INSERT INTO assets (bg_front, bg_back, logo_url, student_policy, lecturer_policy, admin_youtube, admin_spotify) VALUES (?, ?, ?, ?, ?, ?, ?)',
            values
          );
        }
        return await success({ status: 'success', id });
      }

      case 'manageSchedule':
      case 'scheduleAction':
        if (type === 'delete') {
          await db.execute('DELETE FROM schedules WHERE id=?', [id]);
        } else if (type === 'add') {
          await db.execute(
            'INSERT INTO schedules (id, title, date, time, location_offline, location_online, meet_link, organizer, description, end_time, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generatedId('schedule', id), data.title, data.date, data.time, data.locationOffline || '', [true, 1, 'true', 'Yes', 'on'].includes(data.locationOnline), data.meetLink || '', data.organizer || '', data.description || '', data.endTime || null, data.author || '']
          );
        } else {
          await db.execute(
            'UPDATE schedules SET title=?, date=?, time=?, location_offline=?, location_online=?, meet_link=?, organizer=?, description=?, end_time=?, author=? WHERE id=?',
            [data.title, data.date, data.time, data.locationOffline || '', [true, 1, 'true', 'Yes', 'on'].includes(data.locationOnline), data.meetLink || '', data.organizer || '', data.description || '', data.endTime || null, data.author || '', id]
          );
        }
        return await success({ status: 'success', id });

      case 'manageEvent':
      case 'eventAction':
        if (type === 'delete') {
          await db.execute('DELETE FROM events WHERE id=?', [id]);
        } else if (type === 'add') {
          await db.execute(
            'INSERT INTO events (id, title, date, image_url, description, location_offline, location_online, max_participants, status, tags, meet_link, time, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generatedId('event', id), data.title, data.date, data.image || '', data.description || '', data.locationOffline || '', data.locationOnline || '', data.maxParticipants || 0, data.status || 'OPEN', JSON.stringify(Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',').filter(Boolean)), data.meetLink || '', data.time || null, data.author || '']
          );
        } else {
          await db.execute(
            'UPDATE events SET title=?, date=?, image_url=?, description=?, location_offline=?, location_online=?, max_participants=?, status=?, tags=?, meet_link=?, time=?, author=? WHERE id=?',
            [data.title, data.date, data.image || '', data.description || '', data.locationOffline || '', data.locationOnline || '', data.maxParticipants || 0, data.status || 'OPEN', JSON.stringify(Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',').filter(Boolean)), data.meetLink || '', data.time || null, data.author || '', id]
          );
        }
        return await success({ status: 'success', id });

      case 'manageArticle':
      case 'articleAction':
        if (type === 'delete') {
          await db.execute('DELETE FROM articles WHERE id=?', [id]);
        } else if (type === 'add') {
          await db.execute(
            'INSERT INTO articles (id, title, content, date, author, tags, category_id, image_url, video_url, other_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generatedId('article', id), data.title, data.content || '', data.date, data.author || '', JSON.stringify(Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',').filter(Boolean)), data.categoryId || '', data.imageUrl || '', data.videoUrl || '', data.otherUrl || '']
          );
        } else {
          await db.execute(
            'UPDATE articles SET title=?, content=?, date=?, author=?, tags=?, category_id=?, image_url=?, video_url=?, other_url=? WHERE id=?',
            [data.title, data.content || '', data.date, data.author || '', JSON.stringify(Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',').filter(Boolean)), data.categoryId || '', data.imageUrl || '', data.videoUrl || '', data.otherUrl || '', id]
          );
        }
        return await success({ status: 'success', id });

      case 'manageYPlaylist':
      case 'yplaylistAction':
        if (type === 'delete') await db.execute('DELETE FROM yplaylists WHERE playlist_id=?', [id]);
        else await db.execute(
          'INSERT INTO yplaylists (playlist_id, title, thumbnail, published_at, channel_title) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), thumbnail=VALUES(thumbnail), published_at=VALUES(published_at), channel_title=VALUES(channel_title)',
          [data.playlistId || id, data.title, data.thumbnail || '', data.publishedAt ? String(data.publishedAt).replace('T', ' ').replace(/Z$/, '').slice(0, 19) : new Date(), data.channelTitle || 'Manual Hub']
        );
        return await success({ status: 'success', id });

      case 'manageTvLive':
      case 'tvliveAction':
        if (type === 'delete') await db.execute('DELETE FROM tvlive WHERE id=?', [id]);
        else await db.execute(
          'INSERT INTO tvlive (id, title, video_id, thumbnail) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), video_id=VALUES(video_id), thumbnail=VALUES(thumbnail)',
          [generatedId('tv', id), data.title, data.videoId, data.thumbnail || '']
        );
        return await success({ status: 'success', id });

      case 'generateMeetLink':
      case 'autoInviteToMeet':
        try {
          const result = await proxyToGas(payload, action);
          if (result?.status !== 'success') return res.status(502).json({ status: 'error', message: result?.message || 'Integrasi Google gagal.' });
          await db.execute('INSERT INTO integration_results (id,action,user_id,request_data,response_data) VALUES (?,?,?,?,?)', [crypto.randomUUID(), action, req.user.id, JSON.stringify(payload), JSON.stringify(result)]);
          return await success(result);
        } catch (error) {
          return res.status(502).json({ status: 'error', message: `GAS Proxy Error: ${error.message}` });
        }

      default:
        return res.status(400).json({ status: 'error', message: `Action ${action} not implemented in bridge.` });
    }
  } catch (error) {
    if (db) await db.rollback();
    if (!error.status) console.error(`Bridge action [${action}] failed:`, error);
    return res.status(error.status || 500).json({ status: 'error', message: error.message });
  } finally { if (db) { await db.rollback(); db.release(); } }
});

export default router;
