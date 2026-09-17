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
akses, pembacaan setelah restart API, rollback, dan migrasi yang dapat diulang.
Google Meet dan sumber migrasi menggunakan server simulasi lokal saat test;
pengujian tidak mengirim undangan atau menghubungi layanan Google sebenarnya.

`/api/migration/pull` sekarang melakukan upsert semua koleksi yang didukung dalam
satu transaksi. File lama yang masih berupa URL eksternal tetap berupa referensi;
endpoint ini tidak menyalin isi file lama dari Drive. `uploadFile` dan operasi
repository baru tidak memakai GAS. Google Meet masih memerlukan `GAS_URL` yang
mendukung aksi tersebut. Hasil integrasi Meet dan hasil AI yang berhasil disimpan
ke `integration_results`; generasi AI langsung belum dicakup pengujian provider.

Operasi tulis bridge, photobooth, migrasi, dan AI memerlukan token Bearer.
Pengaturan global dan pengelolaan anggota memerlukan peran ADMIN. URL file bersifat
shareable dan menggunakan ID acak, sesuai fungsi preview/download portal.
