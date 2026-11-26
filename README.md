<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15b7UGNDMez5k5NyuK9tMS5TnK1vv4eJn

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run the local backend

The backend is a separate Node.js application in the `api` directory. Start it
in another terminal:

```powershell
cd api
npm install
npm start
```

The API runs at `http://localhost:3001`. During Vite development, the frontend
uses this local API automatically. To use a different API URL, set
`VITE_API_BASE_URL` in `.env.local`, for example:

```text
VITE_API_BASE_URL=http://localhost:3001/api
```

## Seed the initial administrator

After importing `schema.sql` and configuring `api/.env`, run:

```powershell
cd api
npm run seed:admin
```

The seed creates the `hrkolab` administrator only when the `admins` table is empty.
It prints a generated password once; save it to sign in through the admin login.
To provide your own password, set `ADMIN_SEED_PASSWORD` (at least 12 characters)
before running the command. Passwords use the hash format expected by the current
login endpoint. Running the seed again leaves existing accounts unchanged.


## Persistensi MySQL dan pengujian

Semua operasi portal menggunakan MySQL: akun/profil/password, startup, informasi,
jadwal, event, artikel/kategori, pengumuman/notifikasi, aset/kebijakan storage,
playlist/TV, repository, dan konfigurasi photobooth. File upload baru disimpan
sebagai LONGBLOB di `file_blobs`; metadata dan folder disimpan di `repo`.
Token login tetap disimpan di browser; profil dimuat ulang dari database.

Untuk database yang sudah ada, jalankan migrasi tambahan (tidak menghapus data):

```powershell
npm --prefix api run db:migrate
```

Restart backend setelah perubahan kode. Instalasi baru tetap menggunakan
`schema.sql`. Atur `DB_HOST`, `DB_PORT` (default 3306), `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, dan `JWT_SECRET` di `api/.env`. Untuk deployment melalui reverse proxy,
set `PUBLIC_API_URL` ke URL publik backend, misalnya `https://portal.kolab.top/api`,
agar URL download file menggunakan host dan HTTPS yang benar.

## Posisi Startup

Jalankan `npm --prefix api run db:migrate` sebelum memakai backend versi ini.
Migration menambahkan `students.startup_position` dan index gabungan dengan
`startup_id`. Mahasiswa STARTUP dengan relasi startup valid yang belum memiliki
posisi mendapat `MEMBER`; Job Desk tetap disimpan terpisah. Migration dapat diulang
tanpa mengubah posisi yang telah ditetapkan admin.

Admin memilih CEO, COO, CTO, CFO, CMO, atau Anggota pada form tambah/edit mahasiswa.
Setiap C-level hanya boleh diisi satu mahasiswa per startup. Pindah startup
mengembalikan pilihan ke Anggota; NON_STARTUP menghapus relasi dan posisi.
Bulk Edit Detail mendukung penetapan Anggota untuk mahasiswa pada startup yang sama.

Template import memuat `startup_position`; nilai kosong untuk anggota startup
menjadi `MEMBER`, termasuk pada import update. Alias `posisi_startup`, `posisi`,
dan `startup position` juga diterima. Preview dan commit sama-sama memvalidasi
duplikasi C-level. Excel/PDF memuat Posisi Startup serta mempertahankan Job Desk.

Pengujian: `npm --prefix api test`, `npm test`, `npx tsc --noEmit`, dan
`npm run build`. Detail implementasi terdapat di
[IMPLEMENTATION-STARTUP-POSITION.md](IMPLEMENTATION-STARTUP-POSITION.md).

```powershell
npm --prefix api test
npx tsc --noEmit
npm run build
```

Uji integrasi membuat database `portal_kolab_test_<acak>` pada MySQL yang sama,
menjalankan API melalui HTTP, memeriksa hasil langsung di MySQL, lalu menghapus
hanya database uji tersebut. Akun MySQL untuk test perlu izin CREATE/DROP DATABASE.
Database aplikasi tidak digunakan sebagai tempat menulis fixture.

Cakupan test: CRUD semua koleksi portal, profil tiga peran, perubahan password,
kuota, upload/download byte file, folder bertingkat, copy/rename/delete, penolakan
akses, pembacaan setelah restart API, rollback, dan migrasi skema yang dapat diulang.

Semua data portal sudah berada di MySQL, sehingga portal tidak lagi memakai Google
Apps Script (GAS). Endpoint `/api/migration/pull` dan variabel `GAS_URL` sudah
dihapus. Link Google Meet untuk event online ditempel manual oleh admin, dan
tombol bergabung langsung membuka link tersebut. Hasil AI yang berhasil tetap
disimpan ke `integration_results`; generasi AI langsung belum dicakup pengujian provider.

Operasi tulis bridge, photobooth, dan AI memerlukan token Bearer.
Pengaturan global dan pengelolaan anggota memerlukan peran ADMIN. URL file bersifat
shareable dan menggunakan ID acak, sesuai fungsi preview/download portal.

## Kelola Magang (ADMIN)

Buka **Management User > Kelola Magang** untuk tambah, edit, hapus, cari mahasiswa,
filter startup/status, dan refresh. Mahasiswa serta pembimbing akademik dipilih dari
User Directory; startup dipilih dari Startup Cluster. Status disimpan di MySQL.

Jalankan `npm --prefix api run db:migrate` lalu restart backend untuk database
existing. Migrasi dapat diulang tanpa menghapus record magang. Endpoint
`GET /api/data/internships` dan bridge `manageInternship` hanya menerima JWT ADMIN.

Status aktif `PLANNED` dan `ONGOING` tidak boleh memiliki periode bertabrakan untuk
mahasiswa yang sama, termasuk ketika tanggal selesai sama dengan tanggal mulai
record lain. `COMPLETED` dan `CANCELLED` tetap dapat dicatat sebagai riwayat.

Laporan perubahan dan hasil pengujian: [IMPLEMENTATION-MAGANG.md](IMPLEMENTATION-MAGANG.md).

## Kelola Aset Sarana (ADMIN)

Gunakan menu **Kelola Aset Sarana** setelah masuk sebagai admin. Instalasi baru memakai `schema.sql`. Untuk database uji yang sudah ada, jalankan `npm --prefix api run db:migrate` dan mulai ulang backend.

Untuk uji coba, buat dua ruang lalu catat satu aset di ruang pertama. Edit aset untuk memindahkannya ke ruang kedua dan ubah kondisinya. Buka **Riwayat** untuk memeriksa kedua perubahan, lalu cari aset dengan filter ruang. Gunakan status **Tidak aktif** untuk aset yang sudah dikeluarkan dari penggunaan agar catatannya tetap tersedia.

## Virtual Office 3D

Menu **Virtual Office 3D** tersedia untuk admin, mahasiswa, dan dosen setelah login. Pengunjung juga bisa melihatnya sebelum login lewat tombol **Lihat Ko+Lab 3D** di halaman login dan register, selama denah ditayangkan. Tampilan publik ini memakai `GET /api/virtual-office/public` dan `/public/map` tanpa token, dan tidak memuat nama, jabatan, NIM, atau NIP. Figur orang tetap tampil tanpa label. Pilih **Denah Gabungan Ko+Lab** untuk denah enam area. Setiap area diberi label nama dan jumlah orang. Klik salah satu area untuk membuka modelnya, lalu gunakan kontrol putar dan zoom. Jika browser tidak mendukung WebGL, portal menampilkan gambar denah.

Admin dapat membuka **Kelola Virtual Office** untuk mengubah nama dan deskripsi setiap area atau mengatur publikasi denah. Admin juga bisa menambah, memindahkan, mengedit, dan menghapus penanda orang dari bagian **Posisi orang di denah**. Pilih ruang, ketik nama, NIM, atau NIP di **Tambah mahasiswa atau dosen**, lalu pilih orangnya dari hasil pencarian (Enter memilih hasil teratas). Nama dan jabatan diambil dari profil: posisi startup untuk mahasiswa startup, job desk untuk mahasiswa lain, dan job desk pertama untuk dosen. Kosongkan kolom jabatan untuk memakai data profil, atau isi untuk menggantinya. Semua penanda baru harus dari data Management User. Penanda manual lama tetap bisa diedit atau dihapus. Klik lantai pada model 3D, lalu **Simpan pengaturan**. Setiap mahasiswa atau dosen hanya bisa punya satu posisi. Akun yang dinonaktifkan atau belum disetujui otomatis disembunyikan dari denah dan ditandai untuk admin. Setiap penanda yang sudah punya posisi tampil sebagai figur orang 3D di ruangnya, baik di tampilan ruang maupun di denah gabungan. Nama orang tampil di atas kepala figur pada tampilan ruang.

Ukuran ruang dan lebar lorong masih perkiraan dan disimpan di `api/lib/virtualOfficeFloors.js`. Scene 3D dan validasi API memakai file yang sama. Posisi ruang pada denah gabungan dihitung dari ukuran tersebut di `overviewPlan()` (`lib/virtualOfficeScene.js`). Setelah mengubah ukuran, jalankan `npm test` dan `npx playwright test tests/browser/virtual-office.spec.ts`, lalu render ulang `api/assets/virtual-office-map.png` dari `tests/browser/virtual-office.html?labels`. Instalasi baru memakai `schema.sql`. Untuk database yang sudah ada, jalankan `npm --prefix api run db:migrate`, lalu mulai ulang backend. Denah ditayangkan secara bawaan.

## Streaming Hub

Streaming Hub dipakai untuk menyimpan dan membagikan apa saja yang bermanfaat dari YouTube atau Spotify. Contohnya musik kerja, podcast, rekaman acara, materi, inspirasi, dan hiburan. Klik ikon **?** di halaman untuk panduan singkat.

- **Tambah**: tempel link YouTube (video, playlist, live, shorts) atau Spotify (playlist, album, lagu, artis, podcast, episode), lalu isi judul dan kategori. Setiap anggota boleh menyimpan banyak item, sampai 200 per akun.
- **Koleksi Saya**: semua item milik sendiri. Item **Pribadi** hanya terlihat oleh pemiliknya.
- **Katalog Bersama**: item yang dicentang **Bagikan ke Katalog Bersama**, dengan filter platform (YouTube/Spotify) dan kategori. Kategorinya Edukasi, Musik, Podcast, Hiburan, Inspirasi, Startup & Bisnis, Event & Webinar, Siaran Live, dan Lainnya.
- Item yang dibagikan admin atau dosen langsung tampil. Item mahasiswa tampil setelah admin memilih **Setujui**. Kalau mahasiswa mengubah item yang sudah dibagikan, item itu ditinjau ulang. Pemilik bisa mengubah dan menghapus itemnya sendiri. Admin bisa mengubah dan menghapus semua item.

Data disimpan di tabel `streaming_items`. Server membuat tabel itu saat start, atau lewat `npm --prefix api run db:migrate`. Saat tabel pertama kali dibuat, data lama disalin satu kali:
- playlist YouTube profil setiap anggota menjadi item Pribadi;
- playlist bawaan admin menjadi item Katalog Bersama;
- isi Watch (`yplaylists`) menjadi item Katalog Bersama;
- isi TV Live (`tvlive`) menjadi item Katalog Bersama dengan kategori Siaran Live.

Input playlist di Profil dan Settings sudah dihapus. Hanya link YouTube dan Spotify yang diterima. Kode `<iframe>` lama tetap terbaca, karena hanya URL di dalamnya yang dipakai.

## Meeting online di Schedule dan Event

Centang **Meeting online** di form Schedule, atau pilih **Digital Stream** di form Event, lalu tempel link Google Meet (`https://meet.google.com/...`) atau Zoom (`https://...zoom.us/j/...`). Form langsung menunjukkan platform yang terdeteksi. Peserta membuka meeting lewat tombol **Gabung Google Meet** atau **Gabung Zoom**. API hanya menerima link `https` dari kedua layanan itu (`api/lib/meetingLinks.js`) dan mengosongkan link saat acara diubah menjadi offline. Jadwal lama yang menaruh URL meet di kolom lokasi tetap mendapat tombol Gabung.

Setiap jadwal online menampilkan status:
- **Akan datang**: lebih dari 10 menit sebelum jam mulai.
- **Sedang berlangsung · belum ada yang masuk** (kuning): sejak 10 menit sebelum mulai sampai jam selesai, selama belum ada yang menekan Gabung. Kalau jam selesai kosong, jadwal dianggap berlangsung 2 jam.
- **Online · N orang sudah masuk** (hijau): sudah ada anggota yang menekan **Gabung**.
- **Selesai**: setelah jam selesai.

Halaman detail menampilkan siapa saja yang masuk lewat portal beserta jamnya, dan diperbarui tiap 30 detik. Google Meet dan Zoom tidak memberi data peserta untuk link biasa. Karena itu yang tercatat hanya yang masuk lewat tombol **Gabung** di portal (tabel `schedule_joins`). Orang yang membuka link langsung di aplikasi Meet atau Zoom tidak terlihat.
