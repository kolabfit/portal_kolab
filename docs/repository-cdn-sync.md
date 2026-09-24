# Sinkronisasi Mainframe Repo dengan Kroombox CDN

Daftar Repo disinkronkan saat dibaca melalui GET maupun POST. Halaman terbuka
memperbarui daftar setiap 30 detik dan saat kembali mendapat fokus. Tidak ada
worker saat halaman ditutup; pembacaan berikutnya menjalankan sinkronisasi.

- Inventory berasal dari `GET /api/bridge/files`, dibatasi project konfigurasi.
  Bentuk respons produksi yang diverifikasi adalah array lengkap tanpa pagination
  (parameter page/limit diabaikan oleh bridge saat ini). Bentuk lain, project lain,
  ID duplikat, atau metadata invalid membatalkan sinkronisasi, bukan menghapus data.
- File/folder baru yang belum memiliki metadata Portal masuk sebagai milik
  `ROOT` / `ADMIN`. Tidak menebak pemilik dari user ID Kroombox.
- ID CDN menjadi kunci pencocokan. Nama, ukuran, MIME, status diperbarui;
  pemilik dan folder logical Portal dipertahankan. Hierarki CDN dipetakan untuk
  entri impor; perpindahan lintas pemilik tidak diperbolehkan.
- File yang hilang harus tidak ditemukan dalam dua inventory berhasil dengan
  jarak minimal 30 detik. Upload berumur kurang dari satu menit dilindungi.
  Gangguan jaringan/format respons mereset konfirmasi penghapusan.
- Penghapusan berupa soft delete metadata: hilang dari daftar, statistik dan
  penggunaan kuota, akses file ditolak. Jika file muncul kembali, entri lama
  dipulihkan tanpa mengganti pemilik. File legacy tidak ikut dihapus.
- File yang sudah memiliki metadata fitur lain tidak otomatis diimpor ulang.
- Rename/delete dari Portal menunggu hasil CDN sebelum mengubah metadata lokal.
  Respons 404 delete diverifikasi terhadap inventory agar endpoint tidak tersedia
  tidak disalahartikan sebagai keberhasilan penghapusan.
- Sinkronisasi serial memakai lock MySQL; request berdekatan berbagi hasil selama
  10 detik. Tidak ada perubahan schema yang dibutuhkan.

Gunakan `KROOMBOX_CDN_SYNC_ENABLED=false` untuk menonaktifkan sinkronisasi.
Project ID dan API key wajib tersedia. Restart backend setelah perubahan kode.

Validasi:

```powershell
node --test api/tests/repo-cdn-snapshot.test.js api/tests/repo-cdn-sync.test.js api/tests/cdn.test.js
npm run build
```

Tes integrasi menggunakan database sementara yang terpisah dan mock server CDN;
tidak mengunggah, rename, atau menghapus file CDN nyata.
