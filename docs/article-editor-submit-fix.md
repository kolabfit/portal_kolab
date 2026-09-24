# ARTICLE EDITOR & SUBMIT BUG FIX SUMMARY

Tanggal: 23 September 2026. Perbaikan langsung pada source; tidak ada migrasi schema untuk perubahan ini.

1. **Video Bug Reproduction**

   Video yang disebutkan dalam prompt tidak ditemukan di workspace. Reproduksi dilakukan sebelum mengubah kode aplikasi, memakai Microsoft Edge headless melalui Playwright dan komponen `ArticleView` sebenarnya. Harness menggunakan identitas tampilan Student; integrasi backend diuji terpisah dengan JWT role STUDENT dan database sementara.

   Dua kegagalan berhasil direproduksi: (a) ketik dua paragraf, ubah kategori, teks editor menjadi `""`; (b) isi form, klik Simpan, tahan promise penyimpanan: payload masih berisi `Description must survive submit.`, tetapi editor menjadi `""` dengan `contenteditable="false"`. Tes yang sama lulus setelah perbaikan. Pengujian mouse Bold sederhana sudah lulus pada baseline; tidak semua kasus format gagal pada browser ini.

2. **Editor Root Cause — BUG 1**

   Elemen contentEditable di `ArticleView` memakai `dangerouslySetInnerHTML={{ __html: editingItem?.content || '' }}` setiap render. DOM hasil ketikan dikelola browser, tetapi React menulis kembali HTML awal ketika form berubah. Create kembali kosong; edit dapat kembali ke isi lama. Tidak ada state HTML yang disinkronkan dari input/format.

3. **Formatting Root Cause — BUG 2**

   Pemetaan `bold`, `italic`, `formatBlock`, `insertUnorderedList`, dan `insertOrderedList` sudah benar. Format di DOM dapat hilang karena render ulang di atas. Toolbar lama juga menjalankan command sebelum memfokuskan editor, tanpa mencegah mouse memindahkan fokus atau menyimpan Range; ini tidak menyediakan jalur selection yang andal untuk toolbar keyboard. Implementasi baru menjaga selection secara eksplisit. Tidak diklaim bahwa tes mouse Bold baseline gagal.

4. **Description Disappearing Root Cause — BUG 3**

   `setIsProcessing(true)` memicu render; perubahan atribut `contentEditable` disertai penulisan ulang HTML awal. Jadi menghilangnya deskripsi saat loading merupakan reset DOM, bukan SQL yang membuang content. Pada reproduksi submit, snapshot/payload masih benar sebelum render tersebut. Parent juga memakai `saveAndRefresh → loadBaseData → isLoading`, yang dapat meng-unmount halaman ketika me-refresh data setelah save.

5. **Submit Delay Root Cause — BUG 4**

   Fetch upload/save tidak memiliki timeout frontend. Upload lampiran berjalan berurutan. Server menunggu status CDN hingga delapan percobaan, masing-masing dapat melibatkan dua request 15 detik, ditambah total jeda 39,5 detik; komentar lama “~20s” tidak sesuai. Promise simpan juga menunggu sembilan pengambilan koleksi aplikasi secara berurutan. Ini menjelaskan waktu tunggu panjang dan tidak adanya batas waktu menyeluruh; tidak ada bukti loop tak terbatas dalam kode lama.

6. **contentEditable Architecture Fix**

   `components/article/RichTextEditor.tsx` memiliki DOM editable sendiri. HTML disanitasi dan dimasukkan satu kali pada mount modal lewat layout effect. Render normal tidak pernah menulis ulang innerHTML. Tidak ada key berdasarkan loading/kategori/tag. Editor tetap mounted selama submit.

7. **Selection / Focus Fix**

   Toolbar mencegah default mouse-down. Range disimpan saat selection berada di dalam editor, diperiksa ulang node-nya, dan dipulihkan setelah focus sebelum command. Keyboard activation juga menggunakan Range tersimpan. Jika tidak ada Range valid, command menggunakan caret terlipat, bukan memilih seluruh artikel.

8. **Formatting Command Fix**

   Command native tetap digunakan agar undo dan struktur selection browser dipertahankan. H2/H3 tidak dilakukan dengan mengganti seluruh HTML. Tes mencakup Bold pada satu kata, Italic pada selection, kedua heading, kedua list, kombinasi berulang, keyboard activation, serta lanjut mengetik.

9. **Editor State Synchronization Fix**

   Input dan command memperbarui `contentHtml` dari DOM terbaru. State ini tidak ditulis kembali ke DOM saat mengetik. HTML init hanya dipakai saat modal baru dibuka. Paste menyisipkan HTML yang sudah disanitasi pada selection saat ini; plain text di-escape dan line break dipertahankan.

10. **Description Persistence Fix**

    DOM tidak kosong saat loading, upload gagal, save gagal, atau timeout. Backend menolak isi visual kosong dengan HTTP 400 dan `{status:'error', error:'VALIDATION_ERROR', field:'content', message:'Isi artikel wajib diisi.'}`. Transaksi gagal tidak mengubah artikel/tag/lampiran yang sudah tersimpan.

11. **Submit Snapshot Fix**

    Sebelum setState/await, handler menyalin ID draft, operasi, judul, tanggal, kategori, tag, HTML DOM terbaru, penulis, thumbnail, daftar lampiran, daftar File, dan link. Payload memakai snapshot ini sepanjang proses. Ref sinkron mencegah double submit, termasuk dua event sebelum React melakukan render berikutnya.

12. **Submit Pipeline Fix**

    Validasi → persiapan media dengan maksimal dua worker → simpan artikel/relasi → verifikasi `status=success` dan ID di parent → tutup modal → refresh artikel/kategori/tag tanpa global loading. Semua worker yang sudah berjalan diselesaikan sebelum membuka retry. Callback yang tidak mengonfirmasi sukses tidak lagi dianggap berhasil.

13. **Kroombox CDN Upload Analysis**

    Article upload sekarang segera mengembalikan asset ID setelah upload diterima; status PROCESSING disimpan. Frontend memeriksa metadata sampai READY dengan interval maksimal 2 detik dan deadline 30 detik. Metadata backend memeriksa delivery melalui signed URL dengan batas 7 detik. Upload frontend dibatasi 75 detik; upload CDN backend 60 detik; save artikel 30 detik; refresh 15 detik per request.

    Asset ID disimpan sebelum polling, sehingga timeout pemrosesan tidak memerlukan upload ulang. Lampiran baru harus READY sebelum boleh dikaitkan ke artikel. Polling legacy `waitForReady` kini juga memiliki deadline 30 detik, termasuk saat request delivery menggantung. Respons upload tanpa file ID ditolak. Connection pool upload dilepas tepat sekali melalui finally.

    Durasi contoh tes lokal dengan CDN stub: upload sekitar 47 ms, simpan artikel sekitar 22 ms, GET artikel sekitar 6 ms. Angka ini bukan benchmark jaringan Kroombox produksi. Tes deadline delivery menggantung selesai sekitar 65 ms untuk batas uji 50 ms. Batas produksi tetap seperti di atas.

14. **Loading State Fix**

    Tahap eksplisit: IDLE, VALIDATING, UPLOADING_MEDIA, SAVING_ARTICLE, COMPLETED, FAILED. Tombol menampilkan “Memeriksa data”, “Mengunggah / memproses file”, atau “Menyimpan artikel”. Fieldset, toolbar, editor, Simpan, Batal, dan X dinonaktifkan selama proses; teks artikel tetap terlihat.

15. **Form Reset Fix**

    Reset/close hanya mengikuti konfirmasi sukses. Catch mempertahankan draft; finally hanya melepas guard/loading. File yang sukses di-upload dipertahankan saat file lain atau penyimpanan artikel gagal. Init form tidak bergantung pada upload progress/error.

16. **Backend Field Mapping**

    Nama tetap `content`: snapshot.content → `data.content` pada POST `/api/bridge` → `req.body.data.content` → hasil sanitasi → parameter SQL `articles.content`. Partial edit menggabungkan record lama sebelum validasi sehingga field content yang tidak dikirim tidak berubah menjadi kosong.

17. **Database Persistence Verification / Layer Trace**

    Pengujian browser dan pengujian database merupakan dua lapisan tes terpisah, bukan satu sesi video atau satu browser yang terhubung database produksi.

    | Lapisan | Bukti / nilai fixture |
    |---|---|
    | editorRef.innerHTML sebelum submit | `Description must survive submit.` pada tes browser |
    | contentHtml | Mirrored melalui onInput; sebelumnya tidak tersedia. Tidak ada logging state/draft produksi |
    | snapshot.content | Dibaca sinkron dari DOM, disanitasi; teks fixture tetap utuh |
    | payload.content | Assertion browser memeriksa teks tersebut ketika promise save belum selesai |
    | backend req.body.data.content | Tes STUDENT mengirim HTML H di bawah + `<script>alert(1)</script>` |
    | parameter SQL content | `validateArticleContent` mengembalikan H, script dihapus sebelum execute |
    | database articles.content | SELECT langsung diuji sama persis dengan H |
    | GET articles content | Response diuji sama persis dengan H |
    | detail selectedArticle.content | Komponen detail disanitasi; tes browser memverifikasi heading 24px dan marker list disc |

    H yang diuji:

    ```html
    <h2>Heading</h2><p><b>Bold</b> <i>Italic</i></p><h3>Subheading</h3><ul><li>Bullet</li></ul><ol><li>Number</li></ol>
    ```

    Create/edit/read/delete, tag, lampiran, edit kosong, rollback relasi invalid, serta akses lampiran sesudah publikasi diuji dengan MySQL sementara dan role STUDENT.

18. **Security / Sanitization**

    DOMPurify pada init editor, paste, snapshot, dan detail. sanitize-html pada backend save serta GET artikel lama. Allowlist mempertahankan p/div/br, strong/b, em/i/u, h2/h3, ul/ol/li, blockquote, dan link aman; script, iframe, event attributes, dan javascript URLs dibuang. Credentials tidak ditambahkan ke browser atau log.

    Pemisahan DOM editor mengikuti catatan [React untuk contentEditable](https://react.dev/reference/react-dom/components/common). Kebijakan backend memakai [allowlist sanitize-html](https://github.com/apostrophecms/sanitize-html). Tes browser menggunakan [channel Microsoft Edge yang didukung Playwright](https://playwright.dev/docs/browsers).

19. **Files Modified**

    Aplikasi: `views/ArticleView.tsx`, `App.tsx`, `api.ts`; baru: `components/article/RichTextEditor.tsx`, `lib/articleHtml.ts`, `lib/articleMedia.ts`. Backend: `api/lib/articleHtml.js`, `api/lib/articleRelations.js`, `api/lib/kroomboxCdn.js`, `api/routes/assets.js`, `api/routes/bridge.js`, `api/routes/data.js`. Dependency manifests/lockfiles dan `.gitignore` diperbarui untuk sanitizer dan Playwright. Perubahan lain yang sudah ada di workspace dipertahankan.

20. **Tests Added / Updated**

    `tests/browser/article-editor.spec.ts` + harness + `playwright.config.ts`; `tests/article-submit.test.mjs`; `api/tests/article-html.test.js`; `api/tests/article-files.test.js`; deadline test dalam `api/tests/cdn.test.js`.

    Suite lama diperbarui agar fixture tag merupakan tag valid, tes penyimpanan legacy tidak menggunakan CDN nyata, dan assertion health mengikuti response saat ini (`ok`). Tes struktur tim diperbarui untuk UI modal yang sudah ada, bukan elemen details lama; kode fitur tim tidak diubah.

21. **Manual / Browser Verification**

    Edge headless menjalankan DOM dan selection browser nyata: create/edit, perubahan kategori/tag/media, paste HTML berbahaya, teks panjang >7.000 karakter, seluruh toolbar, lanjut mengetik, keyboard toolbar, pending save, gagal save, gagal CDN, request timeout, retry, serta detail. Tidak dilakukan verifikasi video manual atau pengujian semua browser/perangkat.

22. **Frontend Build Result**

    `npm test`: 13 lulus. `npm run test:editor`: 7 lulus. `npm run build`: berhasil. Warning build yang masih ada: referensi `/index.css` yang belum tersedia dan ukuran bundle >500 kB; bukan error build.

23. **Backend Test Result**

    `cd api; npm test`: 101 lulus. `node --test api/tests/article-html.test.js api/tests/article-files.test.js api/tests/cdn.test.js`: 16 lulus. Database uji dibuat terpisah dan dihapus setelah selesai. Dua file fixture yang sempat ter-upload oleh konfigurasi suite lama telah dicocokkan byte-nya lalu dihapus; suite kini terisolasi dari CDN nyata.

24. **Known Limitations / Operasional**

    Video tidak tersedia; hasil di atas berasal dari reproduksi browser dan tes terotomasi. `execCommand` dipertahankan untuk kompatibilitas editor yang ada, bukan migrasi ke editor library baru. Draft dipertahankan di modal selama error; tidak ada autosave lintas reload atau pindah halaman. Bila request save timeout setelah server sudah commit, cek daftar artikel sebelum mencoba lagi; ID draft stabil mencegah pembuatan artikel dengan ID baru pada retry. File yang di-upload lalu dibatalkan pengguna belum memiliki garbage collector otomatis.

    Restart backend dan refresh frontend agar proses berjalan memakai kode baru. Tidak perlu migrasi database untuk perbaikan editor ini.
