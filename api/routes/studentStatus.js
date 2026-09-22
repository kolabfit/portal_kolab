import express from 'express';
import db from '../lib/db.js';
import { requireSession } from '../lib/session.js';
import { record } from '../lib/serializers.js';
const router = express.Router();
router.use(requireSession);
router.use((req,res,next) => req.user.role === 'STUDENT' ? next() : res.status(403).json({message:'Akses mahasiswa diperlukan.'}));
router.get('/me/status', async (req,res,next) => {
 try {
 const nim=req.user.id;
 const [[s]]=await db.execute(`SELECT s.nim,s.name,s.is_active,s.is_approved,s.type,s.job_desk,s.startup_position,
 t.id AS startup_id,t.name AS startup_name,t.logo,t.website,t.ig
 FROM students s LEFT JOIN startup_teams t ON t.id=s.startup_id WHERE s.nim=?`,[nim]);
 if (!s) return res.status(404).json({message:'Mahasiswa tidak ditemukan.'});
 const [internships]=await db.execute(`SELECT i.id,i.status,i.startup_id,t.name AS startup_name,i.start_date,i.end_date,
 i.field_supervisor,i.academic_supervisor_nip,l.name AS academic_supervisor_name,
 i.academic_supervisor2_nip,l2.name AS academic_supervisor2_name
 FROM internships i LEFT JOIN startup_teams t ON t.id=i.startup_id
 LEFT JOIN lecturers l ON l.nip=i.academic_supervisor_nip LEFT JOIN lecturers l2 ON l2.nip=i.academic_supervisor2_nip
 WHERE i.student_nim=? ORDER BY i.end_date DESC,i.start_date DESC,i.id`,[nim]);
 const history=internships.map(record);
 const current=['ONGOING','PLANNED','COMPLETED','CANCELLED'].map(status=>history.find(i=>i.status===status)).find(Boolean)||null;
 const [rows]=await db.execute(`SELECT w.id,w.name,w.category,w.description,w.status,w.start_date,w.end_date,
 wm.job_desk,w.pic_role,COALESCE(s.name,l.name) AS pic_name
 FROM workload_members wm JOIN workloads w ON w.id=wm.workload_id
 LEFT JOIN students s ON w.pic_role='STUDENT' AND s.nim=w.pic_id
 LEFT JOIN lecturers l ON w.pic_role='LECTURER' AND l.nip=w.pic_id
 WHERE wm.member_id=? AND wm.member_role='STUDENT' ORDER BY w.start_date DESC,w.id`,[nim]);
 const workloads=rows.map(record), active=workloads.filter(w=>w.status==='ACTIVE');
 const completed=workloads.filter(w=>['COMPLETED','CANCELLED'].includes(w.status));
 res.set('Cache-Control','no-store').json({profile:{nim:s.nim,name:s.name},
 membership:{isActive:Boolean(s.is_active),isApproved:Boolean(s.is_approved),studentType:s.type,jobDesk:s.job_desk},
 startup:s.type==='STARTUP' && s.startup_id?{position:s.startup_position,id:s.startup_id,name:s.startup_name,logoUrl:s.logo,website:s.website,instagram:s.ig}:null,
 internship:{current,history},workload:{activeLoad:active.length,totalHistory:completed.length,
 categoryLoad:Object.fromEntries(['PKM','PROJECT','RESEARCH','COMPETITION'].map(c=>[c,active.filter(w=>w.category===c).length])),
 active,history:completed,planned:workloads.filter(w=>w.status==='PLANNED')}});
 } catch(e) {next(e);}
});
export default router;
