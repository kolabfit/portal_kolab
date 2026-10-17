import express from 'express';
import pool from '../lib/db.js';
import axios from 'axios';
import crypto from 'node:crypto';
import { requireSession } from '../lib/session.js';
import { record } from '../lib/serializers.js';
import { saveProfile } from '../lib/profile.js';
import { repositoryActions, repositoryAction } from '../lib/repository.js';
import { manageInternship } from '../lib/internships.js';
import { saveArticleRelations } from '../lib/articleRelations.js';
import { validateArticleContent } from '../lib/articleHtml.js';

const router = express.Router();
const GAS_URL = process.env.GAS_URL;

const generatedId = (prefix, id) => id || `${prefix}-${crypto.randomUUID()}`;
const json = value => JSON.stringify(value || {});
const slugify = value => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

async function proxyToGas(payload, action) {
  if (!GAS_URL) throw new Error('GAS_URL belum dikonfigurasi untuk integrasi Google Meet.');
  const response = await axios.post(GAS_URL, action ? { ...payload, action } : payload, { timeout: 20000 });
  return response.data;
}

router.post('/', requireSession, async (req, res) => {
  const payload = req.body || {};
  const { action, type } = payload;
  const id = payload.id || (type === 'add' || action === 'addAnnouncement' ? generatedId(action === 'manageInternship' ? 'internship' : 'item') : undefined);
  let data = payload.data || (action === 'updateAssets' ? payload : {});

  let db;
  try {
    if (repositoryActions.includes(action)) return res.json(await repositoryAction(req));
    const adminActions = ['getStudents', 'getLecturers', 'manageMember', 'bulkManageMembers', 'manageInternshipsBulk', 'updateMemberStorage', 'manageStartup', 'updateAssets', 'manageCategory', 'manageTag', 'manageYPlaylist', 'yplaylistAction', 'manageTvLive', 'tvliveAction', 'manageInternship'];
    if (adminActions.includes(action) && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', message: 'Akses admin diperlukan.' });
    db = await pool.getConnection();
    await db.beginTransaction();
    const success = async result => {
      if (!['getStudents', 'getLecturers'].includes(action)) {
        await db.execute('INSERT INTO system_logs (timestamp,action,user_id,details) VALUES (NOW(),?,?,?)', [action, req.user.id, JSON.stringify({
          id: id || payload.targetId || null,
          type,
          bulkAction: action === 'bulkManageMembers' ? payload.bulkAction : undefined,
          requested: action === 'bulkManageMembers' && Array.isArray(payload.members) ? payload.members.length : undefined
        })]);
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
    const collection = { manageStartup: 'startup_teams', manageInformasi: 'information', manageSchedule: 'schedules', scheduleAction: 'schedules', manageEvent: 'events', eventAction: 'events', manageArticle: 'articles', articleAction: 'articles', manageCategory: 'article_categories', manageTag: 'article_tags', manageTvLive: 'tvlive', tvliveAction: 'tvlive', manageYPlaylist: 'yplaylists', yplaylistAction: 'yplaylists' }[action];
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
      case 'manageInternship':
        await manageInternship(db, type, id, data);
        return await success({ status: 'success', id });

      case 'manageInternshipsBulk': {
        const operation = String(payload.operation || '');
        const rows = Array.isArray(payload.internships) ? payload.internships : [];
        if (!['create', 'status', 'delete'].includes(operation) || !rows.length || rows.length > 500) {
          throw Object.assign(new Error('Operasi bulk magang atau data tidak valid.'), { status: 400 });
        }
        // Validate every target before mutation, including requests sent outside the UI.
        if (payload.role !== undefined && payload.role !== 'STUDENT') {
          throw Object.assign(new Error('Aksi magang hanya berlaku untuk mahasiswa.'), { status: 400 });
        }
        for (const row of rows) {
          if (!row || (row.role !== undefined && row.role !== 'STUDENT') || typeof row.studentNim !== 'string' || !row.studentNim.trim()) {
            throw Object.assign(new Error('Target aksi magang harus mahasiswa.'), { status: 400 });
          }
          const [[student]] = await db.execute('SELECT nim FROM students WHERE nim=? FOR UPDATE', [row.studentNim.trim()]);
          if (!student) throw Object.assign(new Error('Mahasiswa tidak ditemukan di User Directory.'), { status: 400 });
        }
        const seenStudents = new Set();
        let affected = 0;
        if (operation === 'create') {
          for (const row of rows) {
            if (!row || seenStudents.has(row.studentNim)) throw Object.assign(new Error('Mahasiswa duplicate dalam batch.'), { status: 400 });
            seenStudents.add(row.studentNim);
            await manageInternship(db, 'add', generatedId('internship'), row);
            affected += 1;
          }
        } else {
          for (const row of rows) {
            const studentNim = String(row.studentNim || '').trim();
            if (!studentNim || seenStudents.has(studentNim)) throw Object.assign(new Error('Mahasiswa duplicate atau tidak valid.'), { status: 400 });
            seenStudents.add(studentNim);
            const [[internship]] = await db.execute(`SELECT id FROM internships WHERE student_nim=?
              ORDER BY CASE status WHEN 'ONGOING' THEN 0 WHEN 'PLANNED' THEN 1 WHEN 'COMPLETED' THEN 2 ELSE 3 END,
              start_date DESC, created_at DESC, id DESC LIMIT 1 FOR UPDATE`, [studentNim]);
            if (!internship) throw Object.assign(new Error(`Data magang tidak ditemukan untuk ${studentNim}.`), { status: 400 });
            if (operation === 'status') {
              if (!['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(row.status)) throw Object.assign(new Error('Status magang tidak valid.'), { status: 400 });
              await db.execute('UPDATE internships SET status=? WHERE id=?', [row.status, internship.id]);
            } else {
              await db.execute('DELETE FROM internships WHERE id=?', [internship.id]);
            }
            affected += 1;
          }
        }
        return await success({ status: 'success', operation, affected, requested: rows.length });
      }

      case 'getStudents': {
        const [students] = await db.execute(`SELECT s.*, i.id AS internship_id, i.startup_id AS internship_startup_id,
          i.status AS internship_status, i.start_date AS internship_start_date, i.end_date AS internship_end_date,
          it.name AS internship_startup_name
          FROM students s
          LEFT JOIN internships i ON i.id = (
            SELECT latest.id FROM internships latest
            WHERE latest.student_nim = s.nim
            ORDER BY CASE latest.status WHEN 'ONGOING' THEN 0 WHEN 'PLANNED' THEN 1 WHEN 'COMPLETED' THEN 2 ELSE 3 END,
              latest.start_date DESC, latest.created_at DESC, latest.id DESC LIMIT 1
          )
          LEFT JOIN startup_teams it ON it.id = i.startup_id
          ORDER BY s.created_at DESC`);
        let workloadStats = [];
        try {
          [workloadStats] = await db.execute(`SELECT member_id, 
          SUM(w.status='ACTIVE') AS active_load, COUNT(*) AS total_history,
          SUM(w.status='ACTIVE' AND w.category='PKM') AS pkm_load,
          SUM(w.status='ACTIVE' AND w.category='PROJECT') AS project_load,
          SUM(w.status='ACTIVE' AND w.category='RESEARCH') AS research_load,
          SUM(w.status='ACTIVE' AND w.category='COMPETITION') AS competition_load
          FROM workload_members wm JOIN workloads w ON w.id=wm.workload_id
          WHERE wm.member_role='STUDENT'
          GROUP BY member_id`);
        } catch (error) {
          if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
        }
        const workloadMap = new Map(workloadStats.map(row => [row.member_id, {
          activeLoad: Number(row.active_load || 0), totalHistory: Number(row.total_history || 0),
          categoryLoad: { PKM: Number(row.pkm_load || 0), PROJECT: Number(row.project_load || 0), RESEARCH: Number(row.research_load || 0), COMPETITION: Number(row.competition_load || 0) }
        }]));
        return await success(students.map(user => ({
          studentId: user.nim, name: user.name, email: user.email, avatar: user.avatar, role: 'STUDENT',
          studentType: user.type, customQuota: user.custom_quota, customMaxUpload: user.custom_max_upload,
          startupId: user.startup_id, startupPosition: user.type === 'STARTUP' && user.startup_id ? user.startup_position : null, studentJobDesk: user.job_desk,
          isIntern: !!user.internship_id,
          internshipId: user.internship_id || null,
          internshipStatus: user.internship_status || null,
          internshipStartupId: user.internship_startup_id || null,
          internshipStartupName: user.internship_startup_name || null,
          internshipStartDate: user.internship_start_date || null,
          internshipEndDate: user.internship_end_date || null,
          isApproved: !!user.is_approved, isActive: !!user.is_active,
          workload: workloadMap.get(user.nim) || { activeLoad: 0, totalHistory: 0, categoryLoad: { PKM: 0, PROJECT: 0, RESEARCH: 0, COMPETITION: 0 } }
        })));
      }

      case 'getLecturers': {
        const [lecturers] = await db.execute('SELECT * FROM lecturers ORDER BY created_at DESC');
        let workloadStats = [];
        let supervisionStats = [];
        try {
          [workloadStats] = await db.execute(`SELECT member_id, 
          SUM(w.status='ACTIVE') AS active_load, COUNT(*) AS total_history,
          SUM(w.status='ACTIVE' AND w.category='PKM') AS pkm_load,
          SUM(w.status='ACTIVE' AND w.category='PROJECT') AS project_load,
          SUM(w.status='ACTIVE' AND w.category='RESEARCH') AS research_load,
          SUM(w.status='ACTIVE' AND w.category='COMPETITION') AS competition_load
          FROM workload_members wm JOIN workloads w ON w.id=wm.workload_id
          WHERE wm.member_role='LECTURER'
          GROUP BY member_id`);
          
          [supervisionStats] = await db.execute(`
            SELECT nip, COUNT(DISTINCT id) AS supervision_count 
            FROM (
              SELECT academic_supervisor_nip AS nip, id FROM internships WHERE academic_supervisor_nip IS NOT NULL AND status IN ('ONGOING', 'PLANNED')
              UNION ALL
              SELECT academic_supervisor2_nip AS nip, id FROM internships WHERE academic_supervisor2_nip IS NOT NULL AND status IN ('ONGOING', 'PLANNED')
            ) AS combined
            GROUP BY nip
          `);
        } catch (error) {
          if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
        }
        const workloadMap = new Map(workloadStats.map(row => [row.member_id, {
          activeLoad: Number(row.active_load || 0), totalHistory: Number(row.total_history || 0),
          categoryLoad: { PKM: Number(row.pkm_load || 0), PROJECT: Number(row.project_load || 0), RESEARCH: Number(row.research_load || 0), COMPETITION: Number(row.competition_load || 0) }
        }]));
        const supervisionMap = new Map(supervisionStats.map(row => [row.nip, Number(row.supervision_count || 0)]));
        return await success(lecturers.map(user => ({
          studentId: user.nip, name: user.name, email: user.email, avatar: user.avatar,
          role: 'LECTURER', lecturerCode: user.code, customQuota: user.custom_quota, customMaxUpload: user.custom_max_upload,
          lecturerJobDesks: JSON.parse(user.job_desks || '[]'),
          supervisionCount: supervisionMap.get(user.nip) || 0,
          isApproved: !!user.is_approved, isActive: !!user.is_active,
          workload: workloadMap.get(user.nip) || { activeLoad: 0, totalHistory: 0, categoryLoad: { PKM: 0, PROJECT: 0, RESEARCH: 0, COMPETITION: 0 } }
        })));
      }

      case 'manageStartup':
        if (type === 'delete') {
          const [members] = await db.execute('SELECT nim FROM students WHERE startup_id=? FOR UPDATE', [id]);
          for (const member of members) await saveProfile(db, 'STUDENT', member.nim, { studentType: 'NON_STARTUP', startupId: null }, true, req.user.id);
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
          await saveProfile(db, payload.role, memberId, data, true, req.user.id);
        } else {
          return res.status(400).json({ status: 'error', message: 'Operasi member tidak valid.' });
        }
        return await success({ status: 'success', id });
      }

      case 'bulkManageMembers': {
        const actionType = String(payload.bulkAction || '');
        const selectedMembers = Array.isArray(payload.members) ? payload.members : [];
        const allowedActions = ['approve', 'unapprove', 'activate', 'deactivate', 'delete', 'edit'];
        if (!allowedActions.includes(actionType) || selectedMembers.length === 0 || selectedMembers.length > 500) {
          throw Object.assign(new Error('Aksi bulk atau daftar member tidak valid.'), { status: 400 });
        }
        if (payload.data?.startupPosition !== undefined) {
          if (payload.data.startupPosition !== 'MEMBER' || selectedMembers.some(m => m.role !== 'STUDENT')) throw Object.assign(new Error('Bulk posisi hanya mendukung Anggota untuk mahasiswa.'), { status: 400 });
          const targetStartups = new Set();
          for (const member of selectedMembers) {
            const [[current]] = await db.execute('SELECT type,startup_id FROM students WHERE nim=? FOR UPDATE', [member.id]);
            const target = payload.data.startupId || current?.startup_id;
            if (!target || (payload.data.studentType || current?.type) !== 'STARTUP') throw Object.assign(new Error('Mahasiswa harus tergabung dalam startup.'), { status: 400 });
            targetStartups.add(target);
          }
          if (targetStartups.size !== 1) throw Object.assign(new Error('Bulk posisi harus pada startup yang sama.'), { status: 400 });
        }
        let affected = 0;
        for (const member of selectedMembers) {
          if (!['STUDENT', 'LECTURER'].includes(member.role) || !member.id) {
            throw Object.assign(new Error('Identitas member tidak valid.'), { status: 400 });
          }
          const table = member.role === 'STUDENT' ? 'students' : 'lecturers';
          const idField = member.role === 'STUDENT' ? 'nim' : 'nip';
          let result;
          if (actionType === 'edit') {
            const data = payload.data && typeof payload.data === 'object' ? { ...payload.data } : {};
            delete data.nim;
            delete data.nip;
            delete data.role;
            if (data.password === '') delete data.password;
            if (member.role === 'STUDENT' && data.studentType === 'STARTUP') {
              if (!data.startupId) {
                const [[currentStudent]] = await db.execute('SELECT startup_id FROM students WHERE nim=?', [member.id]);
                data.startupId = currentStudent?.startup_id || '';
              }
              const [[startup]] = await db.execute('SELECT id FROM startup_teams WHERE id=? OR LOWER(name)=LOWER(?) LIMIT 1', [data.startupId || '', data.startupId || '']);
              if (!startup) throw Object.assign(new Error(`Startup tidak ditemukan untuk ${member.id}.`), { status: 400 });
              data.startupId = startup.id;
            }
            if (member.role === 'STUDENT' && data.studentType === 'NON_STARTUP') data.startupId = null;
            await saveProfile(db, member.role, member.id, data, true, req.user.id);
            affected += 1;
            continue;
          }
          if (actionType === 'delete') {
            [result] = await db.execute(`DELETE FROM ${table} WHERE ${idField}=?`, [member.id]);
          } else {
            const field = actionType === 'approve' || actionType === 'unapprove' ? 'is_approved' : 'is_active';
            const value = ['approve', 'activate'].includes(actionType) ? 1 : 0;
            [result] = await db.execute(`UPDATE ${table} SET ${field}=? WHERE ${idField}=?`, [value, member.id]);
          }
          affected += result.affectedRows || 0;
        }
        return await success({ status: 'success', affected, requested: selectedMembers.length });
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

      case 'manageTag': {
        if (type === 'delete') {
          await db.execute('DELETE FROM article_tags WHERE id=?', [id]);
        } else {
          const name = String(data.name || '').trim();
          if (!name) throw Object.assign(new Error('Nama tag wajib diisi.'), { status: 400 });
          const slug = slugify(name);
          if (!slug) throw Object.assign(new Error('Nama tag tidak valid.'), { status: 400 });

          if (type === 'add') {
          await db.execute(
            'INSERT INTO article_tags (id, name, slug) VALUES (?, ?, ?)',
            [generatedId('tag', id), name, slug]
          );
          } else {
            await db.execute(
              'UPDATE article_tags SET name=?, slug=? WHERE id=?',
              [name, slug, id]
            );
          }
        }
        return await success({ status: 'success', id });
      }

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
        if (type !== 'delete') data.content = validateArticleContent(data.content);
        if (type === 'delete') {
          await db.execute('DELETE FROM article_tag_map WHERE article_id=?', [id]);
          await db.execute('DELETE FROM article_attachments WHERE article_id=?', [id]);
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
        if (type !== 'delete') await saveArticleRelations(db, id, data, req.user);
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
    const status = error.status || 500;
    const isDev = process.env.NODE_ENV === 'development';
    const message = status < 500 ? error.message : (isDev ? error.message : 'Terjadi kesalahan saat memproses permintaan.');
    return res.status(status).json({ status: 'error', message, ...(error.field ? { error: error.error, field: error.field } : {}) });
  } finally { if (db) { await db.rollback(); db.release(); } }
});

export default router;

