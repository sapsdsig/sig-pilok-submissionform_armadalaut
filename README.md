# PILOK - Armada Kapal

Form pendataan kepemilikan armada kapal distributor. Frontend menggunakan React/Vite dan API server-side menggunakan Vercel Functions, Google Sheets, serta Google Drive.

## Environment Variables

Salin `.env.example` ke `.env.local` untuk development. Jangan menggunakan prefix `VITE_` untuk credential Google.

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_MASTER_SPREADSHEET_ID=
GOOGLE_SUBMISSION_SPREADSHEET_ID=
GOOGLE_KAPAL_FOLDER_ID=
GOOGLE_MASTER_DISTRIBUTOR_SHEET=master_distributor
GOOGLE_SUBMISSION_SHEET=submission
GOOGLE_SUBMISSION_KAPAL_SHEET=submission_kapal
```

## Google Resources

- Spreadsheet `master data distributor`, dengan sheet yang dikonfigurasi melalui `GOOGLE_MASTER_DISTRIBUTOR_SHEET`.
- Spreadsheet `submission`:
  - `submission`
  - `submission_kapal`
- Folder Drive `folder bukti kepemilikan kapal`.

File tetap private dan mengikuti permission folder Drive. Aplikasi tidak membuat permission `anyoneWithLink`.

## Local Development

```bash
npm install
npm run dev
```

`npm run dev` menjalankan Vite dan route `/api/*` dalam satu local development server. Loader server membaca `.env.local` lalu `.env` dari project root tanpa menimpa environment variable yang sudah diberikan OS/runtime.

## Google Verification

```bash
npm run verify:google
```

Script ini melakukan pemeriksaan read-only terhadap OAuth, header spreadsheet, sheet, dan folder Drive. Script tidak membuat submission atau menghapus file.

## Testing

```bash
npm test
```

Automated test menggunakan Google gateway mock dan tidak membutuhkan credential atau resource production.

## Build

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

Deploy sebagai project Vercel dan tambahkan seluruh variable dari `.env.example` melalui project settings. Setelah deployment, periksa `/api/health`, `/api/distributors?query=...`, dan endpoint existing submission menggunakan distributor yang aman.
