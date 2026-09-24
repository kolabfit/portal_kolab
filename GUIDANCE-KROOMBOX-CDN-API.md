# Guidance Kroombox CDN API

> Dokumen ini disusun berdasarkan analisis guide/video Kroombox CDN yang telah dipelajari sebelumnya dalam percakapan ini.
>
> **Catatan penting:** hanya endpoint dan parameter yang memang terlihat/terkonfirmasi pada guide yang ditulis sebagai endpoint pasti. Untuk operasi yang tersedia tetapi path detailnya tidak terlihat jelas pada sumber, dokumen ini menandainya sebagai **“ikuti endpoint pada guide Kroombox CDN”** dan tidak mengarang path baru.

---

## 1. Ringkasan

Kroombox CDN dapat digunakan sebagai storage/CDN utama untuk file pada Portal Ko+Lab.

Pola integrasi yang direkomendasikan:

```text
Frontend Portal Ko+Lab
        ↓
Backend Portal Ko+Lab
        ↓
Kroombox CDN API
        ↓
File / Asset CDN
```

Frontend **tidak boleh menyimpan atau menggunakan API Key/JWT Kroombox CDN secara langsung**.

Credential CDN hanya disimpan pada backend melalui environment variable.

---

# 2. Base API

Base API yang dianalisis:

```text
https://api-cdn.kroombox.com
```

Contoh environment variable:

```env
KROOMBOX_CDN_BASE_URL=https://api-cdn.kroombox.com
KROOMBOX_CDN_API_KEY=
KROOMBOX_CDN_JWT=
KROOMBOX_CDN_PROJECT_ID=
```

Jangan commit credential asli ke GitHub.

---

# 3. Authentication

Dari guide yang dianalisis, Kroombox CDN menyediakan dua pola autentikasi.

## 3.1 Project API Key

Menggunakan header:

```http
x-api-key: <API_KEY>
```

API Key cocok digunakan untuk komunikasi server-to-server dari backend Portal Ko+Lab.

Contoh konseptual:

```http
POST /api/bridge/upload
Host: api-cdn.kroombox.com
x-api-key: <API_KEY>
```

---

## 3.2 Bearer JWT

Menggunakan header:

```http
Authorization: Bearer <JWT_TOKEN>
```

JWT digunakan pada endpoint/flow yang membutuhkan autentikasi berbasis user/project sesuai guide Kroombox.

---

## 3.3 Rekomendasi Portal Ko+Lab

Jangan gunakan:

```text
VITE_KROOMBOX_API_KEY
VITE_KROOMBOX_JWT
```

Jangan simpan credential pada:

```text
localStorage
sessionStorage
React source
public/
console.log
API response
system_logs
```

Gunakan:

```text
Backend Portal
→ Kroombox CDN
```

---

# 4. Upload File

Endpoint upload yang dianalisis:

```http
POST /api/bridge/upload
```

---

## 4.1 Upload dengan Multipart Form Data

Metode yang direkomendasikan untuk Portal Ko+Lab:

```http
Content-Type: multipart/form-data
```

Field file menggunakan field upload sesuai guide Kroombox.

Metadata yang terlihat pada guide meliputi:

```text
fileName
mimeType
projectId
parentId
```

`parentId` dapat digunakan bila file ingin ditempatkan pada folder/parent tertentu.

---

## 4.2 Upload dengan JSON/Base64

Guide juga menunjukkan kemungkinan upload menggunakan:

```text
fileContent
```

dalam bentuk Base64.

Metadata:

```text
fileName
mimeType
projectId
parentId
fileContent
```

Namun untuk Portal Ko+Lab sebaiknya:

```text
multipart/form-data
```

digunakan sebagai default.

Alasannya:

- lebih hemat memory;
- payload lebih kecil daripada Base64;
- lebih cocok untuk file besar;
- lebih mudah di-stream dari backend.

---

# 5. Upload Bersifat Asynchronous

Salah satu bagian penting Kroombox CDN adalah upload dapat diproses secara asynchronous.

Response awal dapat memberikan informasi seperti:

```text
fileId
status
processing
status/tracking endpoint
```

Artinya response upload tidak selalu berarti file sudah siap digunakan.

Flow yang benar:

```text
Upload File
    ↓
Dapat fileId
    ↓
Status = processing
    ↓
Check status
    ↓
READY / SUCCESS
    ↓
File siap dipakai
```

Backend Portal sebaiknya tidak langsung menandai asset sebagai `READY` sebelum proses CDN selesai.

---

# 6. Model Status Asset di Portal

Rekomendasi internal Portal Ko+Lab:

```text
PENDING
UPLOADING
PROCESSING
READY
FAILED
DELETE_PENDING
DELETED
```

Contoh:

```text
User upload proposal.pdf

UPLOADING
   ↓
PROCESSING
   ↓
READY
```

Jika CDN gagal:

```text
FAILED
```

Simpan error internal yang aman, tetapi jangan menyimpan API Key/JWT pada log.

---

# 7. List File

Endpoint list file yang dianalisis:

```http
GET /api/bridge/files
```

Guide menunjukkan list asset dapat difilter menggunakan parameter seperti:

```text
search
MIME/type
folder
pagination
page
limit
```

Gunakan endpoint ini untuk:

- pencarian asset;
- audit asset;
- asset browser Admin;
- migration verification;
- diagnostic.

---

# 8. File ID

Kroombox CDN menggunakan identifier asset/file.

Gunakan:

```text
fileId
```

sebagai identifier utama file CDN.

Jangan menjadikan URL sebagai primary key.

Contoh database Portal:

```text
cdn_asset_id
cdn_file_id
delivery_url
```

Yang paling penting:

```text
cdn_file_id
```

---

# 9. Delivery / View File

Endpoint delivery/view yang dianalisis:

```http
GET /api/bridge/view/:id
```

`id` adalah identifier asset/file Kroombox.

Contoh konsep:

```text
GET https://api-cdn.kroombox.com/api/bridge/view/<fileId>
```

Portal dapat menggunakan delivery URL ini untuk asset public.

---

# 10. Image Transformation

Delivery Kroombox CDN mendukung transformasi image melalui query parameter.

Kemampuan yang terlihat dalam guide meliputi:

```text
ukuran / resize
format
quality
fit
blur
grayscale
rotation
download
redirect
```

Gunakan fitur CDN ini untuk kebutuhan seperti:

```text
Avatar user
Thumbnail artikel
Logo startup
Poster event
Preview gambar
```

Contoh use case:

```text
Original image
      ↓
CDN transform
      ↓
thumbnail 300 × 200
```

Dengan ini Portal tidak perlu melakukan resize image berat pada backend jika transform CDN sudah mencukupi.

> Gunakan nama query parameter yang persis sesuai guide/API Kroombox saat implementasi. Jangan menebak nama parameter jika belum dikonfirmasi.

---

# 11. Signed URL

Guide Kroombox CDN menyediakan kemampuan:

```text
Signed URL
```

Gunakan untuk file private.

Contoh asset private Portal Ko+Lab:

```text
KTM / ID Card
Private Mainframe Repo
Dokumen internal
Dokumen magang
Dokumen workload
```

Flow yang direkomendasikan:

```text
User Request File
        ↓
Portal Backend
        ↓
Check permission
        ↓
Request Signed URL dari Kroombox
        ↓
Return temporary URL
        ↓
User membuka file
```

Jangan memberikan permanent public URL untuk file sensitif.

Expiration yang direkomendasikan untuk Portal:

```text
5–15 menit
```

atau mengikuti kebutuhan aplikasi.

> Path endpoint signing harus mengikuti endpoint yang tersedia di guide Kroombox CDN. Jangan mengarang path endpoint jika belum terkonfirmasi.

---

# 12. Rename Asset

Guide menunjukkan asset dapat di-rename menggunakan identifier file.

Salah satu karakteristik penting:

```text
Rename tidak mengubah immutable asset ID.
```

Artinya:

```text
fileId tetap
nama berubah
```

Portal sebaiknya menyimpan `fileId` sebagai reference utama.

Jangan menghubungkan relasi database berdasarkan nama file.

---

# 13. Move Asset

Kroombox CDN mendukung operasi memindahkan asset/folder.

Gunakan apabila Portal ingin menyinkronkan struktur folder CDN dengan struktur aplikasi.

Namun untuk Portal Ko+Lab:

```text
Database Portal
```

sebaiknya tetap menjadi source of truth untuk struktur logical folder Mainframe Repo.

CDN folder/parent hanya menjadi storage organization.

---

# 14. Delete Asset

Kroombox CDN menyediakan operasi delete asset.

Flow yang aman:

```text
Portal permission check
        ↓
Mark DELETE_PENDING
        ↓
Request delete CDN
        ↓
Delete success
        ↓
Mark DELETED
```

Jika CDN delete gagal:

jangan langsung menghapus metadata Portal tanpa jejak.

---

# 15. Batch Operation

Guide menunjukkan Kroombox CDN juga mendukung batch operation.

Dapat digunakan untuk kebutuhan seperti:

```text
Bulk delete
Bulk move
Asset migration
Admin cleanup
```

Gunakan hanya jika benar-benar diperlukan.

Pastikan Portal melakukan permission validation sebelum menjalankan batch action.

---

# 16. Purge Asset Cache

Kroombox menyediakan:

```text
Purge Asset Cache
```

Gunakan ketika asset berubah tetapi cache CDN masih menyimpan versi lama.

Use case:

```text
Ganti avatar
Ganti logo startup
Ganti thumbnail artikel
Update asset existing
```

Flow:

```text
Replace / update asset
        ↓
Purge cache
        ↓
CDN mengambil versi baru
```

Jangan melakukan purge untuk setiap request normal.

---

# 17. CDN Statistics

Guide menunjukkan tersedianya statistik CDN.

Dapat digunakan untuk:

```text
monitoring usage
bandwidth
request
storage
asset analytics
```

Portal dapat menambahkan Admin diagnostic/dashboard bila diperlukan.

Jangan expose informasi internal CDN ke user biasa.

---

# 18. Health / Descriptor

Guide juga menunjukkan adanya endpoint descriptor/health.

Dapat digunakan backend untuk mengecek koneksi CDN.

Contoh diagnostic Portal:

```json
{
  "api": "ok",
  "database": "ok",
  "cdn": "ok"
}
```

Jangan tampilkan credential dalam health response.

---

# 19. Rekomendasi Service Backend

Buat satu service terpusat.

Contoh:

```text
api/services/kroomboxCdn.js
```

atau:

```text
api/lib/kroomboxCdn.js
```

Method yang direkomendasikan:

```text
uploadFile()
getUploadStatus()
getFile()
listFiles()
getDeliveryUrl()
createSignedUrl()
renameFile()
moveFile()
deleteFile()
purgeCache()
```

Semua route Portal menggunakan service tersebut.

Jangan membuat request Kroombox langsung dari setiap controller.

---

# 20. CDN Client

Contoh konsep menggunakan Axios:

```js
const axios = require('axios');

const cdnClient = axios.create({
  baseURL: process.env.KROOMBOX_CDN_BASE_URL,
  timeout: 30000,
  headers: {
    'x-api-key': process.env.KROOMBOX_CDN_API_KEY
  }
});
```

Jika endpoint membutuhkan JWT:

```js
headers: {
  Authorization: `Bearer ${process.env.KROOMBOX_CDN_JWT}`
}
```

Jangan log object headers tersebut.

---

# 21. Portal Asset API

Portal sebaiknya memiliki gateway file sendiri.

Contoh:

```text
POST   /api/assets/upload
GET    /api/assets/:id
GET    /api/assets/:id/access
DELETE /api/assets/:id
```

Frontend berkomunikasi dengan Portal.

Portal yang berkomunikasi dengan Kroombox.

---

# 22. Contoh Upload Flow Portal

```text
React
 │
 │ multipart/form-data
 ▼
POST /api/assets/upload
 │
 ▼
Express
 │
 ├─ Require Session
 ├─ Permission Check
 ├─ MIME Validation
 ├─ Extension Validation
 ├─ Size Validation
 │
 ▼
Kroombox CDN Service
 │
 ▼
POST /api/bridge/upload
 │
 ▼
fileId + processing
 │
 ▼
Check CDN Status
 │
 ▼
READY
 │
 ▼
Insert cdn_assets
 │
 ▼
Return Portal Asset DTO
```

---

# 23. Asset Metadata Portal

Rekomendasi tabel:

```text
cdn_assets
```

Contoh field:

```text
id
cdn_file_id

owner_id
owner_role

feature_type
feature_id

original_name
mime_type
file_size

cdn_delivery_url
cdn_status

parent_id
is_private

storage_provider

created_by
created_at
updated_at
deleted_at
```

Binary file tidak disimpan di tabel ini.

---

# 24. Feature Type Portal Ko+Lab

Contoh standardisasi:

```text
PROFILE_AVATAR
PROFILE_ID_CARD

REPOSITORY_FILE

ARTICLE_THUMBNAIL
ARTICLE_ATTACHMENT

STARTUP_LOGO

EVENT_IMAGE
EVENT_ATTACHMENT

INFORMATION_ATTACHMENT
BROADCAST_ATTACHMENT
SCHEDULE_ATTACHMENT

INTERNSHIP_ATTACHMENT
WORKLOAD_ATTACHMENT

SYSTEM_LOGO
SYSTEM_BACKGROUND

OTHER
```

---

# 25. Public Asset

Asset yang umumnya dapat dibuat public:

```text
Avatar jika memang intended public
Logo Startup
Thumbnail Artikel
Poster Event
Public Article Attachment
```

Public bukan berarti semua orang harus mempunyai write access.

Write tetap melalui Portal Backend.

---

# 26. Private Asset

Asset yang sebaiknya private:

```text
KTM
ID Card
Private Mainframe Repo
Dokumen internal
Dokumen magang
Dokumen workload
```

Gunakan:

```text
Portal authorization
+
Signed URL
```

---

# 27. File Validation

Frontend validation hanya untuk UX.

Backend tetap harus memvalidasi.

Minimal:

```text
MIME type
extension
size
filename
feature permission
```

Reject executable seperti:

```text
.exe
.bat
.cmd
.com
.scr
.msi
.ps1
.vbs
```

dan format berbahaya lain sesuai kebutuhan.

---

# 28. Filename

Original filename hanya digunakan sebagai metadata/display.

Jangan gunakan original filename langsung sebagai:

```text
filesystem path
database identifier
authorization identifier
```

Gunakan CDN `fileId`.

---

# 29. Avatar

Flow:

```text
User upload avatar
        ↓
Portal Backend
        ↓
Kroombox CDN
        ↓
cdn_file_id
        ↓
students / lecturers menyimpan asset reference
```

Gunakan image transformation CDN untuk thumbnail avatar jika diperlukan.

---

# 30. Photo ID / KTM

Gunakan asset private.

Flow:

```text
Upload KTM
↓
Kroombox private asset
↓
Portal menyimpan cdn_file_id
↓
Admin authorized request
↓
Signed URL
```

Jangan membuat KTM dapat diakses menggunakan public permanent URL.

---

# 31. Mainframe Repo

Binary file repo disimpan di CDN.

Database Portal tetap menyimpan:

```text
owner
folder
category
quota
metadata
cdn_file_id
```

Download:

```text
Portal check ownership
↓
Signed URL
↓
User download
```

---

# 32. Article Thumbnail

Gunakan:

```text
ARTICLE_THUMBNAIL
```

Flow:

```text
Choose image
↓
Portal upload
↓
CDN fileId
↓
Article thumbnail asset reference
```

Gunakan CDN transformation untuk list/card image bila diperlukan.

---

# 33. Article Attachment

Gunakan:

```text
ARTICLE_ATTACHMENT
```

Database article attachment cukup menyimpan metadata/reference:

```text
article_id
asset_id
original_name
mime_type
file_size
```

Jangan simpan binary attachment dalam MySQL.

---

# 34. Startup Logo

Gunakan:

```text
STARTUP_LOGO
```

Startup menyimpan:

```text
logo_asset_id
```

atau reference equivalent.

Gunakan fallback jika tidak ada logo.

---

# 35. Event / Information / Broadcast

Jika fitur memiliki upload image/attachment:

gunakan Kroombox CDN.

Jika fitur tidak memiliki file input:

jangan menambahkannya hanya karena CDN tersedia.

---

# 36. Internship / Workload

Jika nanti mendukung dokumen:

```text
INTERNSHIP_ATTACHMENT
WORKLOAD_ATTACHMENT
```

Dokumen internal sebaiknya menggunakan private asset + signed URL.

---

# 37. Legacy File Migration

Portal sebelumnya menggunakan:

```text
file_blobs
LONGBLOB
/api/files
```

Jangan langsung menghapus legacy storage.

Migration strategy:

```text
Phase 1
New upload → Kroombox CDN

Phase 2
Legacy file migration

Phase 3
Verification

Phase 4
Switch legacy read

Phase 5
Optional legacy cleanup
```

---

# 38. Migration Script

Buat script terpisah:

```text
api/scripts/migrate-files-to-kroombox-cdn.js
```

Flow:

```text
Read legacy file
↓
Upload CDN
↓
Get fileId
↓
Wait READY
↓
Save mapping
↓
Mark MIGRATED
```

Jangan hapus legacy binary sebelum verification selesai.

---

# 39. Migration Status

Gunakan:

```text
PENDING
PROCESSING
MIGRATED
FAILED
```

Migration harus:

```text
resumable
idempotent
```

File yang sudah migrated jangan diupload ulang.

---

# 40. Dry Run

Migration script wajib mendukung:

```text
--dry-run
```

Contoh:

```bash
npm run migrate:cdn -- --dry-run
```

Dry-run:

```text
scan
validate
map
report
```

tanpa upload.

---

# 41. Migration Verification

Verifikasi minimal:

```text
cdn_file_id tersedia
status READY
file dapat diakses
size cocok
checksum cocok jika digunakan
```

Jangan hapus source file sebelum verification.

---

# 42. Error Handling

Jangan menampilkan raw Kroombox error kepada user.

Portal response contoh:

```text
File gagal diunggah.
Silakan coba kembali.
```

Detail:

```text
Ukuran file terlalu besar.
Format file tidak didukung.
Storage sementara tidak tersedia.
```

Log backend dapat menyimpan detail error teknis tanpa credential.

---

# 43. Retry

Retry dapat digunakan untuk:

```text
timeout
502
503
504
```

Jangan retry otomatis untuk:

```text
400
401
403
413
415
```

tanpa memperbaiki request.

---

# 44. Timeout

Gunakan timeout yang wajar.

Contoh:

```text
Upload: 60 detik
Metadata: 15 detik
Status: 15 detik
Delete: 15 detik
```

Sesuaikan setelah load testing.

---

# 45. Upload Progress

Karena processing asynchronous, UI dapat menampilkan:

```text
Uploading...
Processing...
Ready
```

Contoh:

```text
proposal.pdf
Processing CDN...
```

---

# 46. Portal Asset DTO

Frontend sebaiknya menerima normalized DTO.

Contoh:

```json
{
  "id": "asset-xxx",
  "fileId": "cdn-file-id",
  "name": "proposal.pdf",
  "mimeType": "application/pdf",
  "size": 1234567,
  "status": "READY",
  "accessUrl": "/api/assets/asset-xxx/access"
}
```

Jangan expose credential.

---

# 47. Audit Log

Portal dapat mencatat:

```text
uploadCdnAsset
deleteCdnAsset
renameCdnAsset
moveCdnAsset
migrateCdnAsset
replaceCdnAsset
```

Contoh metadata:

```json
{
  "assetId": "asset-xxx",
  "cdnFileId": "cdn-file-id",
  "featureType": "ARTICLE_ATTACHMENT"
}
```

Jangan log:

```text
API Key
JWT
Authorization header
```

---

# 48. Cache

Gunakan purge cache hanya saat diperlukan.

Contoh:

```text
Avatar diganti
Logo startup diganti
Thumbnail diganti
```

Jangan purge seluruh CDN untuk setiap update kecil.

---

# 49. Health Monitoring

Portal Admin dapat memiliki diagnostic:

```text
Kroombox CDN
Connected
```

atau:

```text
Unavailable
```

Jangan tampilkan token atau API key.

---

# 50. Recommended Environment Security

`.gitignore`:

```gitignore
.env
.env.*
api/.env
api/.env.*
```

Tetap allow:

```text
.env.example
```

Jangan pernah commit credential production.

---

# 51. Contoh `.env.example`

```env
KROOMBOX_CDN_BASE_URL=https://api-cdn.kroombox.com
KROOMBOX_CDN_API_KEY=
KROOMBOX_CDN_JWT=
KROOMBOX_CDN_PROJECT_ID=
```

---

# 52. Jangan Gunakan Base64 untuk Upload Besar

Hindari:

```text
FileReader.readAsDataURL
↓
JSON
↓
Base64
```

untuk file besar.

Gunakan:

```text
multipart/form-data
```

Preview frontend masih dapat menggunakan:

```js
URL.createObjectURL(file)
```

tanpa mengirim Base64.

---

# 53. Recommended Integration Checklist

## Backend

- [ ] Environment variable Kroombox
- [ ] CDN service terpusat
- [ ] Multipart upload
- [ ] Async status tracking
- [ ] Metadata table
- [ ] Permission validation
- [ ] MIME validation
- [ ] File size validation
- [ ] Signed URL
- [ ] Delete handling
- [ ] Audit log

## Frontend

- [ ] Upload melalui Portal Backend
- [ ] Tidak ada CDN credential
- [ ] Loading state
- [ ] Processing state
- [ ] Error state
- [ ] Preview
- [ ] Private file melalui authorized access route

## Migration

- [ ] Legacy scan
- [ ] Dry-run
- [ ] Upload migration
- [ ] Resume
- [ ] Verification
- [ ] Legacy cleanup hanya setelah confirmed

---

# 54. Integration Flow Summary

```text
                  ┌─────────────────────┐
                  │       FRONTEND      │
                  │ React / TypeScript  │
                  └──────────┬──────────┘
                             │
                             │ multipart/form-data
                             ▼
                  ┌─────────────────────┐
                  │   PORTAL BACKEND    │
                  │ Express / Node.js   │
                  ├─────────────────────┤
                  │ Auth                │
                  │ Permission          │
                  │ File Validation     │
                  │ Audit               │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Kroombox CDN Service│
                  └──────────┬──────────┘
                             │
                             │ POST /api/bridge/upload
                             ▼
                  ┌─────────────────────┐
                  │    KROOMBOX CDN     │
                  │                     │
                  │ fileId              │
                  │ processing          │
                  │ delivery            │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    MySQL Portal     │
                  │ Metadata only       │
                  │ cdn_file_id         │
                  └─────────────────────┘
```

---

# 55. Kroombox CDN API Capability Summary

Berdasarkan guide yang sudah dianalisis:

| Capability | Keterangan |
|---|---|
| Upload | `POST /api/bridge/upload` |
| Multipart Upload | Tersedia |
| Base64 Upload | Tersedia |
| API Key Auth | `x-api-key` |
| JWT Auth | Bearer Token |
| Async Processing | Tersedia |
| File ID | Tersedia |
| File Listing | `GET /api/bridge/files` |
| Search/Filter | Tersedia |
| Pagination | Tersedia |
| View/Delivery | `GET /api/bridge/view/:id` |
| Rename | Tersedia |
| Move | Tersedia |
| Delete | Tersedia |
| Batch Operation | Tersedia |
| Image Transformation | Tersedia |
| Signed URL | Tersedia |
| Cache Purge | Tersedia |
| CDN Statistics | Tersedia |
| Health/Descriptor | Tersedia |

Untuk operasi Rename, Move, Delete, Batch, Signed URL, Cache Purge, Statistics, dan Health, gunakan **endpoint persis dari guide Kroombox CDN** ketika implementasi. Path detail operasi tersebut tidak ditulis di sini jika belum terkonfirmasi secara pasti dari sumber yang dianalisis.

---

# 56. Prinsip Implementasi Portal Ko+Lab

Gunakan prinsip:

```text
CDN = tempat binary file

MySQL = metadata dan relasi

Portal Backend = authentication + authorization

Frontend = UI
```

Jangan gunakan:

```text
CDN sebagai authorization utama
```

Portal tetap harus menentukan apakah user boleh:

```text
upload
view
download
delete
rename
move
```

asset.

---

# 57. Security Checklist

Sebelum production:

- [ ] API Key tidak berada di GitHub
- [ ] JWT CDN tidak berada di GitHub
- [ ] `.env` tidak tracked
- [ ] Credential tidak berada di frontend
- [ ] Private asset memakai signed URL
- [ ] Upload divalidasi backend
- [ ] Executable file ditolak
- [ ] Owner diperoleh dari session
- [ ] Audit log tidak menyimpan secret
- [ ] Error response tidak mengekspos CDN credential
- [ ] Legacy file tidak dihapus sebelum migration verification

---

# 58. Kesimpulan

Arsitektur Kroombox CDN yang direkomendasikan untuk Portal Ko+Lab:

```text
User
↓
Portal Frontend
↓
Portal Backend
↓
Permission & Validation
↓
Kroombox CDN
↓
fileId
↓
Portal MySQL Metadata
```

Kroombox CDN menjadi storage/delivery layer untuk binary asset, sedangkan Portal Ko+Lab tetap menjadi sumber utama untuk:

```text
user
role
ownership
permission
feature relation
quota
audit
```

Pendekatan ini memungkinkan Portal Ko+Lab mengelola seluruh upload secara terpusat tanpa menyimpan binary file baru di MySQL.
