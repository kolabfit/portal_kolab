export type ElementType =
  | 'kop_surat'
  | 'judul_surat'
  | 'paragraf_teks'
  | 'tabel_data'
  | 'garis_pembatas'
  | 'tanda_tangan'
  | 'spasi_kosong'
  | 'gambar'; // logo/gambar posisi bebas (style.x/y/width), tidak ikut alur blok

export interface DocumentBlock {
  id: string;
  type: ElementType;
  title: string;
  pageNumber?: number; // Halaman ke- (1, 2, dst)
  data: Record<string, any>;
  style: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | '600' | '700';
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
    lineHeight?: number;
    marginTop?: number;
    marginBottom?: number;
    paddingX?: number;
    paddingY?: number;
    borderThickness?: number;
    borderColor?: string;
    height?: number; // for spasi_kosong
    isDoubleLine?: boolean; // for kop garis
    rowHeight?: number; // for table row height
    signatureHeight?: number; // tanda_tangan: tinggi gambar tanda tangan (pt), default 56
    width?: number; // garis_pembatas: panjang garis (pt); tanda_tangan: lebar blok (pt, default 240)
    x?: number; // gambar: jarak dari kiri halaman (pt)
    y?: number; // gambar: jarak dari atas halaman (pt)
    signatureLine?: boolean; // tanda_tangan: garis di bawah nama selebar blok (gaya sertifikat)
  };
}

export function getDefaultBlocksForType(typeId: string): DocumentBlock[] {
  switch (typeId) {
    case 'surat-keterangan':
      return [
        {
          id: 'kop-1',
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Jl. Telekomunikasi No. 1, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#0f172a',
            marginBottom: 16,
            isDoubleLine: true
          }
        },
        {
          id: 'judul-1',
          type: 'judul_surat',
          title: 'Judul Surat Keterangan',
          data: {
            title: 'SURAT KETERANGAN',
            nomor: '034/SKET/RA-KOLABFIT/2026'
          },
          style: {
            fontSize: 14,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#0f172a',
            marginBottom: 20
          }
        },
        {
          id: 'paragraf-1',
          type: 'paragraf_teks',
          title: 'Pembuka & Yang Bertanda Tangan',
          data: {
            text: 'Yang bertanda tangan di bawah ini:\n\nNama\t: Robbi Hendriyanto, S.T., M.T.\nNIP\t: 25850011\nJabatan\t: Ketua Research Alliance Ko+Lab Telkom University'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 16
          }
        },
        {
          id: 'paragraf-2',
          type: 'paragraf_teks',
          title: 'Isi Keterangan Magang',
          data: {
            text: 'Menerangkan bahwa mahasiswa yang tertera pada lampiran di bawah ini diterima dan sedang aktif mengikuti kegiatan Program Magang 2 Semester di Research Alliance Ko+Lab pada skema Magang Startup Binaan periode Tahun Akademik 2025/2026.\n\nDemikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.'
          },
          style: {
            fontSize: 11,
            textAlign: 'justify',
            lineHeight: 1.6,
            marginBottom: 24
          }
        },
        {
          id: 'ttd-1',
          type: 'tanda_tangan',
          title: 'Area Tanda Tangan Ketua Ko+Lab',
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Hormat Saya,',
            role: 'Ketua RA Ko+Lab Fakultas Ilmu Terapan',
            name: 'Robbi Hendriyanto, S.T., M.T.',
            nip: '25850011',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 30
          }
        },
        {
          id: 'garis-1',
          type: 'garis_pembatas',
          title: 'Garis Pembatas Lampiran',
          data: {},
          style: {
            borderThickness: 1,
            borderColor: '#e2e8f0',
            marginTop: 16,
            marginBottom: 16
          }
        },
        {
          id: 'tabel-1',
          type: 'tabel_data',
          title: 'Lampiran Daftar Mahasiswa',
          data: {
            tableTitle: 'Lampiran Mahasiswa Magang Startup',
            headers: ['No', 'NIM', 'Nama Mahasiswa', 'Startup Binaan'],
            colWidths: [8, 22, 40, 30],
            rows: [
              ['1', '607012400003', 'Fitra Okto Kurniawan', 'Sorgummi Ko+Lab'],
              ['2', '607012400008', 'Afrisya Dwiky Mauliddinka', 'Sorgummi Ko+Lab'],
              ['3', '607012400015', 'Naura Ramadhani', 'Sorgummi Ko+Lab']
            ]
          },
          style: {
            fontSize: 10,
            marginBottom: 20
          }
        }
      ];

    case 'surat-dispen':
      return [
        {
          id: 'kop-dispen',
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#0f172a',
            marginBottom: 14,
            isDoubleLine: true
          }
        },
        {
          id: 'judul-dispen',
          type: 'judul_surat',
          title: 'Header & Perihal Dispensasi',
          data: {
            title: 'SURAT PERMOHONAN DISPENSASI',
            nomor: '001/DISP/KOLABFIT/2025',
            hal: 'Permohonan Dispensasi Perkuliahan',
            lampiran: '2 lembar'
          },
          style: {
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16
          }
        },
        {
          id: 'paragraf-dispen-1',
          type: 'paragraf_teks',
          title: 'Tujuan Surat',
          data: {
            text: 'Kepada Yth.\nDosen Pengampu Mata Kuliah\ndi tempat\n\nDengan hormat,\nSehubungan dengan keikutsertaan mahasiswa Ko+Lab dalam agenda intensif "Odoo Partner Recruitment & Training 2025" yang diselenggarakan di Pullman Bandung Grand Central, kami memohon izin dispensasi perkuliahan untuk nama-nama mahasiswa terlampir.'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 16
          }
        },
        {
          id: 'tabel-dispen-mhs',
          type: 'tabel_data',
          title: 'Daftar Mahasiswa Dispensasi',
          data: {
            tableTitle: 'Daftar Mahasiswa Penerima Dispensasi',
            headers: ['No', 'NIM', 'Nama Mahasiswa', 'Kelas', 'Program Studi'],
            colWidths: [8, 20, 32, 15, 25],
            rows: [
              ['1', '607012400003', 'Fitra Okto Kurniawan', 'D3SI-48-01', 'D3 Sistem Informasi'],
              ['2', '607012400008', 'Afrisya Dwiky Mauliddinka', 'D3SI-48-01', 'D3 Sistem Informasi']
            ]
          },
          style: {
            fontSize: 10,
            marginBottom: 16
          }
        },
        {
          id: 'tabel-dispen-agenda',
          type: 'tabel_data',
          title: 'Rundown & Agenda Pelatihan',
          data: {
            tableTitle: 'Agenda Kegiatan Pelatihan',
            headers: ['Tanggal', 'Key Benefits', 'Agenda Sesi', 'Waktu', 'Lokasi'],
            rows: [
              ['07 Okt 2025', 'Training POS & ERP', 'Welcome & Technical Workshop', '09:30 - 18:00', 'Pullman Grand Central']
            ]
          },
          style: {
            fontSize: 10,
            marginBottom: 20
          }
        },
        {
          id: 'ttd-dispen',
          type: 'tanda_tangan',
          title: 'Tanda Tangan Ketua Ko+Lab',
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Ketua Research Alliance Ko+Lab,',
            name: 'Robbi Hendriyanto, S.T., M.T.',
            nip: '25850011',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            marginBottom: 24
          }
        }
      ];

    case 'surat-rekognisi':
      return [
        {
          id: 'kop-rekognisi',
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
            isDoubleLine: true
          }
        },
        {
          id: 'judul-rekognisi',
          type: 'judul_surat',
          title: 'Pengajuan Rekognisi',
          data: {
            title: 'PENGAJUAN REKOGNISI MATA KULIAH',
            nomor: '001/ADM/KOLABFIT/2025',
            hal: 'Pengajuan Rekognisi SKS Proyek',
            lampiran: '2 lembar'
          },
          style: {
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16
          }
        },
        {
          id: 'paragraf-rekognisi-1',
          type: 'paragraf_teks',
          title: 'Surat Pengantar Kaprodi',
          data: {
            text: 'Kepada Ysh.\nKaprodi D3 Sistem Informasi\ndi tempat\n\nDengan hormat,\nDalam rangka mendukung pengembangan portofolio mahasiswa khususnya di Program Studi D3 Sistem Informasi, kami selaku Research Alliance Ko+Lab mengajukan rekognisi mata kuliah untuk tim program Innovillage 2025.'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 16
          }
        },
        {
          id: 'tabel-rekognisi-mk',
          type: 'tabel_data',
          title: 'Daftar Mata Kuliah Rekognisi',
          data: {
            tableTitle: 'Mata Kuliah Yang Direkognisi',
            headers: ['No', 'Mata Kuliah', 'Penambahan Nilai', 'Keterangan'],
            colWidths: [8, 37, 25, 30],
            rows: [
              ['1', 'Analisis dan Perancangan Sistem Informasi', '+15', 'Untuk tim lolos pendanaan'],
              ['2', 'Pengembangan Aplikasi Berbasis Web', '+10', 'Untuk tim lolos pendanaan'],
              ['3', 'Basis Data II', '+10', 'Untuk tim lolos pendanaan'],
              ['4', 'Etika Profesi', 'Indeks A', 'Untuk seluruh tim pendaftar']
            ]
          },
          style: {
            fontSize: 10,
            marginBottom: 20
          }
        },
        {
          id: 'ttd-rekognisi',
          type: 'tanda_tangan',
          title: 'Pengesahan Ketua Ko+Lab',
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Ketua Research Alliance Ko+Lab,',
            name: 'Robbi Hendriyanto, S.T., M.T.',
            nip: '25850011',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 24
          }
        }
      ];

    case 'surat-undangan':
      return [
        {
          id: 'kop-undangan',
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
            isDoubleLine: true
          }
        },
        {
          id: 'judul-undangan',
          type: 'judul_surat',
          title: 'Judul Surat Undangan',
          data: {
            title: 'SURAT UNDANGAN KEGIATAN',
            nomor: '012/UND/RA-KOLABFIT/2024'
          },
          style: {
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16
          }
        },
        {
          id: 'paragraf-undangan-1',
          type: 'paragraf_teks',
          title: 'Penerima & Pembuka Undangan',
          data: {
            text: 'Kepada Ysh.\nAgnessya Nurrezqia, S.I.KOM., M.I.KOM.\nNarasumber\ndi tempat\n\nDengan hormat,\nSehubungan dengan akan diselenggarakannya kegiatan "Forum Group Discussion Hibah Penelitian Kerjasama", kami mengundang Bapak/Ibu untuk berkenan hadir sebagai Narasumber pada kegiatan tersebut.'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 16
          }
        },
        {
          id: 'paragraf-undangan-jadwal',
          type: 'paragraf_teks',
          title: 'Jadwal & Lokasi Acara',
          data: {
            text: 'Adapun kegiatan akan diselenggarakan pada:\nHari / Tanggal\t: Kamis, 10 Oktober 2024\nWaktu\t\t: 09.00 – 16.00 WIB\nTempat\t\t: Ruang Multimedia 2, Gd. Selaru Lt.3 FIT Telkom University\n\nDemikian surat permohonan ini kami sampaikan. Atas kesediaan dan kerjasamanya kami ucapkan terima kasih.'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 24
          }
        },
        {
          id: 'ttd-undangan',
          type: 'tanda_tangan',
          title: 'Tanda Tangan Pengundang',
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Hormat Saya,',
            name: 'Robbi Hendriyanto, S.T., M.T.',
            nip: '25850011',
            role: 'Ketua RA Ko+Lab Fakultas Ilmu Terapan',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 24
          }
        }
      ];

    case 'surat-komitmen-magang':
      return [
        {
          id: 'kop-komitmen',
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
            isDoubleLine: true
          }
        },
        {
          id: 'judul-komitmen',
          type: 'judul_surat',
          title: 'Judul Surat Komitmen',
          data: {
            title: 'SURAT KOMITMEN MAGANG STARTUP',
            nomor: '015/KOM/KOLABFIT/2026'
          },
          style: {
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16
          }
        },
        {
          id: 'paragraf-komitmen-1',
          type: 'paragraf_teks',
          title: 'Identitas Mahasiswa',
          data: {
            text: 'Yang bertanda tangan di bawah ini:\n\nNama\t: Fitra Okto Kurniawan\nNIM\t: 607012400003\nJurusan\t: D3 Sistem Informasi\n\nMenyatakan dengan sesungguhnya bersedia mematuhi aturan dan etika kerja SevenS yang berlaku di Research Alliance Ko+Lab selama menjalani program magang.'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 20
          }
        },
        {
          id: 'tabel-komitmen-poin',
          type: 'tabel_data',
          title: 'Poin-Poin Komitmen SevenS',
          data: {
            tableTitle: 'Pernyataan Integritas SevenS',
            headers: ['No', 'Prinsip', 'Komitmen Kerja'],
            colWidths: [8, 30, 62],
            rows: [
              ['1', 'Disiplin', 'Hadir tepat waktu dan memenuhi jam kerja magang'],
              ['2', 'Integritas', 'Menjaga kerahasiaan data dan source code startup binaan'],
              ['3', 'Kolaborasi', 'Aktif berkomunikasi dengan tim dan mentor lapangan']
            ]
          },
          style: {
            fontSize: 10,
            marginBottom: 24
          }
        },
        {
          id: 'ttd-komitmen',
          type: 'tanda_tangan',
          title: 'Tanda Tangan Mahasiswa',
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Yang membuat pernyataan,',
            name: 'Fitra Okto Kurniawan',
            nip: '607012400003',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 24
          }
        }
      ];

    case 'surat-sertifikat': {
      // Desain "Sertifikat Aslab": latar & font Poppins dipasang otomatis untuk tipe ini
      // (dynamicBlockRenderer.js / SuratAdministrasiView). Jarak antar blok mengikuti PDF contoh.
      const ink = '#1b1b23';
      const line = (id: string, title: string, text: string, style: DocumentBlock['style']): DocumentBlock =>
        ({ id, type: 'paragraf_teks', title, data: { text }, style: { textAlign: 'left', lineHeight: 1.2, color: ink, fontSize: 14, marginBottom: 0, ...style } });
      return [
        // Logo bisa digeser, diubah ukuran, diganti/dihapus; posisi awal = PDF contoh
        { id: 'sertifikat-logo-fit', type: 'gambar', title: 'Logo FIT Telkom University', data: { imageUrl: '/logo-fit.png' }, style: { x: 654, y: 13.2, width: 125.3 } },
        { id: 'sertifikat-logo-hub', type: 'gambar', title: 'Logo Ko+Lab Creative HUB', data: { imageUrl: '/logo-kolab-hub.png' }, style: { x: 785, y: 18.5, width: 41.3 } },
        line('sertifikat-judul', 'Judul', 'SERTIFIKAT', { fontSize: 49, fontWeight: 'bold', lineHeight: 1, marginTop: 79 }),
        line('sertifikat-subjudul', 'Sub Judul', 'Penghargaan', { fontSize: 31, fontWeight: 'bold', lineHeight: 1, marginTop: 1 }),
        line('sertifikat-diberikan', 'Pengantar', 'Diberikan kepada:', { fontSize: 17, color: '#025464', marginTop: 14 }),
        line('sertifikat-nama', 'Nama Penerima', 'MAULANA FEBRIAN NURHASAN', { fontSize: 31, fontWeight: 'bold', color: '#da9e05', marginTop: 6 }),
        { id: 'sertifikat-garis', type: 'garis_pembatas', title: 'Garis Nama', data: {}, style: { borderThickness: 1, borderColor: '#231f20', width: 490, marginBottom: 6 } },
        line('sertifikat-atas', 'Keterangan', 'atas kontribusi sebagai', {}),
        line('sertifikat-peran', 'Peran', 'Asisten Laboratorium Riset', { fontSize: 20, fontWeight: 'bold', color: '#c51012', marginTop: 3 }),
        line('sertifikat-lembaga', 'Lembaga', 'pada **Research Alliance Ko+lab, Fakultas Ilmu Terapan, Telkom University.**', { marginTop: 4 }),
        line('sertifikat-tanggal', 'Tempat & Tanggal', 'Bandung, 29 Mei 2026', { marginTop: 22 }),
        {
          id: 'ttd-sertifikat',
          type: 'tanda_tangan',
          title: 'Pengesahan Ketua Ko+Lab',
          data: {
            name: 'ROBBI HENDRIYANTO, S.T., M.T.',
            role: 'Ketua Research Alliance Ko+Lab\nTelkom University',
            signatureUrl: ''
          },
          style: { fontSize: 12, textAlign: 'left', width: 317, signatureLine: true, signatureHeight: 92, marginBottom: 0 }
        }
      ];
    }

    case 'surat-pengantar':
      return [
        {
          id: 'kop-pengantar',
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
            isDoubleLine: true
          }
        },
        {
          id: 'judul-pengantar',
          type: 'judul_surat',
          title: 'Judul Surat Pengantar',
          data: {
            title: 'SURAT PENGANTAR TIM STARTUP',
            nomor: '036/SKET/RA-KOLABFIT/2025'
          },
          style: {
            fontSize: 14,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 20
          }
        },
        {
          id: 'paragraf-pengantar-1',
          type: 'paragraf_teks',
          title: 'Paragraf Pembuka',
          data: {
            text: 'Yang bertanda tangan di bawah ini:\n\nNama\t: Muhamad Yusuf Ramadhan\nNIP\t: 21910012\nJabatan\t: Manager Program Inkubasi Ko+Lab Telkom University\n\nMenerangkan bahwa tim startup di bawah ini merupakan tim binaan aktif Research Alliance Ko+Lab Fakultas Ilmu Terapan:'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 20
          }
        },
        {
          id: 'tabel-pengantar-anggota',
          type: 'tabel_data',
          title: 'Daftar Anggota Startup',
          data: {
            tableTitle: 'Daftar Anggota Tim Startup Sorgummi',
            headers: ['No', 'NIM', 'Nama Mahasiswa', 'Posisi / Role'],
            colWidths: [8, 22, 40, 30],
            rows: [
              ['1', '607012400003', 'Fitra Okto Kurniawan', 'CEO / Hustler'],
              ['2', '607012400008', 'Afrisya Dwiky Mauliddinka', 'CTO / Hacker'],
              ['3', '607012400015', 'Naura Ramadhani', 'CMO / Hipster']
            ]
          },
          style: {
            fontSize: 10,
            marginBottom: 24
          }
        },
        {
          id: 'ttd-pengantar',
          type: 'tanda_tangan',
          title: 'Tanda Tangan Manager Program',
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Hormat Saya,',
            name: 'Muhamad Yusuf Ramadhan',
            role: 'Manager Program Inkubasi Ko+Lab',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 24
          }
        }
      ];
    default:
      return [
        {
          id: 'kop-custom-1',
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          pageNumber: 1,
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Jl. Telekomunikasi No. 1, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#0f172a',
            marginBottom: 16,
            isDoubleLine: true
          }
        },
        {
          id: 'judul-custom-1',
          type: 'judul_surat',
          title: 'Judul Dokumen',
          pageNumber: 1,
          data: {
            title: 'SURAT KETERANGAN RESMI',
            nomor: '001/RA-KOLAB/FIT/X/2026'
          },
          style: {
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#0f172a',
            marginBottom: 20
          }
        },
        {
          id: 'paragraf-custom-1',
          type: 'paragraf_teks',
          title: 'Isi Surat',
          pageNumber: 1,
          data: {
            text: 'Yang bertanda tangan di bawah ini menerangkan bahwa:\n\nNama\t: [Nama Lengkap]\nNIM / NIP\t: [Nomor Induk]\n\nDengan ini menyatakan bahwa kegiatan yang bersangkutan telah disetujui sesuai dengan ketentuan yang berlaku di lingkungan Research Alliance Ko+Lab.'
          },
          style: {
            fontSize: 11,
            textAlign: 'left',
            lineHeight: 1.6,
            marginBottom: 24
          }
        },
        {
          id: 'ttd-custom-1',
          type: 'tanda_tangan',
          title: 'Tanda Tangan Pengesahan',
          pageNumber: 1,
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Mengetahui,\nKetua Research Alliance Ko+Lab',
            name: 'Nama Penandatangan, S.T., M.T.',
            role: 'NIP: 198501012010121001',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 24
          }
        }
      ];
  }
}
