# Prompt Pisahkan Tabel Mahasiswa dan Dosen di Management User

Bertindaklah sebagai senior full-stack developer.

Pelajari terlebih dahulu seluruh source code Portal Kolab terbaru, khususnya implementasi:

- Management User
- User Directory
- Member Management
- Import / Export Member
- Bulk Action
- Kelola Magang
- Kelola Workload
- Startup Cluster
- getAllMembers
- students
- lecturers
- internships
- workloads
- workload_members

Jangan membuat ulang fitur dari nol.

Lakukan refactor pada halaman Management User agar **data Mahasiswa dan Dosen dipisahkan menjadi dua tabel/sub-view berbeda**.

Jangan merusak seluruh fitur yang sudah berjalan.

---

# TUJUAN

Saat ini `User Directory` menampilkan Mahasiswa dan Dosen dalam satu tabel dan menggunakan filter:

```text
All Roles
Student
Lecturer
```

Ubah UX tersebut.

Di dalam:

`Management User → User Directory`

buat dua sub-tab:

```text
MAHASISWA
DOSEN
```

Sehingga struktur menjadi:

```text
MANAGEMENT USER

[ USER DIRECTORY ]
[ STARTUP CLUSTER ]
[ KELOLA MAGANG ]
[ KELOLA WORKLOAD ]

USER DIRECTORY

[ MAHASISWA  ] [ DOSEN ]
```

Default view:

```text
MAHASISWA
```

Jangan membuat route/page terpisah jika tidak diperlukan.

Tetap gunakan satu halaman Management User dengan state internal.

---

# 1. STATE FRONTEND

Jika saat ini menggunakan:

```ts
roleFilter
```

untuk memisahkan STUDENT dan LECTURER, ubah struktur menjadi state khusus:

```ts
type MemberDirectoryView =
  | 'students'
  | 'lecturers';

const [memberDirectoryView, setMemberDirectoryView] =
  useState<MemberDirectoryView>('students');
```

`roleFilter` tidak lagi diperlukan untuk memilih Student/Lecturer karena sudah dipisahkan berdasarkan sub-tab.

Jangan menghilangkan filter lain yang masih relevan.

---

# 2. UI SUB-TAB

Di bawah tab utama `USER DIRECTORY`, tambahkan:

```text
[ MAHASISWA 50 ] [ DOSEN 8 ]
```

Jumlah harus berasal dari data aktual.

Contoh:

```text
MAHASISWA
50

DOSEN
8
```

atau:

```text
MAHASISWA (50)
DOSEN (8)
```

Gunakan desain minimal dan konsisten dengan Portal Kolab.

Active tab harus terlihat jelas.

---

# 3. TABEL MAHASISWA

Ketika:

```text
memberDirectoryView = students
```

tampilkan tabel khusus Mahasiswa.

Kolom:

```text
CHECKBOX

NAME
NIM
STARTUP
JOBDESK
MAGANG
WORKLOAD
STATUS
OPERATIONS
```

Sehingga struktur:

| | Name | NIM | Startup | Jobdesk | Magang | Workload | Status | Operations |
|---|---|---|---|---|---|---|---|---|

Tetap gunakan UI existing.

---

# 4. DATA NAME MAHASISWA

Pada kolom Name tampilkan:

```text
Avatar / Initial

Nama Mahasiswa
STUDENT
```

Contoh:

```text
M

Muhammad Faisal Rahman
STUDENT
```

Jangan tampilkan Lecturer di tabel ini.

---

# 5. STARTUP MAHASISWA

Kolom Startup berasal dari:

```text
students.startup_id
+
startup_teams
```

Tampilkan nama Startup.

Contoh:

```text
KROOMBOX
UNIINSIDE
JAGOFARM
NGOLAB
```

Jika tidak memiliki startup:

```text
-
```

atau:

```text
NON STARTUP
```

ikuti style existing.

---

# 6. JOB DESK MAHASISWA

Gunakan job desk existing mahasiswa.

Jika kosong:

```text
-
```

Jangan tampilkan `undefined` atau `null`.

---

# 7. MAGANG MAHASISWA

Kolom:

```text
MAGANG
```

tetap menggunakan data:

`internships`

Mapping:

```text
PLANNED
→ AKAN MAGANG

ONGOING
→ SEDANG MAGANG

COMPLETED
→ SELESAI

CANCELLED
→ DIBATALKAN

null
→ TIDAK MAGANG
```

Badge existing jangan dirusak.

---

# 8. WORKLOAD MAHASISWA

Gunakan:

```text
workload_members
+
workloads
```

Tampilkan:

```text
Active Load
```

Contoh:

```text
0 · KOSONG
1 · RINGAN
2 · SEDANG
3 · TINGGI
```

Jangan menyimpan ulang total workload ke tabel students.

---

# 9. STATUS MAHASISWA

Kolom `STATUS` tetap merupakan status akun/member.

Contoh:

```text
ACTIVE
INACTIVE
PENDING
```

Jangan mencampurkan dengan Magang atau Workload.

---

# 10. FILTER TABEL MAHASISWA

Saat tab `MAHASISWA` aktif tampilkan filter:

```text
Search Nama / NIM

Startup

Status Magang

Workload

Status Member
```

Contoh UI:

```text
[ Startup ▼ ]
[ Status Magang ▼ ]
[ Workload ▼ ]
[ Status Member ▼ ]
[ Cari nama / NIM... ]
```

Filter Startup:

```text
Semua Startup
Non Startup
KROOMBOX
UNIINSIDE
JAGOFARM
...
```

Filter Magang:

```text
Semua
Tidak Magang
Akan Magang
Sedang Magang
Selesai
Dibatalkan
```

Filter Workload:

```text
Semua
0
1
2
3+
```

Status Member:

```text
Semua
Active
Inactive
Pending
```

---

# 11. HAPUS FILTER ALL ROLES

Pada screenshot/current implementation terdapat:

```text
All Roles
```

Karena Student dan Lecturer sudah dipisah menggunakan sub-tab, filter tersebut menjadi redundant.

Hapus:

```text
All Roles
```

dari User Directory.

Jangan menambah filter Student/Lecturer lagi di masing-masing tabel.

---

# 12. SEARCH MAHASISWA

Search placeholder:

```text
Cari nama atau NIM mahasiswa...
```

Search harus mencari minimal:

```text
name
NIM
```

Jika dataset besar, lakukan filtering server-side jika architecture existing mendukung.

Jika saat ini data masih reasonable dan sudah menggunakan frontend filtering, boleh mempertahankan mekanisme tersebut sementara.

---

# 13. TABEL DOSEN

Ketika:

```text
memberDirectoryView = lecturers
```

jangan menggunakan struktur tabel Mahasiswa.

Buat tabel khusus Dosen.

Kolom:

```text
CHECKBOX

NAME
NIP
KODE DOSEN
JOB DESK
BIMBINGAN
WORKLOAD
STATUS
OPERATIONS
```

Struktur:

| | Name | NIP | Kode Dosen | Job Desk | Bimbingan | Workload | Status | Operations |
|---|---|---|---|---|---|---|---|---|

Jangan tampilkan:

```text
STARTUP
MAGANG
```

pada tabel dosen karena tidak relevan.

---

# 14. NAME DOSEN

Tampilkan:

```text
Nama Dosen
LECTURER
```

Contoh:

```text
Dr. Example Lecturer
LECTURER
```

Gunakan style konsisten dengan Student.

---

# 15. NIP DOSEN

Gunakan identifier existing dari:

```text
lecturers.nip
```

Jangan menggunakan studentId secara konseptual untuk tampilan dosen apabila type baru dapat dibuat.

---

# 16. KODE DOSEN

Gunakan:

```text
lecturers.code
```

atau field existing yang saat ini digunakan sebagai lecturerCode.

Jika kosong:

```text
-
```

---

# 17. JOB DESK DOSEN

Jika dosen memiliki:

```text
job_desks
```

tampilkan secara readable.

Jika berupa array/JSON:

```text
[
 "Pembimbing",
 "Koordinator"
]
```

ubah UI menjadi:

```text
Pembimbing
Koordinator
```

atau badge kecil.

Jangan tampilkan raw JSON.

---

# 18. BIMBINGAN DOSEN

Tambahkan kolom:

```text
BIMBINGAN
```

Hitung jumlah mahasiswa bimbingan dosen berdasarkan:

```text
internships.academic_supervisor_nip
=
lecturers.nip
```

Tampilkan contoh:

```text
0 Mahasiswa

3 Mahasiswa

8 Mahasiswa
```

atau badge:

```text
3 BIMBINGAN
```

Klik badge dapat membuka modal ringkas:

```text
Mahasiswa Bimbingan

Muhammad Faisal
NGOLAB
Sedang Magang

Ayesha
KROOMBOX
Selesai
```

Jika fitur tersebut terlalu besar untuk refactor ini, minimal jadikan angka clickable menuju detail Lecturer.

Jangan menghitung bimbingan berdasarkan Workload PIC.

---

# 19. WORKLOAD DOSEN

Dosen juga bisa terlibat dalam workload.

Kolom:

```text
WORKLOAD
```

menggunakan:

```text
workload_members.member_id
workload_members.member_role = LECTURER
```

Hitung:

```text
Active Load
```

Jika dosen menjadi PIC tetapi tidak menjadi participant, jangan otomatis hitung PIC sebagai member workload kecuali business rule existing memang demikian.

Jika diperlukan, detail dapat membedakan:

```text
Participant: 2
PIC: 3
```

Tetapi table utama cukup:

```text
Active Load
```

---

# 20. STATUS DOSEN

Gunakan status akun:

```text
is_active
is_approved
```

Mapping seperti Student.

---

# 21. FILTER DOSEN

Ketika tab DOSEN aktif, filter berubah.

Tampilkan:

```text
Search Nama / NIP / Kode Dosen

Status Member

Workload

Bimbingan
```

Bimbingan:

```text
Semua
Tidak Ada Bimbingan
Ada Bimbingan
```

Workload:

```text
Semua
0
1
2
3+
```

Jangan tampilkan filter:

```text
Startup
Status Magang
```

pada tabel dosen.

---

# 22. SEARCH DOSEN

Placeholder:

```text
Cari nama, NIP, atau kode dosen...
```

Search terhadap:

```text
name
nip
lecturerCode/code
```

---

# 23. IMPORT DATA

Fitur Import Data existing tetap digunakan.

Namun behavior harus mengikuti sub-tab aktif.

## Jika MAHASISWA aktif

Klik:

```text
IMPORT DATA
```

langsung membuka:

```text
Import Data Mahasiswa
```

Tidak perlu lagi menanyakan:

```text
Mahasiswa / Dosen
```

karena konteks sudah diketahui.

## Jika DOSEN aktif

Klik:

```text
IMPORT DATA
```

membuka:

```text
Import Data Dosen
```

Gunakan workflow existing:

```text
Upload
Preview
Validation
Confirm
Result
```

Jangan membuat implementation import kedua.

Reuse implementation existing.

---

# 24. EXPORT DATA

Export mengikuti active sub-tab.

Jika Mahasiswa:

```text
Export Data Mahasiswa
```

Support:

```text
Excel
PDF
```

Jika Dosen:

```text
Export Data Dosen
```

Support:

```text
Excel
PDF
```

Export filter current table jika fitur itu sudah tersedia.

---

# 25. NEW USER

Button:

```text
NEW USER
```

tetap tersedia.

Namun behavior dapat mengikuti active tab.

Jika tab mahasiswa:

```text
Tambah Mahasiswa
```

Form default role:

```text
STUDENT
```

Jika tab dosen:

```text
Tambah Dosen
```

Form default role:

```text
LECTURER
```

Jika modal existing masih menyediakan role switch, boleh dipertahankan.

Tetapi preselect berdasarkan tab aktif.

---

# 26. BULK ACTION MAHASISWA

Bulk Action untuk Student boleh memiliki:

```text
Tetapkan Magang
Ubah Status Magang
Selesaikan Magang
Edit Data
Ubah Status Member
Hapus Member
```

Gunakan action existing.

Jangan membuat ulang bulk internship.

---

# 27. BULK ACTION DOSEN

Dosen tidak boleh memiliki:

```text
Tetapkan Magang
Ubah Status Magang
Selesaikan Magang
```

Bulk Action dosen cukup:

```text
Ubah Status Member
Edit Data
Hapus Member
```

atau action Lecturer existing yang relevan.

Jangan menampilkan action tidak relevan dalam disabled state jika dapat disembunyikan.

---

# 28. CHECKBOX SELECTION HARUS TERPISAH

Selection Student dan Lecturer tidak boleh tercampur.

Jika admin:

```text
pilih 5 mahasiswa
```

kemudian berpindah ke:

```text
DOSEN
```

reset selection:

```text
selectedMembers = []
```

Hal ini mencegah Bulk Action salah target.

Lakukan hal yang sama ketika berpindah kembali.

---

# 29. FILTER STATE TERPISAH

Gunakan filter state terpisah.

Contoh:

```ts
studentFilters
lecturerFilters
```

Jangan menggunakan satu filter Startup/Magang untuk Lecturer.

Contoh:

```ts
interface StudentDirectoryFilters {
  search: string;
  startupId: string;
  internshipStatus: string;
  workload: string;
  memberStatus: string;
}

interface LecturerDirectoryFilters {
  search: string;
  workload: string;
  supervision: string;
  memberStatus: string;
}
```

---

# 30. BACKEND RESPONSE

Pelajari backend terbaru.

Jika saat ini:

```text
getAllMembers
```

mengembalikan Student + Lecturer sekaligus, ada dua opsi.

## Opsi yang direkomendasikan

Buat endpoint/query terpisah:

```text
GET /api/admin/members/students
GET /api/admin/members/lecturers
```

atau naming sesuai architecture existing.

Keuntungannya:

```text
Student response
tidak perlu field Lecturer.

Lecturer response
tidak perlu field Student.
```

Namun jangan duplikasi business logic.

Gunakan service/query helper reusable.

---

# 31. STUDENT ADMIN DTO

Response Student minimal:

```json
{
  "id": "607012400003",
  "name": "Muhammad Faisal",
  "role": "STUDENT",

  "startup": {
    "id": "startup-xxx",
    "name": "KROOMBOX"
  },

  "jobDesk": "Backend",

  "internship": {
    "status": "ONGOING"
  },

  "workload": {
    "activeLoad": 2
  },

  "isApproved": true,
  "isActive": true
}
```

---

# 32. LECTURER ADMIN DTO

Response Lecturer minimal:

```json
{
  "id": "232411567",
  "name": "Nama Dosen",
  "role": "LECTURER",

  "code": "ABC",

  "jobDesks": [
    "Pembimbing"
  ],

  "supervision": {
    "active": 4,
    "total": 7
  },

  "workload": {
    "activeLoad": 1
  },

  "isApproved": true,
  "isActive": true
}
```

Jangan return:

```text
password
password hash
JWT
secret
```

---

# 33. SUPERVISION COUNT

Untuk Lecturer query:

```text
internships.academic_supervisor_nip
=
lecturers.nip
```

Hitung minimal:

```text
activeSupervision
totalSupervision
```

Active supervision:

```text
internships.status IN (
  'PLANNED',
  'ONGOING'
)
```

Total:

```text
semua internship
```

UI utama boleh menampilkan:

```text
4 AKTIF
```

Detail dapat menampilkan:

```text
4 Aktif
7 Total History
```

---

# 34. HINDARI N+1 QUERY

Jangan:

```text
ambil 50 mahasiswa
kemudian 50 query startup
50 query magang
50 query workload
```

Gunakan:

```text
JOIN
LEFT JOIN
GROUP BY
subquery
conditional aggregation
```

atau beberapa bulk queries yang efisien.

Hal yang sama untuk Lecturer:

```text
supervision count
workload count
```

harus dilakukan secara efisien.

---

# 35. TABLE LAYOUT

Tabel Mahasiswa dan Dosen harus dapat menggunakan lebar halaman lebih baik.

Current screenshot menunjukkan table sangat lebar.

Lakukan:

- responsive column width;
- hindari whitespace berlebihan;
- horizontal scroll hanya jika dibutuhkan;
- Operations tetap mudah dijangkau;
- header dan filter row align dengan kolom.

Jangan mengecilkan font terlalu ekstrem hanya agar seluruh kolom muat.

---

# 36. STICKY COLUMN OPSIONAL

Jika table sangat lebar, boleh gunakan:

```text
NAME
```

sebagai sticky column kiri.

Dan:

```text
OPERATIONS
```

sebagai sticky column kanan.

Hanya lakukan jika tidak merusak responsiveness dan style existing.

---

# 37. PAGINATION

Jika User Directory belum mempunyai pagination dan jumlah data mulai besar, tambahkan pagination ringan.

Contoh:

```text
10
25
50
100
```

rows per page.

Jika backend pagination sudah tersedia, gunakan server-side.

Jika dataset saat ini kecil, pagination frontend masih diperbolehkan.

Jangan memprioritaskan ini jika menyebabkan refactor besar.

---

# 38. EMPTY STATE

Mahasiswa kosong:

```text
Belum ada data mahasiswa.
```

Dosen kosong:

```text
Belum ada data dosen.
```

Filter tidak menemukan hasil:

```text
Tidak ada mahasiswa yang sesuai filter.
```

atau:

```text
Tidak ada dosen yang sesuai filter.
```

Jangan gunakan empty state yang menyebut `user` secara generik.

---

# 39. REFRESH

Button Refresh tetap tersedia.

Jika Mahasiswa aktif:

```text
refresh student directory
```

Jika Dosen aktif:

```text
refresh lecturer directory
```

Jangan selalu refetch seluruh data apabila endpoint sudah terpisah.

---

# 40. URL / STATE OPSIONAL

Jika architecture saat ini belum memakai React Router untuk sub-view, cukup gunakan state internal.

Jangan menambahkan React Router hanya untuk fitur ini.

Jika routing sudah tersedia setelah development terbaru, boleh gunakan query:

```text
?directory=students
?directory=lecturers
```

agar state dapat dipertahankan saat refresh.

Tetapi ini bukan requirement utama.

---

# 41. AUTHORIZATION

Kedua tabel tetap hanya berada di:

```text
ADMIN
```

Backend endpoint:

```text
students management
lecturers management
```

harus:

```text
requireSession
+
ADMIN guard
```

STUDENT:

```text
403
```

LECTURER:

```text
403
```

jika mencoba endpoint Admin.

Jangan mengubah endpoint Lecturer read-only yang telah dibuat untuk Portal Dosen.

---

# 42. JANGAN DUPLIKASI DATABASE

Tetap gunakan:

```text
students
lecturers
startup_teams
internships
workloads
workload_members
```

Jangan membuat:

```text
admin_students
admin_lecturers
```

atau tabel duplicate lainnya.

Pemisahan hanya pada:

```text
query
DTO
UI
```

bukan duplikasi data.

---

# 43. JANGAN MERUSAK FITUR EXISTING

Pastikan tetap bekerja:

```text
Kelola Member
Add Member
Edit Member
Delete Member
Import Member
Export Member
Bulk Action

Startup Cluster

Kelola Magang
Individual Magang
Bulk Magang
Import Magang

Kelola Workload

Role Student
Status Saya

Role Lecturer
Mahasiswa
Bimbingan Saya
Workload Saya
```

---

# 44. TESTING FRONTEND / LOGIC

Tambahkan test atau minimal verification untuk:

1. Default User Directory membuka Mahasiswa.
2. Tabel Mahasiswa hanya berisi STUDENT.
3. Tabel Dosen hanya berisi LECTURER.
4. Switching Student → Lecturer bekerja.
5. Selection Student di-reset ketika pindah ke Lecturer.
6. Filter Student tidak mempengaruhi Lecturer.
7. Filter Lecturer tidak mempengaruhi Student.
8. Startup filter hanya tampil di Student.
9. Magang filter hanya tampil di Student.
10. Bimbingan filter hanya tampil di Lecturer.
11. Tetapkan Magang hanya tersedia pada Student.
12. Import Student menggunakan template Student.
13. Import Lecturer menggunakan template Lecturer.
14. Export Student export Student saja.
15. Export Lecturer export Lecturer saja.

---

# 45. BACKEND TEST

Tambahkan test:

16. Admin dapat GET student directory.
17. Admin dapat GET lecturer directory.
18. Student directory tidak mengandung Lecturer.
19. Lecturer directory tidak mengandung Student.
20. Student response memiliki startup summary.
21. Student response memiliki internship summary.
22. Student response memiliki workload summary.
23. Lecturer response memiliki supervision count.
24. Lecturer response memiliki workload summary.
25. Password/hash tidak ada dalam response.
26. Student role access admin endpoint → 403.
27. Lecturer role access admin endpoint → 403.
28. Unauthenticated → 401.

---

# 46. BUILD

Setelah selesai:

Frontend:

```text
npm run build
```

Backend:

```text
npm test
```

Jalankan seluruh test existing dan test baru.

Jika ada error:

- analisis;
- perbaiki;
- run ulang.

Jangan menyatakan implementation selesai sebelum build dan tests berhasil.

---

# 47. TARGET UI AKHIR

## MAHASISWA

```text
MANAGEMENT USER

USER DIRECTORY

[ MAHASISWA 50 ] [ DOSEN 8 ]

[ Refresh ]
[ Startup ▼ ]
[ Status Magang ▼ ]
[ Workload ▼ ]
[ Status Member ▼ ]
[ Cari nama / NIM... ]
[ + NEW USER ]

[ IMPORT DATA ]
[ EXPORT DATA ]
[ TETAPKAN MAGANG ]
[ BULK ACTION ]

----------------------------------------------------------

NAME
NIM
STARTUP
JOBDESK
MAGANG
WORKLOAD
STATUS
OPERATIONS
```

---

## DOSEN

```text
MANAGEMENT USER

USER DIRECTORY

[ MAHASISWA 50 ] [ DOSEN 8 ]

[ Refresh ]
[ Bimbingan ▼ ]
[ Workload ▼ ]
[ Status Member ▼ ]
[ Cari nama / NIP / kode dosen... ]
[ + NEW USER ]

[ IMPORT DATA ]
[ EXPORT DATA ]
[ BULK ACTION ]

----------------------------------------------------------

NAME
NIP
KODE DOSEN
JOB DESK
BIMBINGAN
WORKLOAD
STATUS
OPERATIONS
```

---

# 48. ACCEPTANCE CRITERIA

Fitur dianggap selesai jika:

```text
✓ Mahasiswa dan Dosen tidak lagi berada pada tabel yang sama

✓ User Directory mempunyai:
  - tab Mahasiswa
  - tab Dosen

✓ All Roles filter dihapus

MAHASISWA
✓ Memiliki tabel khusus
✓ NIM terlihat
✓ Startup terlihat
✓ Job Desk terlihat
✓ Magang terlihat
✓ Workload terlihat
✓ Status terlihat
✓ Filter khusus mahasiswa tersedia

DOSEN
✓ Memiliki tabel khusus
✓ NIP terlihat
✓ Kode Dosen terlihat
✓ Job Desk terlihat
✓ Jumlah Bimbingan terlihat
✓ Workload terlihat
✓ Status terlihat
✓ Filter khusus dosen tersedia

IMPORT / EXPORT
✓ Mengikuti table aktif
✓ Student dan Lecturer tidak tercampur

BULK ACTION
✓ Selection Student dan Lecturer tidak tercampur
✓ Magang hanya tersedia pada Student

BACKEND
✓ Tidak ada duplikasi database
✓ Tidak ada N+1 query
✓ API Admin protected

QUALITY
✓ Existing feature tetap bekerja
✓ Backend tests berhasil
✓ Frontend build berhasil
```

---

# 49. IMPLEMENTATION REPORT

Setelah implementasi selesai berikan laporan:

```text
MANAGEMENT USER SEPARATION SUMMARY

1. Existing Implementation Reviewed
2. UI Architecture Changes
3. Student Directory
4. Lecturer Directory
5. Student Filters
6. Lecturer Filters
7. Student Bulk Actions
8. Lecturer Bulk Actions
9. Import Behavior
10. Export Behavior
11. Lecturer Supervision Count
12. Student Internship Summary
13. Student/Lecturer Workload Summary
14. Backend Endpoints / DTO
15. Query Optimization
16. Authorization
17. Files Added
18. Files Modified
19. Tests Added
20. Test Results
21. Frontend Build Result
22. Known Limitations
```

Jangan hanya memberikan rekomendasi.

Implementasikan perubahan langsung pada source code Portal Kolab, jalankan seluruh tests dan frontend build, perbaiki error yang ditemukan, kemudian berikan implementation summary.
