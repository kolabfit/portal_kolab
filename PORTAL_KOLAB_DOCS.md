# 🏢 Portal Ko+Lab - Dokumentasi Aplikasi

## 📖 Deskripsi Umum
**Portal Ko+Lab** adalah sebuah platform sistem informasi terpadu (berbasis web) yang berfungsi sebagai pusat manajemen ekosistem inovasi, startup, dan magang di bawah naungan **Ko+Lab Creative Hub** (atau institusi terkait). Aplikasi ini menjembatani interaksi antara Mahasiswa (peserta magang/anggota startup), Dosen (pembimbing/pembina), dan Admin/HR.

Aplikasi ini mencakup berbagai modul untuk melacak status kegiatan, mengelola repository file secara tersentralisasi, serta mengatur konten portal (artikel, jadwal meeting, streaming, dll).

## 🛠️ Stack Teknologi (Tech Stack)
- **Frontend**: React (dengan Vite), TypeScript, Tailwind CSS, Lucide React (untuk ikon).
- **Backend**: Node.js (Express.js), MySQL/MariaDB (menggunakan mysql2).
- **File Storage/CDN**: Terintegrasi dengan **Kroombox CDN** untuk manajemen penyimpanan file repository dan media.
- **Integrasi Pihak Ketiga**: Google Apps Script (GAS) untuk pembuatan link Google Meet secara otomatis (generateMeetLink).

## 👥 Peran Pengguna (Role System)
Aplikasi ini menggunakan sistem akses berbasis peran (Role-Based Access Control):
1. **Admin / HR**: Mengelola seluruh pengguna, konten aplikasi (artikel, jadwal, informasi), mengatur kuota repository, dan memantau seluruh aktivitas startup & magang.
2. **Student (Mahasiswa / Peserta Magang)**: Dapat berupa anggota **Startup** atau peserta magang biasa. Memiliki akses ke repository file, profil, dan informasi/jadwal yang diberikan.
3. **Lecturer (Dosen)**: Bertindak sebagai Pembina Startup atau Dosen Pembimbing Akademik/Lapangan. Memiliki akses untuk memantau status mahasiswa, mengelola startup binaan, beban kerja (workload), dan file repository.

## 🚀 Fitur Utama (Core Features)

### 1. Manajemen Anggota & Profil (Member Management)
- **ProfileView**: Pengguna dapat memperbarui profil, mengubah foto (terintegrasi dengan CDN), dan melihat beban kerja.
- **MemberManagementView (Admin)**: Admin dapat menambahkan/menghapus pengguna, melakukan *bulk actions*, mengatur status approval (untuk dosen), serta mengelola kuota *storage* per pengguna.

### 2. Status & Magang Mahasiswa (Student Status & Internship)
- **StudentStatusView**: Menampilkan detail status mahasiswa, apakah mereka bagian dari Startup (CEO, CTO, Member) atau Non-Startup (Magang biasa). Menampilkan metrik beban kerja.
- **InternshipManagement**: Manajemen status pendaftaran magang mahasiswa.

### 3. Manajemen Startup (Startup Hub)
- **LecturerStartupsView**: Dosen dapat memantau perkembangan startup yang dibinanya.
- Pengelolaan tim startup, role mahasiswa di dalam startup, serta detail startup (nama, logo, dll).

### 4. Sistem Repository & Storage Tersentralisasi (RepoView)
- **RepoView**: Fitur semacam Google Drive internal untuk mengunggah, membagikan, dan mengelola dokumen, gambar, atau arsip.
- Mendukung sistem hirarki folder.
- **CDN Integration**: File yang diunggah disimpan di *Kroombox CDN* (cdn_assets table dan API) dengan mekanisme sinkronisasi database (epoCdnSync.js) yang kebal terhadap masalah *collation* (sudah di-*patch*).
- **Manajemen Kuota**: Admin dapat membatasi ukuran maksimal file (maxUpload) dan total penyimpanan (customQuota) untuk masing-masing dosen/mahasiswa.

### 5. Manajemen Konten & Informasi (CMS)
- **InformasiView / Announcements**: Pengumuman penting untuk seluruh ekosistem.
- **ArticleView & ContentManagementView**: Pembuatan dan publikasi artikel/blog, terintegrasi dengan penambahan tag dinamis (*Article Tags*).
- **NewsView**: Menampilkan berita terbaru.

### 6. Penjadwalan & Rapat (Meetings & Events)
- **MeetingsView**: Pembuatan jadwal rapat atau bimbingan.
- **Integrasi Google Meet**: Dapat meng-*generate* tautan Google Meet secara otomatis via Google Apps Script (GAS) API.
- **EventsView**: Pengelolaan acara berskala besar (webinar, pameran).

### 7. Streaming & Media (Streaming Hub)
- **StreamingView**: Integrasi tayangan TV Live atau YouTube Playlists yang dapat dikelola oleh Admin dan ditonton langsung dari dalam portal.

## 🗄️ Struktur Database Inti
Aplikasi ini menggunakan beberapa tabel utama, di antaranya:
- dmins, students, lecturers: Menyimpan data autentikasi dan profil untuk masing-masing peran.
- startup_teams: Data profil startup.
- internships: Data magang mahasiswa.
- epo & cdn_assets: Tabel krusial untuk sinkronisasi metadata file antara sistem lokal dan Kroombox CDN.
- rticles, rticle_tags, rticle_categories: Untuk sistem manajemen konten.

## 💡 Catatan Penting untuk AI Selanjutnya
- **Environment**: Jika terjadi *error* pada tahap *production/hosting* yang tidak terjadi di *localhost*, kemungkinan besar disebabkan oleh perbedaan MySQL collation (misal: utf8mb4_unicode_ci vs utf8mb4_0900_ai_ci). Selalu pastikan menggunakan COLLATE utf8mb4_unicode_ci pada *query* JOIN.
- **Upload File**: Seluruh proses *upload* menggunakan modul ridge.js yang meneruskan *action* (seperti uploadFile) ke fungsi spesifik di epository.js atau ssets.js, yang selanjutnya berkomunikasi dengan server CDN.
