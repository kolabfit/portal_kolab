# Analisis Fitur Portal Kolab

Tanggal analisis: 17 September 2026  
Versi analisis: berdasarkan source code frontend dan backend yang tersedia di workspace.

## 1. Ringkasan aplikasi

Portal Kolab adalah aplikasi portal kampus/komunitas dengan:

- Frontend React + TypeScript + Vite.
- Backend Node.js + Express.
- Database MySQL.
- Google Apps Script sebagai provider eksternal untuk sebagian fitur repository/Google Drive dan Google Meet.
- JWT untuk sesi login.
- Swagger pada `/api-docs`.

Frontend lokal menggunakan:

```text
http://localhost:3000
```

Backend lokal menggunakan:

```text
http://localhost:3001
```

Konfigurasi frontend development diarahkan ke `http://localhost:3001/api`. Pada production, frontend diarahkan ke `https://portal.kolab.top/api`.

## 2. Verifikasi akun dan autentikasi

Tiga akun yang diberikan berhasil diuji melalui `POST /api/auth/login`:

| Role | Identitas | Hasil |
|---|---|---|
| Mahasiswa | NIM `607012330048` | Berhasil, role `STUDENT` |
| Dosen | NIP `232411567` | Berhasil, role `LECTURER` |
| Admin | Username `hrkolab` | Berhasil, role `ADMIN` |

Password tidak ditulis di dokumen ini.

Login menggunakan SHA-256 pada backend. Setelah berhasil, backend mengeluarkan JWT dengan masa berlaku tujuh hari. Token disimpan frontend pada local storage dengan key `portal-kolab.auth-token`.

Saat aplikasi dimuat, frontend memanggil `/api/auth/session` untuk memulihkan sesi. Jika token tidak valid atau akun sudah tidak tersedia, sesi dibersihkan dan pengguna diarahkan ke login.

## 3. Navigasi dan hak akses role

### Mahasiswa dan dosen

Menu utama yang tersedia:

1. Overview
2. Account
3. Mainframe Repo
4. Streaming Hub
5. Informasi
6. Schedule
7. Events
8. Article
9. Broadcast

### Admin

Admin mendapatkan seluruh menu mahasiswa/dosen, ditambah:

10. Management User
11. System

Admin juga mendapatkan akses pengelolaan kategori artikel dan Content Hub melalui tombol pengelolaan kategori pada halaman Article. Content Hub tidak ditampilkan sebagai item menu sidebar tersendiri.

## 4. Deskripsi fitur aplikasi

### 4.1 Overview / Dashboard

Dashboard menampilkan ringkasan portal:

- Identitas pengguna dan status akses.
- Jumlah anggota.
- Ringkasan jadwal.
- Event terbaru.
- Broadcast/pengumuman.
- Artikel terbaru.
- Informasi umum.
- Daftar startup.
- Shortcut menuju schedule, article, announcements, dan system.

Untuk admin, dashboard menampilkan konteks `System Root Authorized` dan shortcut system.

### 4.2 Account / Profile

Pengguna dapat melihat dan memperbarui:

- Nama.
- Email.
- Avatar.
- Foto identitas/KTM.
- Data startup mahasiswa.
- Job desk mahasiswa.
- Job desk dosen.
- Kode dosen.
- Link YouTube.
- Link Spotify.

Upload avatar dan foto identitas dikirim sebagai base64 ke action `uploadFile`, kemudian URL hasil upload disimpan pada profil.

Perubahan profil disimpan melalui action `updateProfile`. Password tidak diubah melalui form profile biasa.

### 4.3 Mainframe Repo

Fitur repository meliputi:

- Melihat file dan folder.
- Membuat folder.
- Upload file.
- Rename file/folder.
- Copy file/folder.
- Menghapus file.
- Navigasi folder bertingkat.
- Filter kategori file.
- Statistik kapasitas dan jumlah file.
- Preview file tertentu.

Mahasiswa/dosen melihat repository milik sendiri. Admin melihat repository global dan folder virtual berdasarkan role pemilik.

Action repository:

```text
getRepoFiles
getAdminRepoData
createFolder
uploadToRepo
renameRepoItem
copyRepoItem
deleteRepoItem
uploadFile
```

Binary file lokal ditangani oleh endpoint `/api/files/:id`. Sebagian integrasi repository juga meneruskan payload ke Google Apps Script sesuai konfigurasi provider.

### 4.4 Streaming Hub

Streaming Hub memiliki empat sub-tab:

- YouTube.
- Spotify.
- TV Live.
- Watch / playlist.

Pengguna dapat menyimpan link YouTube dan Spotify pada profil. Jika link pribadi kosong, aplikasi dapat menggunakan link default admin dari assets.

Admin dapat:

- Menambah playlist YouTube.
- Menghapus playlist YouTube.
- Menambah channel TV Live.
- Menghapus channel TV Live.

Action utama:

```text
updateProfile
manageYPlaylist
manageTvLive
```

Data playlist dan TV Live disimpan di MySQL pada tabel `yplaylists` dan `tvlive`.

### 4.5 Informasi

Informasi adalah modul pengumuman informatif dengan target audiens:

- Semua pengguna.
- Role dosen.
- Role mahasiswa.
- Semua startup.
- Startup tertentu.

Pengguna terautentikasi dapat membuat informasi. Pengguna dapat mengubah atau menghapus informasi yang dibuat sendiri. Admin dapat mengelola seluruh informasi.

Action:

```text
manageInformasi
```

Data disimpan pada tabel `information`.

### 4.6 Schedule

Schedule menyimpan agenda/jadwal dengan data:

- Judul.
- Tanggal.
- Jam mulai.
- Jam selesai.
- Lokasi offline.
- Status/lokasi online.
- Link Meet.
- Organizer.
- Deskripsi.
- Author.

Pengguna dapat mengelola jadwal miliknya sendiri. Admin dapat mengelola seluruh jadwal.

Action:

```text
manageSchedule
```

Data disimpan pada tabel `schedules`.

### 4.7 Events

Events mendukung:

- Judul event.
- Tanggal dan waktu.
- Gambar.
- Deskripsi.
- Lokasi offline/online.
- Kapasitas peserta.
- Status event.
- Tags.
- Link Google Meet.
- Author.
- Filter berdasarkan bulan.
- Preview detail event.

Pemilik event dapat mengubah/menghapus event sendiri. Admin dapat mengelola semua event.

Integrasi Google Meet:

```text
generateMeetLink
autoInviteToMeet
```

Action CRUD:

```text
manageEvent
```

Data event disimpan pada tabel `events`.

### 4.8 Article

Article menyediakan knowledge hub dengan:

- Judul.
- Konten.
- Tanggal.
- Author.
- Tags.
- Kategori.
- Gambar.
- Video.
- Link tambahan.
- Detail artikel.

Pengguna dapat membuat artikel dan mengelola artikel sendiri. Admin dapat mengelola seluruh artikel.

Action CRUD:

```text
manageArticle
```

Data disimpan pada tabel `articles`.

### 4.9 Kategori artikel dan Content Hub

Content Hub merupakan modul admin untuk mengelola:

- Informasi.
- Schedule.
- Artikel.
- Kategori artikel.

Kategori artikel memiliki operasi:

- Tambah.
- Edit.
- Hapus.
- Daftar dan pencarian.
- Sorting dan pagination.

Action:

```text
manageCategory
```

Data disimpan pada tabel `article_categories`.

### 4.10 Broadcast / Announcements

Admin dan pengguna terautentikasi dapat membuat broadcast. Pengguna dapat menghapus broadcast miliknya sendiri, sedangkan admin dapat menghapus seluruh broadcast.

Broadcast mendukung target:

- Semua pengguna.
- Role tertentu.
- Startup tertentu.

Action:

```text
addAnnouncement
deleteAnnouncement
```

Data disimpan pada tabel `announcements`.

### 4.11 Notifications

Ikon Bell pada layout mengambil data dari:

```text
GET /api/data/notifications
```

Frontend melakukan refresh berkala setiap 30 detik. Badge unread saat ini menggunakan indikator sederhana: jika terdapat data notifikasi, badge bernilai satu.

### 4.12 Management User — admin

Admin dapat:

- Melihat daftar mahasiswa dan dosen.
- Mencari anggota.
- Filter berdasarkan role.
- Menambah mahasiswa/dosen.
- Menghapus anggota.
- Mengubah identitas.
- Mengatur tipe mahasiswa.
- Mengatur startup dan job desk.
- Mengubah kode dosen.
- Mengubah quota storage.
- Mengubah batas maksimal upload.
- Mengelola startup team.

Action:

```text
getAllMembers
register
manageMember
updateMemberStorage
manageStartup
```

Data anggota disimpan pada:

```text
students
lecturers
```

Data startup disimpan pada:

```text
startup_teams
```

### 4.13 System / Settings — admin

Admin dapat memperbarui konfigurasi global:

- Background halaman depan.
- Background halaman belakang.
- Logo.
- Policy storage mahasiswa.
- Policy storage dosen.
- Link YouTube admin.
- Link Spotify admin.

Action:

```text
updateAssets
```

Data disimpan pada tabel `assets`.

### 4.14 Logout dan pemulihan sesi

Logout menghapus JWT dari local storage, mengembalikan state ke guest, dan mengarahkan tampilan ke halaman login.

Pemulihan sesi menggunakan JWT dan pemeriksaan ulang ke database. Sesi dianggap valid jika:

- Signature JWT valid.
- Algoritma sesuai.
- Token belum kedaluwarsa.
- Role valid.
- Akun masih ada di database.

## 5. Pemetaan API utama

### Authentication

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/auth/login` | Login mahasiswa, dosen, atau admin |
| POST | `/api/auth/register` | Registrasi mahasiswa/dosen |
| GET | `/api/auth/session` | Memulihkan sesi JWT |

### Data read

| Endpoint | Data |
|---|---|
| `/api/health` | Health check |
| `/api/data/assets` | Assets, jumlah anggota, playlist, TV Live |
| `/api/data/notifications` | Notifikasi |
| `/api/data/announcements` | Broadcast |
| `/api/data/startups` | Startup team |
| `/api/data/informasi` | Informasi |
| `/api/data/schedules` | Schedule |
| `/api/data/events` | Events |
| `/api/data/articles` | Artikel |
| `/api/data/categories` | Kategori artikel |

### Data write melalui bridge

Write operation utama dikirim ke:

```text
POST /api/bridge
```

Action yang tersedia:

```text
updateProfile
updateAssets
manageStartup
manageMember
updateMemberStorage
manageInformasi
manageSchedule
manageEvent
manageArticle
manageCategory
addAnnouncement
deleteAnnouncement
manageYPlaylist
manageTvLive
getAllMembers
getAdminRepoData
```

### Fitur backend tambahan

| Endpoint | Keterangan |
|---|---|
| `/api/files/:id` | Menyajikan file repository |
| `/api/photobooth` | Membaca/menyimpan konfigurasi photobooth |
| `/api/photobooth/download/:filename` | Download file photobooth dari storage |
| `/api/migration/pull` | Import data dari Google Apps Script, admin-only |
| `/api/ai/generate` | Generate konten AI |
| `/api-docs` | Dokumentasi Swagger |

## 6. Pembagian penyimpanan data

### MySQL

Fitur berikut menggunakan MySQL secara langsung:

- Login dan akun.
- Profil.
- Assets.
- Informasi.
- Schedule.
- Events.
- Artikel dan kategori.
- Broadcast.
- Startup.
- Playlist dan TV Live.
- Metadata repository.
- Photobooth settings.
- Audit/system logs.

### Google Apps Script

Google Apps Script digunakan sebagai provider eksternal untuk sebagian operasi:

- Upload repository lama/provider eksternal.
- Operasi Google Drive yang masih diproxy.
- Generate Google Meet.
- Auto invite Google Meet.
- Migrasi data dari sumber Google Apps Script.

## 7. Fitur yang ada di backend tetapi belum menjadi menu utama UI

Beberapa kemampuan tersedia pada backend/source code tetapi tidak terhubung langsung ke navigasi utama:

1. `NewsView.tsx` tersedia, tetapi tidak dirender dari `App.tsx`.
2. Photobooth API tersedia di `/api/photobooth`, tetapi tidak terlihat sebagai menu utama pada Layout.
3. Migration API tersedia untuk admin, tetapi tidak ada tombol migration pada sidebar.
4. AI generation endpoint tersedia, tetapi tidak ditemukan pemanggilan aktif dari view utama.
5. Content Hub tersedia untuk admin, tetapi dibuka melalui pengelolaan kategori dari Article, bukan item sidebar mandiri.

## 8. Verifikasi teknis yang dilakukan

### Login role

| Skenario | Hasil |
|---|---|
| Login mahasiswa | Berhasil |
| Login dosen | Berhasil |
| Login admin | Berhasil |

### Persistence backend

Suite test backend dijalankan dengan:

```powershell
cd C:\laragon\www\portal-kolab\api
npm test
```

Hasil:

```text
17 tests passed
0 tests failed
```

Suite tersebut menguji:

- Register dan login tiap role.
- Session restore.
- Update profile dan password.
- Administrasi anggota.
- Startup CRUD.
- Informasi CRUD.
- Schedule CRUD.
- Event CRUD.
- Kategori CRUD.
- Artikel CRUD.
- Assets.
- Playlist dan TV Live.
- Announcements, notifications, dan audit log.
- Repository binary, folder bertingkat, copy, rename, ownership, dan quota.
- Upload asset.
- Photobooth settings.
- Authorization untuk write operation.
- Migration dari provider eksternal.
- Integrasi Google Meet.

### Data saat analisis

Jumlah data pada database lokal saat analisis:

| Tabel | Jumlah |
|---|---:|
| students | 1 |
| lecturers | 1 |
| admins | 1 |
| startup_teams | 6 |
| information | 0 |
| schedules | 0 |
| events | 0 |
| articles | 0 |
| article_categories | 0 |
| announcements | 0 |
| notifications | 0 |
| repo | 2 |
| yplaylists | 0 |
| tvlive | 0 |
| assets | 0 |
| photobooth_settings | 0 |

## 9. Catatan analisis dan risiko operasional

1. Frontend menyediakan guard tampilan berdasarkan role, tetapi authorization backend tetap harus menjadi sumber kebenaran utama.
2. Endpoint write memakai satu bridge dengan action string yang banyak. Perubahan nama action frontend/backend harus dijaga konsisten.
3. Sebagian repository dan Google Meet masih bergantung pada provider eksternal. Jika GAS URL bermasalah, operasi tersebut akan gagal walaupun MySQL sehat.
4. Assets masih dapat kosong pada database baru. Frontend memiliki fallback visual, tetapi data konfigurasi production sebaiknya di-seed.
5. Menu Content Hub belum terlihat langsung pada sidebar admin.
6. `NewsView` ada sebagai komponen tetapi belum digunakan pada routing state `App`.
7. Fitur AI membutuhkan `GEMINI_API_KEY` yang valid.
8. Kredensial admin dan akun uji harus dikelola sebagai secret dan tidak disimpan di source code atau dokumen publik.

## 10. Kesimpulan

Portal Kolab memiliki tiga tingkat akses utama:

- Mahasiswa: akses fitur portal dan pengelolaan data milik sendiri.
- Dosen: akses fitur portal dan pengelolaan data milik sendiri.
- Admin: akses seluruh fitur portal, administrasi anggota, startup, content hub, assets, dan pengelolaan global.

Alur utama aplikasi sudah terhubung ke backend Node.js dan MySQL. Operasi CRUD inti telah diverifikasi melalui suite persistence dengan 17 test berhasil. Google Apps Script berfungsi sebagai integrasi eksternal untuk repository/provider dan Google Meet, bukan sebagai database utama akun dan konten portal.
## Implementasi Import/Export Member (Admin)

Fitur transfer data member telah ditambahkan pada User Directory untuk role `ADMIN`.

- Backend baru: `api/routes/memberTransfer.js`, didaftarkan pada `/api/admin/members`.
- Frontend: `views/MemberManagementView.tsx` menyediakan Import Data dan Export Data tanpa mengubah tab Startup Cluster maupun Kelola Magang.
- API frontend: `api.ts` menangani upload multipart, commit import, template, dan download export.
- Dependency: `multer`, `xlsx`, dan `pdfkit`.
- Import mendukung `.xlsx`, `.xls`, dan `.csv`, mapping header berbasis alias, preview, validasi identifier/nama/email/quota/status/type/startup, duplicate `skip/update`, transaksi database, serta audit log.
- Template mahasiswa dan dosen tersedia melalui endpoint `/template/:role`.
- Export mahasiswa/dosen mendukung Excel dan PDF, filter pencarian aktif, pagination PDF, dan tidak menyertakan password maupun hash password.
- Semua endpoint menggunakan `requireSession` dan admin guard sehingga unauthenticated menghasilkan `401` dan role non-admin `403`.
- User Directory juga mendukung bulk action untuk member terpilih: aktifkan, nonaktifkan, setujui, batalkan persetujuan, dan hapus. Proses dibatasi maksimal 500 member per request, menggunakan transaksi bridge yang sama, serta dicatat ke `system_logs`.
- Bulk action juga memiliki opsi `Edit Detail User` untuk mengubah secara parsial nama, email, password, tipe/startup/job desk mahasiswa, serta kode/job desk dosen. Field kosong tidak mengubah nilai lama, identifier NIM/NIP tidak dapat diubah, dan password tetap di-hash oleh backend.
- Saat bulk edit routing mahasiswa menjadi `STARTUP`, startup kosong berarti mempertahankan startup masing-masing member. Jika admin ingin menyamakan startup, startup dapat dipilih dari daftar `startup_teams`; backend juga menerima pencocokan nama/ID secara case-insensitive.
- Import mahasiswa sekarang menerima `startup_id`, `startup`, `startup_name`, `nama startup`, `nama tim`, dan `startup team`. Nilai ID maupun nama startup akan dicocokkan ke `startup_teams`, lalu yang disimpan ke `students.startup_id` adalah ID startup yang sebenarnya. Startup yang tidak ada tetap ditolak agar tidak menghasilkan relasi database yang salah.

Validasi yang telah dijalankan:

- `npm run build` (frontend): berhasil.
- `node --check routes/memberTransfer.js` dan `server.js` dari direktori `api`: berhasil.
- `api/npm test`: 65 test passed, 0 failed.
