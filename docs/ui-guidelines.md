# PILOK Form UI Guidelines

Panduan ini adalah baseline visual untuk seluruh form PILOK. Gunakan komponen
bersama pada src/components/FormLayout.tsx dan class komponen pada src/index.css
sebelum membuat pola baru.

## Prinsip

- Utamakan keterbacaan, kecepatan input, dan hierarchy yang jelas.
- Gunakan tampilan korporat yang tenang: latar abu muda, card putih, ink gelap,
  dan aksen merah SIG secukupnya.
- Jangan menambahkan navigasi atau dekorasi yang tidak mendukung tugas form.
- Pertahankan perilaku responsif mulai dari lebar minimum 320 px.

## Branding dan shell

- Gunakan FormShell untuk container, lebar konten, dan BrandHeader.
- BrandHeader menampilkan logo SIG dan logo PILOK berdampingan pada header
  putih. Aset defaultnya adalah `/branding/sig-logo-red.svg` dan
  `/branding/pilok-logo-red.svg`; varian hitam tetap tersedia untuk konteks
  monokrom.
- Favicon seluruh form PILOK menggunakan `/branding/pilok-icon.svg` dalam
  warna merah SIG (`#f4313f`).
- Aset logo bersumber dari halaman Corporate Identity resmi SIG:
  https://sig.id/identitas-perusahaan.
- Pertahankan rasio, clear space, dan alt text kedua logo. Untuk varian header
  lain, ganti melalui prop `logoSrc` dan `pilokLogoSrc`; jangan mengubah
  artwork logo.
- Pada mobile, grup logo tetap berdampingan dan boleh berada di atas blok judul
  agar branding tidak mempersempit atau memperlebar konten header.
- Format judul: PILOK - [Nama Form], diikuti satu kalimat deskripsi singkat.

## Section dan field

- Major section memakai SectionCard dan SectionHeader; step badge hanya untuk
  urutan utama.
- Nested entity memakai panel yang lebih ringan, seperti wilayah-card dan
  supervisor-panel.
- Field memakai tinggi 44 px, radius 8 px, label di atas, helper/error tepat di
  bawah, dan focus ring yang terlihat.
- Field kondisional yang tidak lagi berlaku karena pilihan pengendali harus
  disembunyikan, bukan tetap ditampilkan seolah-olah opsional. Nilai lama dari
  field tersebut harus dibersihkan sebelum payload dinormalisasi.
- Gunakan SearchableSelect untuk master data. Nilai terpilih harus jelas,
  label panjang harus truncate, dan nilai lengkap tetap tersedia melalui title
  atau accessible label.
- Upload memakai upload-box saat kosong dan file-selected untuk file baru atau
  tersimpan. Jangan mengubah semantics file untuk kebutuhan visual.

## Actions dan feedback

- button-primary: satu aksi simpan atau lanjut utama per area.
- button-secondary: tambah, batal, atau aksi netral.
- button-danger: konfirmasi destruktif; icon-only delete memakai
  icon-button-danger.
- button-text: aksi utility ringan seperti retry atau ganti file.
- Tempatkan aksi final di ActionBar. Pada mobile, aksi utama memenuhi lebar.
- Gunakan StatusBanner dengan variant info, success, warning, atau error;
  jangan membuat box status ad-hoc.

### Field Validation

Gunakan pola yang sama pada seluruh form PILOK agar timing, posisi, dan bahasa
error tetap konsisten.

#### Timing dan perilaku

- Konfigurasikan React Hook Form dengan `mode: "onChange"` dan
  `reValidateMode: "onChange"`. Zod tetap menjadi sumber aturan validasi.
- Jangan tampilkan error saat form pertama kali dimuat. Indikator field wajib
  tetap boleh ditampilkan.
- Setelah pengguna mengubah nilai, validasi field secara live. Nilai yang sudah
  benar harus langsung menghapus error field tersebut tanpa menghapus error
  lain yang belum diperbaiki.
- Perubahan field pengendali harus langsung memvalidasi ulang field
  dependennya menggunakan mekanisme React Hook Form seperti `trigger`,
  `clearErrors`, `unregister`, atau `setValue` sesuai kebutuhan.
- Field kondisional yang disembunyikan atau tidak lagi relevan tidak boleh
  menyimpan nilai usang maupun menampilkan error.
- Submit tetap menjalankan validasi penuh sebagai pengaman terakhir serta
  mengarahkan smooth scroll dan fokus ke field tidak valid pertama sesuai
  urutan visual/DOM.

#### Posisi dan aksesibilitas

- Tampilkan pesan melalui komponen `FieldError` tepat di bawah atau di samping
  field yang bermasalah; jangan membuat variasi error inline baru.
- Control invalid menggunakan `aria-invalid="true"`, visual state
  `input-error`, dan `aria-describedby` yang mengarah ke `id` pesan error.
- Pesan harus tetap terbaca oleh screen reader melalui semantics `role="alert"`
  yang disediakan `FieldError`.
- Jangan gunakan ringkasan validasi generik pada level halaman untuk field
  wajib biasa. `StatusBanner` level halaman hanya untuk status proses atau
  kegagalan sistem, API, dan upload.

#### Copy pesan

Gunakan bahasa Indonesia yang singkat, spesifik, dan diakhiri tanda titik.
Sebutkan nama field atau dokumen sebagaimana tampil pada label; jangan memakai
nama key payload, istilah teknis internal, atau pesan umum seperti
"Data tidak valid".

| Kondisi | Pola | Contoh |
| --- | --- | --- |
| Pilihan wajib kosong | `[Nama field] wajib dipilih.` | `Status Gudang wajib dipilih.` |
| Input wajib kosong | `[Nama field] wajib diisi.` | `Tanggal mulai sewa wajib diisi.` |
| Dokumen wajib kosong | `[Nama dokumen] wajib diunggah.` | `Dokumen SHM wajib diunggah.` |
| Format file salah | Jelaskan format yang diterima | `File harus berformat PDF.` |
| Ukuran file berlebih | Sebutkan batas ukuran | `Ukuran file maksimal 10 MB.` |
| Relasi nilai tidak valid | Jelaskan relasi yang harus diperbaiki | `Tanggal berakhir sewa tidak boleh lebih awal dari tanggal mulai sewa.` |
| Nilai tidak ditemukan | Sebutkan nilai dan tindakan berikutnya | `Kode PILOK tidak ditemukan. Periksa kembali kode yang dimasukkan.` |

Gunakan kapitalisasi nama field secara konsisten dengan label. Untuk kalimat
deskriptif seperti tanggal mulai/berakhir sewa, gunakan sentence case seperti
contoh di atas.

### Date and Time

- Field tanggal kalender menggunakan native date control (`type="date"`) jika
  memungkinkan agar pengguna tetap mendapatkan calendar picker browser. Jangan
  mengganti native date control hanya untuk memaksakan format visual tertentu.
- Nilai internal native date input boleh menggunakan format `YYYY-MM-DD`.
  Tanggal kalender yang dipersistensikan ke spreadsheet PILOK menggunakan
  format `DD-MM-YYYY`.
- Konversi, validasi, dan perbandingan tanggal harus memisahkan komponen hari,
  bulan, dan tahun secara eksplisit melalui helper bersama. Jangan mengandalkan
  parsing `Date` yang bergantung locale browser atau server.
- Timestamp sistem pada form operasional PILOK menggunakan WIB dengan timezone
  eksplisit `Asia/Jakarta` dan format `DD-MM-YYYY HH:mm:ss`.
- Timestamp dibuat oleh server; jangan memakai jam browser atau timezone lokal
  runtime secara implisit.

## Spacing dan typography

- Gunakan ritme utama 16/20/24/28 px dan gap field 20 px.
- Judul halaman 24–30 px, judul section 20 px, label dan body 14 px.
- Batasi shadow pada surface utama; nested card cukup memakai border halus.
- Semantic colors hanya untuk status. Merah SIG adalah aksen brand, sedangkan
  merah error atau destructive harus tetap memiliki konteks dan label jelas.

## Mobile Containment & Overflow

Seluruh form PILOK harus tetap berada di dalam viewport pada lebar mobile dan
tidak boleh membuat horizontal page scrolling.

- Form control dan card menggunakan `width: 100%` dan `max-width: 100%`.
- Child flex/grid yang memuat konten dinamis menggunakan `min-width: 0` agar
  dapat menyusut mengikuti parent.
- Track responsive grid menggunakan `minmax(0, 1fr)` ketika konten berpotensi
  memperlebar kolom.
- Nilai dinamis panjang seperti nama file, nama gudang, kode, URL, dan label
  harus wrap atau truncate, bukan memperlebar parent.
- Existing-document/file component ditumpuk vertikal pada layar kecil ketika
  nama file dan aksi tidak dapat berada dalam satu baris secara nyaman.
- Aksi primer dan sekunder harus tetap dapat dijangkau tanpa horizontal scroll.
- Hindari fixed width untuk konten form pada mobile.
- Jangan menggunakan global overflow hiding sebagai solusi utama untuk child
  layout yang rusak.
- Validasi layout sekurangnya pada lebar sekitar 320, 360, 375, 390, dan 430 px.

### Long filenames

- Container nama file harus shrinkable.
- Gunakan ellipsis untuk state ringkas satu baris.
- Aksi boleh berpindah ke bawah nama file pada mobile.
- Sediakan nama file lengkap secara accessible melalui `title` atau mekanisme
  setara jika memungkinkan.
- Nama file tidak boleh menentukan lebar form atau card.

### Responsive Form Rows

Baris form multi-kolom harus menjadi satu kolom pada layar kecil. Setiap child
harus dapat menyusut dengan `min-width: 0`; gunakan track
`minmax(0, 1fr)` untuk menjaga konten tetap berada di dalam parent.

## Reuse pada form PILOK berikutnya

Mulai dari FormShell, susun SectionCard, lalu tutup form dengan ActionBar.
Gunakan komponen field yang ada sebelum membuat varian baru. Business state dan
validation tetap berada di form/domain layer; komponen layout tidak boleh
menentukan aturan bisnis.
