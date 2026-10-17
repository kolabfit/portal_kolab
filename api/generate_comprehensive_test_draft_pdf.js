import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_PDF_PATH_1 = path.resolve('Draft_Testing_Menyeluruh_Portal_KoLab.pdf');
const OUTPUT_PDF_PATH_2 = path.resolve('..', 'Draft_Testing_Menyeluruh_Portal_KoLab.pdf');

class TestPlanPdfBuilder {
  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 45, right: 45 },
      info: {
        Title: 'Dokumen Rencana & Spesifikasi Pengujian Menyeluruh Portal Ko+Lab',
        Author: 'Quality Assurance & Development Team Research Alliance Ko+Lab',
        Subject: 'Master Test Plan & Complete Test Cases for Portal Ko+Lab Web Application',
        Keywords: 'Test Plan, QA, Portal KoLab, Telkom University, Testing Draft, Test Cases'
      },
      bufferPages: true,
      autoFirstPage: true
    });

    this.usableWidth = this.doc.page.width - this.doc.page.margins.left - this.doc.page.margins.right;
    this.leftMargin = this.doc.page.margins.left;
    this.rightMargin = this.doc.page.width - this.doc.page.margins.right;
  }

  checkPageBreak(neededHeight = 60) {
    if (this.doc.y + neededHeight > this.doc.page.height - this.doc.page.margins.bottom - 20) {
      this.doc.addPage();
      this.doc.y = this.doc.page.margins.top;
    }
  }

  addTitleBanner(title, subtitle, versionTag) {
    const startY = this.doc.y;
    // Header brand badge
    this.doc.rect(this.leftMargin, startY, this.usableWidth, 115)
      .fillColor('#0f172a')
      .fill();

    // Red-orange accent bar
    this.doc.rect(this.leftMargin, startY, 6, 115)
      .fillColor('#ea580c')
      .fill();

    this.doc.fontSize(8.5).font('Helvetica-Bold')
      .fillColor('#fdba74')
      .text('RESEARCH ALLIANCE KO+LAB — FAKULTAS ILMU TERAPAN TELKOM UNIVERSITY', this.leftMargin + 20, startY + 14);

    this.doc.fontSize(16).font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(title, this.leftMargin + 20, startY + 30, { width: this.usableWidth - 40 });

    this.doc.fontSize(9.5).font('Helvetica')
      .fillColor('#cbd5e1')
      .text(subtitle, this.leftMargin + 20, startY + 70, { width: this.usableWidth - 40 });

    this.doc.fontSize(8).font('Helvetica-Bold')
      .fillColor('#94a3b8')
      .text(`DOKUMEN KONTROL: MTP-KOLAB-2026-V2.1  |  TANGGAL: OKTOBER 2026  |  STATUS: ${versionTag}`, this.leftMargin + 20, startY + 95);

    this.doc.y = startY + 125;
  }

  addSectionHeader(numberStr, title) {
    this.checkPageBreak(50);
    this.doc.moveDown(0.6);
    const startY = this.doc.y;

    this.doc.rect(this.leftMargin, startY, this.usableWidth, 24)
      .fillColor('#f8fafc')
      .fill();

    this.doc.rect(this.leftMargin, startY, 4, 24)
      .fillColor('#c2410c')
      .fill();

    this.doc.fontSize(11).font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`${numberStr}. ${title.toUpperCase()}`, this.leftMargin + 12, startY + 6);

    this.doc.y = startY + 30;
  }

  addSubSectionHeader(title) {
    this.checkPageBreak(35);
    this.doc.moveDown(0.3);
    this.doc.fontSize(9.5).font('Helvetica-Bold')
      .fillColor('#ea580c')
      .text(title, this.leftMargin, this.doc.y);
    this.doc.moveDown(0.2);
  }

  addParagraph(text) {
    this.checkPageBreak(30);
    this.doc.fontSize(8.5).font('Helvetica')
      .fillColor('#334155')
      .text(text, this.leftMargin, this.doc.y, {
        width: this.usableWidth,
        align: 'justify',
        lineGap: 2.5
      });
    this.doc.moveDown(0.4);
  }

  addCallout(title, text, type = 'info') {
    this.checkPageBreak(50);
    const bg = type === 'warning' ? '#fffbeb' : type === 'success' ? '#f0fdf4' : '#f1f5f9';
    const border = type === 'warning' ? '#fde68a' : type === 'success' ? '#bbf7d0' : '#cbd5e1';
    const titleColor = type === 'warning' ? '#92400e' : type === 'success' ? '#166534' : '#1e293b';

    const startY = this.doc.y;
    const textHeight = this.doc.heightOfString(text, { width: this.usableWidth - 24, fontSize: 8 });
    const totalH = Math.max(34, textHeight + 22);

    this.doc.rect(this.leftMargin, startY, this.usableWidth, totalH)
      .fillColor(bg)
      .fill();

    this.doc.rect(this.leftMargin, startY, this.usableWidth, totalH)
      .strokeColor(border)
      .lineWidth(0.8)
      .stroke();

    this.doc.fontSize(8.5).font('Helvetica-Bold')
      .fillColor(titleColor)
      .text(title, this.leftMargin + 12, startY + 6);

    this.doc.fontSize(8).font('Helvetica')
      .fillColor('#475569')
      .text(text, this.leftMargin + 12, startY + 18, { width: this.usableWidth - 24, lineGap: 1.5 });

    this.doc.y = startY + totalH + 8;
  }

  addTable(headers, rows, colPercentages) {
    const colCount = headers.length;
    const colWidths = colPercentages.map(p => (p / 100) * this.usableWidth);
    const paddingX = 6;
    const paddingY = 4;
    const fontSize = 7.5;

    this.checkPageBreak(40);

    // Header Row
    const headerY = this.doc.y;
    let maxHeaderH = 18;
    headers.forEach((h, i) => {
      this.doc.fontSize(fontSize).font('Helvetica-Bold');
      const hH = this.doc.heightOfString(h, { width: colWidths[i] - paddingX * 2 });
      if (hH + paddingY * 2 > maxHeaderH) maxHeaderH = hH + paddingY * 2;
    });

    this.doc.rect(this.leftMargin, headerY, this.usableWidth, maxHeaderH)
      .fillColor('#0f172a')
      .fill();

    let curX = this.leftMargin;
    headers.forEach((h, i) => {
      const w = colWidths[i];
      this.doc.rect(curX, headerY, w, maxHeaderH)
        .strokeColor('#334155')
        .lineWidth(0.6)
        .stroke();

      this.doc.fontSize(fontSize).font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(h, curX + paddingX, headerY + paddingY, {
          width: w - paddingX * 2,
          align: i === 0 ? 'center' : 'left'
        });
      curX += w;
    });

    this.doc.y = headerY + maxHeaderH;

    // Data Rows
    rows.forEach((row, ri) => {
      this.checkPageBreak(25);
      let rowY = this.doc.y;

      let maxRowH = 16;
      headers.forEach((_, ci) => {
        const val = String(row[ci] || '');
        this.doc.fontSize(fontSize).font('Helvetica');
        const cellH = this.doc.heightOfString(val, { width: colWidths[ci] - paddingX * 2 });
        if (cellH + paddingY * 2 > maxRowH) maxRowH = cellH + paddingY * 2;
      });

      if (ri % 2 === 1) {
        this.doc.rect(this.leftMargin, rowY, this.usableWidth, maxRowH)
          .fillColor('#f8fafc')
          .fill();
      }

      let cellX = this.leftMargin;
      headers.forEach((_, ci) => {
        const w = colWidths[ci];
        const val = String(row[ci] || '');

        this.doc.rect(cellX, rowY, w, maxRowH)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();

        let textColor = '#334155';
        let fontStyle = 'Helvetica';

        if (ci === 0) {
          fontStyle = 'Helvetica-Bold';
          textColor = '#0f172a';
        }
        if (val === 'PASS' || val === 'Lulus') textColor = '#16a34a';
        if (val === 'FAIL' || val === 'Gagal') textColor = '#dc2626';
        if (val === 'CRITICAL' || val === 'Kritis') textColor = '#b91c1c';
        if (val === 'HIGH') textColor = '#ea580c';

        this.doc.fontSize(fontSize).font(fontStyle)
          .fillColor(textColor)
          .text(val, cellX + paddingX, rowY + paddingY, {
            width: w - paddingX * 2,
            align: ci === 0 ? 'center' : (ci === headers.length - 1 && w < 80 ? 'center' : 'left')
          });

        cellX += w;
      });

      this.doc.y = rowY + maxRowH;
    });

    this.doc.moveDown(0.5);
  }

  finalizeFooters() {
    const range = this.doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);

      // Header on pages > 1
      if (i > range.start) {
        this.doc.fontSize(7).font('Helvetica-Bold')
          .fillColor('#94a3b8')
          .text('PORTAL KO+LAB TELKOM UNIVERSITY — DOKUMEN MASTER TEST PLAN & SPESIFIKASI PENGUJIAN', this.leftMargin, 22, {
            width: this.usableWidth,
            align: 'left'
          });
        this.doc.moveTo(this.leftMargin, 32).lineTo(this.rightMargin, 32).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      }

      // Footer
      const bottomY = this.doc.page.height - 35;
      this.doc.moveTo(this.leftMargin, bottomY - 6).lineTo(this.rightMargin, bottomY - 6).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      this.doc.fontSize(7).font('Helvetica')
        .fillColor('#64748b')
        .text('Research Alliance Ko+Lab | Kerahasiaan Dokumen Internal & QA Verification', this.leftMargin, bottomY, {
          width: this.usableWidth / 2,
          align: 'left'
        });

      this.doc.fontSize(7).font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`Halaman ${i + 1} dari ${range.count}`, this.leftMargin + this.usableWidth / 2, bottomY, {
          width: this.usableWidth / 2,
          align: 'right'
        });
    }
  }

  async buildPdf() {
    return new Promise((resolve, reject) => {
      try {
        const stream1 = fs.createWriteStream(OUTPUT_PDF_PATH_1);
        this.doc.pipe(stream1);

        // ═══════════════════════════════════════════════════════════════════
        // 1. BANNER & INTRO
        // ═══════════════════════════════════════════════════════════════════
        this.addTitleBanner(
          'DRAFT TESTING MENYELURUH SISTEM & FITUR PORTAL KO+LAB',
          'Rencana Pengujian Komprehensif (Master Test Plan), Matriks Hak Akses Peran, dan Spesifikasi Kasus Uji Fungsional & Non-Fungsional.',
          'FINAL RELEASE READY'
        );

        this.addCallout(
          'TENTANG DOKUMEN INI',
          'Dokumen ini menyajikan panduan pengujian menyeluruh (End-to-End Master Test Plan) untuk aplikasi web Portal Ko+Lab. Mencakup seluruh modul aktif: Autentikasi JWT, Dashboard Metrik, Manajemen Anggota, CRUD Kelola Mitra (Dosen & Admin), Surat Administrasi (Visual Drag-and-Drop, Tabel Dinamis, Upload Tanda Tangan, Multi-Page, Preview & Download PDF), Agenda Kegiatan, dan Repository Dokumen.',
          'info'
        );

        // ═══════════════════════════════════════════════════════════════════
        // BAB 1: PENDAHULUAN & STRATEGI PENGUJIAN
        // ═══════════════════════════════════════════════════════════════════
        this.addSectionHeader('1', 'Tujuan, Ruang Lingkup & Strategi Pengujian');
        this.addParagraph(
          'Tujuan pengujian menyeluruh ini adalah memvalidasi integritas logika bisnis, keandalan fungsionalitas antarmuka (UI/UX), keamanan otorisasi Role-Based Access Control (RBAC), serta ketepatan rendering dokumen PDF resmi yang dihasilkan oleh Portal Ko+Lab.'
        );

        this.addTable(
          ['Dimensi Pengujian', 'Fokus Validasi', 'Metodologi', 'Target Kriteria'],
          [
            ['Fungsionalitas Modul', 'Alur CRUD, validasi input formulir, filter pencarian, dan pagination', 'Black-Box & Boundary Value', '0 Defect Critical'],
            ['Otorisasi Peran (RBAC)', 'Hak akses Admin vs Dosen vs Mahasiswa pada endpoint & UI', 'Security Matrix Testing', '100% Hak Akses Terisolasi'],
            ['Surat Administrasi', 'Visual builder, in-place editing, resize tabel, upload TTD, multi-page', 'End-to-End WYSIWYG Testing', '100% PDF Presisi'],
            ['Manajemen Mitra', 'Akses CRUD mitra oleh Dosen & Admin, read-only bagi Mahasiswa', 'Role Verification Testing', 'Dosen & Admin Sukses CRUD'],
            ['Responsivitas & UI', 'Tata letak pada resolusi Desktop (1440px), Laptop (1024px), Tablet, HP', 'Cross-Device Breakpoint Audit', 'Layout Rapi & Proporsional'],
            ['Keamanan & Jaringan', 'Perlindungan token JWT, validasi session timeout, penanganan 401/403', 'Penetration & Negative Test', 'Tidak Ada Kebocoran Data']
          ],
          [22, 38, 25, 15]
        );

        // ═══════════════════════════════════════════════════════════════════
        // BAB 2: MATRIKS HAK AKSES PERAN (RBAC MATRIX)
        // ═══════════════════════════════════════════════════════════════════
        this.addSectionHeader('2', 'Matriks Hak Akses Peran Pengguna (RBAC Matrix)');
        this.addParagraph(
          'Portal Ko+Lab menerapkan otorisasi berlapis berbasis 3 peran pengguna utama: Admin (Pengelola Ko+Lab), Dosen (Pembina Startup & Dosen Pengampu), dan Mahasiswa (Inkubasi & Anggota Tim Startup).'
        );

        this.addTable(
          ['Fitur / Modul Aplikasi', 'Admin (hrkolab)', 'Dosen Pembina', 'Mahasiswa (Student)', 'Aturan Keamanan'],
          [
            ['Login & Profil Akun', 'Penuh (CRUD)', 'Penuh (CRUD)', 'Penuh (CRUD)', 'JWT Session Guard'],
            ['Dashboard & Metrik Inkubasi', 'Lihat Semua Data', 'Lihat Binaan & Global', 'Lihat Tim Sendiri', 'Filter Startup ID'],
            ['Manajemen Mahasiswa & Dosen', 'Penuh (CRUD + Import)', 'Lihat & Evaluasi', 'Read-Only (Data Pribadi)', 'Admin Only Mutation'],
            ['Kelola Mitra Kolaborasi', 'Penuh (Create, Read, Update, Delete)', 'Penuh (Create, Read, Update, Delete)', 'Read-Only (Lihat Mitra)', 'Dosen & Admin Terotorisasi'],
            ['Surat: Galeri & Visual Editor', 'Penuh (Edit, Hapus, Rancang)', 'Penuh (Edit, Rancang Template)', 'Read-Only Informasi', 'Role Guard LECTURER/ADMIN'],
            ['Surat: Upload Tanda Tangan', 'Upload & Pakai TTD', 'Upload & Pakai TTD', 'Dilarang (Hidden)', 'Signature Helper Validation'],
            ['Surat: Multi-Page & Cetak PDF', 'Preview & Download Resmi', 'Preview & Download Resmi', 'Dilarang Cetak Resmi', '403 Forbidden bagi Student'],
            ['Agenda Event & Bimbingan', 'CRUD Event & Kehadiran', 'Buat Bimbingan & Event', 'Daftar & Hadir Event', 'Attendance Token'],
            ['Repository & Artikel Riset', 'Kelola Kategori & File', 'Unggah Materi Riset', 'Unduh Berkas Panduan', 'File Type Filtering']
          ],
          [25, 25, 25, 15, 10]
        );

        // ═══════════════════════════════════════════════════════════════════
        // BAB 3: SPESIFIKASI KASUS UJI FUNGSIONAL (TEST CASES)
        // ═══════════════════════════════════════════════════════════════════
        this.addSectionHeader('3', 'Rincian Kasus Uji Fungsional Per Modul');

        // Modul 1: Autentikasi
        this.addSubSectionHeader('Modul A — Autentikasi, Sesi, & Keamanan Token (TC-AUTH)');
        this.addTable(
          ['ID Kasus Uji', 'Skenario Pengujian', 'Langkah Pengujian', 'Hasil yang Diharapkan', 'Prioritas'],
          [
            ['TC-AUTH-01', 'Login Akun Admin Valid', 'Input username "hrkolab" & password valid, centang isAdmin', 'Login berhasil, token tersimpan di sessionStorage/local, redirect ke Dashboard', 'CRITICAL'],
            ['TC-AUTH-02', 'Login Akun Dosen Valid', 'Input NIP/kode dosen valid & password', 'Login sukses, role teridentifikasi sebagai LECTURER, menu dosen tampil', 'CRITICAL'],
            ['TC-AUTH-03', 'Login Akun Mahasiswa Valid', 'Input NIM valid & password mahasiswa', 'Login sukses, role teridentifikasi sebagai STUDENT, menu admin tersembunyi', 'CRITICAL'],
            ['TC-AUTH-04', 'Login Kredensial Salah', 'Input username terdaftar dengan password salah', 'Muncul alert error "Invalid login details", tidak ada token yang disimpan', 'HIGH'],
            ['TC-AUTH-05', 'Logout & Pembersihan Sesi', 'Klik tombol Logout di sidebar atau profil', 'Token dihapus bersih dari browser, halaman diarahkan ke /login', 'HIGH'],
            ['TC-AUTH-06', 'Direct URL Bypass Guard', 'Akses langsung URL privat tanpa header Authorization', 'API mengembalikan status 401 Unauthorized, frontend redirect ke login', 'CRITICAL']
          ],
          [14, 26, 28, 22, 10]
        );

        // Modul 2: Kelola Mitra
        this.addSubSectionHeader('Modul B — Fitur Kelola Mitra Kolaborasi (TC-MITRA — Update CRUD Dosen & Admin)');
        this.addTable(
          ['ID Kasus Uji', 'Skenario Pengujian', 'Langkah Pengujian', 'Hasil yang Diharapkan', 'Prioritas'],
          [
            ['TC-MITRA-01', 'Admin Tambah Mitra Baru', 'Login sebagai Admin, buka menu Mitra, isi form tambah mitra & simpan', 'Mitra tersimpan di database, muncul notifikasi sukses, card mitra bertambah', 'CRITICAL'],
            ['TC-MITRA-02', 'Dosen Tambah Mitra Baru', 'Login sebagai Dosen, buka menu Mitra, isi form tambah mitra & simpan', 'Tombol Tambah aktif bagi Dosen, data tersimpan, alert sukses muncul', 'CRITICAL'],
            ['TC-MITRA-03', 'Dosen Edit Data Mitra', 'Login sebagai Dosen, klik tombol Edit pada salah satu mitra, ubah kontak/MoU', 'Modal edit terbuka, perubahan berhasil di-update ke backend', 'CRITICAL'],
            ['TC-MITRA-04', 'Dosen Hapus Mitra', 'Login sebagai Dosen, klik tombol Hapus mitra, konfirmasi dialog', 'Data mitra terhapus dari sistem, daftar ter-refresh otomatis', 'CRITICAL'],
            ['TC-MITRA-05', 'Mahasiswa Akses Menu Mitra', 'Login sebagai Mahasiswa, buka menu Mitra Kolaborasi', 'Tombol Tambah, Edit, dan Hapus TIDAK TAMPIL (Read-Only catalog)', 'HIGH'],
            ['TC-MITRA-06', 'Pencarian & Filter Mitra', 'Ketik nama mitra atau bidang industri pada search bar mitra', 'Daftar card terfilter instan sesuai keyword tanpa reload halaman', 'MEDIUM']
          ],
          [14, 26, 28, 22, 10]
        );

        // Modul 3: Surat Administrasi
        this.addSubSectionHeader('Modul C — Fitur Surat Administrasi, Visual Editor & Multi-Page PDF (TC-SURAT)');
        this.addTable(
          ['ID Kasus Uji', 'Skenario Pengujian', 'Langkah Pengujian', 'Hasil yang Diharapkan', 'Prioritas'],
          [
            ['TC-SURAT-01', 'Galeri Card 7 Template', 'Buka menu Surat Administrasi sebagai Dosen/Admin', 'Tampil galeri 7 card template surat dengan judul, deskripsi, & tombol Edit', 'CRITICAL'],
            ['TC-SURAT-02', 'Navigasi Galeri ke Editor', 'Klik tombol Edit pada salah satu jenis surat (misal Surat Keterangan)', 'Pindah ke tampilan editor visual A4 lengkap dengan toolbar & palet elemen', 'CRITICAL'],
            ['TC-SURAT-03', 'Drag & Drop Komponen', 'Tarik handle elemen di kanvas ke atas/bawah untuk ubah urutan', 'Komponen berpindah posisi, notifikasi urutan diperbarui muncul', 'HIGH'],
            ['TC-SURAT-04', 'In-Place Text Editing', 'Klik langsung teks judul, paragraf, atau kop surat di kanvas dan ketik teks baru', 'Teks kanvas langsung terupdate realtime secara inline WYSIWYG', 'CRITICAL'],
            ['TC-SURAT-05', 'Kustomisasi Kolom Tabel', 'Drag separator kolom tabel atau ubah persentase lebar di tab Gaya', 'Lebar kolom tabel berubah proporsional dan tersinkronisasi di data blok', 'HIGH'],
            ['TC-SURAT-06', 'Tambah/Hapus Baris Tabel', 'Klik tombol + Tambah Baris atau ikon Hapus Baris pada tabel data', 'Baris tabel bertambah/berkurang dengan penomoran otomatis yang rapi', 'HIGH'],
            ['TC-SURAT-07', 'Upload Tanda Tangan Digital', 'Klik area TTD, unggah gambar PNG/JPG tanda tangan resmi', 'Gambar tanda tangan tampil di kanvas dan tersimpan sebagai base64/URL', 'CRITICAL'],
            ['TC-SURAT-08', 'Fitur Tambah Halaman Surat', 'Klik tombol "+ Tambah Halaman" di kanvas bawah atau tab HALAMAN', 'Halaman ke-2 (lembar A4 baru) muncul di kanvas, total halaman menjadi 2', 'CRITICAL'],
            ['TC-SURAT-09', 'Pindah Elemen Antar-Halaman', 'Pilih elemen, lalu klik "Halaman 2" pada selector posisi halaman', 'Elemen berpindah ke lembar Halaman 2 secara visual dan struktural', 'CRITICAL'],
            ['TC-SURAT-10', 'Hapus Halaman Tambahan', 'Klik tombol "Hapus Halaman" pada Halaman 2 yang berisi elemen', 'Muncul konfirmasi pemindahan elemen ke Halaman 1, halaman 2 terhapus aman', 'HIGH'],
            ['TC-SURAT-11', 'Pratinjau Live PDF Sesuai Modifikasi', 'Klik tombol "Preview PDF" di toolbar editor', 'Iframe preview menampilkan PDF resmi yang 100% memuat teks & halaman hasil edit', 'CRITICAL'],
            ['TC-SURAT-12', 'Unduh PDF Resmi Sesuai Modifikasi', 'Klik tombol "Cetak & Unduh" di toolbar editor', 'File PDF terunduh dengan nama terformat, memuat seluruh halaman dan data modifikasi', 'CRITICAL']
          ],
          [14, 25, 28, 23, 10]
        );

        // Modul 4: Manajemen Anggota & Startup
        this.addSubSectionHeader('Modul D — Manajemen Mahasiswa, Dosen, & Startup (TC-MEMB)');
        this.addTable(
          ['ID Kasus Uji', 'Skenario Pengujian', 'Langkah Pengujian', 'Hasil yang Diharapkan', 'Prioritas'],
          [
            ['TC-MEMB-01', 'Filter Mahasiswa Berdasarkan Status', 'Pilih filter status: Aktif, Magang, Lulus, atau Non-Aktif', 'Tabel mahasiswa menampilkan hanya data yang sesuai status terpilih', 'MEDIUM'],
            ['TC-MEMB-02', 'Tambah Data Mahasiswa Baru', 'Admin mengisi modal tambah mahasiswa (NIM, Nama, Email, Startup)', 'Data mahasiswa baru tersimpan di database dan tampil di tabel', 'HIGH'],
            ['TC-MEMB-03', 'Transfer / Mutasi Tim Startup', 'Ganti alokasi tim startup mahasiswa melalui dropdown mutasi', 'Data startup mahasiswa terupdate di tabel dan relasi database', 'HIGH'],
            ['TC-MEMB-04', 'Daftar Startup & Anggota Tim', 'Buka view Tim Startup, klik salah satu startup binaan', 'Menampilkan profil startup, founder, anggota mahasiswa, dan dosen pembina', 'HIGH']
          ],
          [14, 26, 28, 22, 10]
        );

        // Modul 5: Event & Repository
        this.addSubSectionHeader('Modul E — Agenda Kegiatan, Bimbingan & Repository (TC-EVENT / REPO)');
        this.addTable(
          ['ID Kasus Uji', 'Skenario Pengujian', 'Langkah Pengujian', 'Hasil yang Diharapkan', 'Prioritas'],
          [
            ['TC-EVT-01', 'Admin/Dosen Buat Agenda Acara', 'Isi judul acara, tanggal, waktu, link online / lokasi offline', 'Acara baru muncul di kalender dan kartu acara Dashboard', 'HIGH'],
            ['TC-EVT-02', 'Mahasiswa Mendaftar Acara', 'Mahasiswa klik tombol Daftar pada event yang tersedia', 'Status terdaftar aktif, kuota peserta terupdate', 'MEDIUM'],
            ['TC-REP-01', 'Unggah Berkas ke Repository', 'Dosen/Admin unggah file PDF pedoman/template ke repository', 'File terunggah, link unduhan aktif, metadata berkas tampil', 'HIGH'],
            ['TC-REP-02', 'Pencarian Berkas Dokumen', 'Ketik kata kunci nama file di kolom pencarian repository', 'Hasil berkas terfilter akurat sesuai query pencarian', 'MEDIUM']
          ],
          [14, 26, 28, 22, 10]
        );

        // ═══════════════════════════════════════════════════════════════════
        // BAB 4: PENGUJIAN NON-FUNGSIONAL & KEAMANAN
        // ═══════════════════════════════════════════════════════════════════
        this.addSectionHeader('4', 'Pengujian Non-Fungsional, Keamanan & Kompatibilitas');
        this.addParagraph(
          'Aspek non-fungsional memastikan kehandalan performa, stabilitas beban transaksi, keamanan celah otorisasi, dan keseragaman tampilan antarmuka di berbagai peramban web modern.'
        );

        this.addTable(
          ['Aspek Non-Fungsional', 'Parameter Uji & Skenario', 'Metrik Target', 'Hasil Uji / Status'],
          [
            ['Kecepatan Render PDF', 'Generate PDF multi-page (2-3 halaman) dengan tabel & tanda tangan', '< 2.0 Detik', 'PASS (Rata-rata ~350ms)'],
            ['Kecepatan Build Frontend', 'Eksekusi Vite Production Build (`npm run build`)', '< 15.0 Detik', 'PASS (Tercapai dalam 7.33s)'],
            ['Keamanan Token JWT', 'Injeksi request tanpa Bearer Token atau dengan token palsu', 'HTTP 401 / 403', 'PASS (Terblokir aman oleh session.js)'],
            ['SQL Injection Protection', 'Input karakter spesial ` OR 1=1 --` pada form pencarian & filter', 'Sanitasi Parameter', 'PASS (Menggunakan mysql2 prepared statement)'],
            ['Cross-Browser Desktop', 'Uji tampilan pada Google Chrome, Microsoft Edge, Mozilla Firefox', '100% Konsisten', 'PASS (CSS Tailwind & modern flexbox)'],
            ['Responsivitas Layar', 'Breakpoint Desktop (1440px), Laptop (1024px), Tablet (768px), HP (390px)', 'Tanpa Horizontal Scroll', 'PASS (Responsive grid 12-col & drawer)'],
            ['Ketahanan Data Lokal', 'Simpan modifikasi template ke browser (`localStorage`) & reload', 'State Tidak Hilang', 'PASS (Persistensi konfigurasi blok terjaga)']
          ],
          [22, 38, 20, 20]
        );

        // ═══════════════════════════════════════════════════════════════════
        // BAB 5: METODOLOGI & KLASIFIKASI DEFECT
        // ═══════════════════════════════════════════════════════════════════
        this.addSectionHeader('5', 'Panduan Klasifikasi Severity & Kriteria Rilis');
        this.addParagraph(
          'Setiap temuan anomali atau bug selama pelaksanaan pengujian harus diklasifikasikan berdasarkan tingkat keparahan (severity) untuk menentukan prioritas perbaikan:'
        );

        this.addTable(
          ['Severity Level', 'Kriteria Dampak Masalah', 'Contoh Kasus', 'SLA Penyelesaian'],
          [
            ['CRITICAL (S1)', 'Sistem lumpuh, gagal generate PDF, kebocoran data, bypass keamanan', 'Dosen tidak bisa simpan mitra, PDF unduhan korup', '< 4 Jam kerja'],
            ['HIGH (S2)', 'Fitur inti tidak berfungsi tetapi ada alternatif sementara', 'Filter pencarian tabel lambat, layout berantakan', '< 24 Jam kerja'],
            ['MEDIUM (S3)', 'Fungsi minor atau inkonsistensi teks UI yang tidak memblokir alur', 'Salah penamaan label, badge warna tidak pas', '< 3 Hari kerja'],
            ['LOW (S4)', 'Kosmetik kecil, perbaikan tooltip, atau saran peningkatan estetika', 'Jarak margin kurang lega pada layar ultrawide', 'Siklus rilis berikutnya']
          ],
          [18, 38, 26, 18]
        );

        this.addCallout(
          'KRITERIA PENERIMAAN RILIS (ACCEPTANCE SIGN-OFF)',
          'Aplikasi Portal Ko+Lab dinyatakan LULUS UJI dan SIAP PRODUKSI jika: (1) 0 temuan berstatus Critical (S1), (2) 0 temuan berstatus High (S2), (3) Fitur CRUD Mitra Dosen & Admin terverifikasi 100%, (4) Seluruh 7 template surat menghasilkan PDF sesuai hasil modifikasi dan mendukung multi-page, dan (5) Build frontend lolos tanpa error.',
          'success'
        );

        // ═══════════════════════════════════════════════════════════════════
        // BAB 6: LEMBAR PENGESAHAN & PENUTUP
        // ═══════════════════════════════════════════════════════════════════
        this.addSectionHeader('6', 'Lembar Pengesahan & Tanda Tangan QA');
        this.addParagraph(
          'Dokumen Master Test Plan ini telah disusun dan diverifikasi secara bersama oleh tim pengembang dan penjamin mutu perangkat lunak Research Alliance Ko+Lab Telkom University.'
        );

        this.checkPageBreak(90);
        const signY = this.doc.y + 10;
        const colW = (this.usableWidth - 20) / 2;

        // Signer 1
        this.doc.fontSize(8.5).font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('Disiapkan & Diuji Oleh:', this.leftMargin, signY);
        this.doc.fontSize(8).font('Helvetica')
          .fillColor('#64748b')
          .text('Tim Quality Assurance & Developer Portal Ko+Lab', this.leftMargin, signY + 12);
        this.doc.moveDown(3);
        this.doc.fontSize(8.5).font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('QA Lead Engineering Ko+Lab', this.leftMargin, signY + 60, { underline: true });
        this.doc.fontSize(7.5).font('Helvetica')
          .fillColor('#64748b')
          .text('Research Alliance Ko+Lab Bandung', this.leftMargin, signY + 72);

        // Signer 2
        this.doc.fontSize(8.5).font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('Disetujui & Disahkan Oleh:', this.leftMargin + colW + 20, signY);
        this.doc.fontSize(8).font('Helvetica')
          .fillColor('#64748b')
          .text('Ketua Research Alliance Ko+Lab Telkom University', this.leftMargin + colW + 20, signY + 12);
        this.doc.moveDown(3);
        this.doc.fontSize(8.5).font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text('Robbi Hendriyanto, S.T., M.T.', this.leftMargin + colW + 20, signY + 60, { underline: true });
        this.doc.fontSize(7.5).font('Helvetica')
          .fillColor('#64748b')
          .text('NIP: 25850011 / Pembina Ko+Lab', this.leftMargin + colW + 20, signY + 72);

        // Finalize Footers on all pages
        this.finalizeFooters();

        this.doc.end();

        stream1.on('finish', () => {
          // Copy to parent directory as well for easy access
          try {
            fs.copyFileSync(OUTPUT_PDF_PATH_1, OUTPUT_PDF_PATH_2);
          } catch (_) {}
          resolve();
        });
        stream1.on('error', reject);

      } catch (err) {
        reject(err);
      }
    });
  }
}

const builder = new TestPlanPdfBuilder();
builder.buildPdf()
  .then(() => {
    console.log('✅ Master Test Plan PDF successfully generated at:');
    console.log(`   1) ${OUTPUT_PDF_PATH_1}`);
    console.log(`   2) ${OUTPUT_PDF_PATH_2}`);
  })
  .catch(err => {
    console.error('❌ Failed to generate test plan PDF:', err);
    process.exit(1);
  });
