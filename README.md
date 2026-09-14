# Awan Web Astro

Frontend statis production Awan Kusuma yang dibangun dengan Astro dan dilayani
oleh DomaiNesia.

## Status

- Production publik: `https://awankusuma.com`.
- Staging noindex: `https://staging.awankusuma.com`.
- Repository utama: `awankusumawebsite/AwanWeb-Front`, branch `master`.
- Push atau merge ke `master` menjalankan CI dan atomic deploy ke staging.
- Production dibangun dan diaktifkan secara atomic melalui workflow
  **Astro production release**, baik secara manual maupun melalui
  `repository_dispatch` dari CMS.

## Alur perubahan

1. Sinkronkan `master`, lalu kerjakan perubahan pada branch terpisah.
2. Jalankan `npm test`, `npm run check`, `npm run build`,
   `npm run validate:dist`, dan `git diff --check`.
3. Push branch dan merge pull request setelah gate hijau.
4. Pastikan workflow **Astro static CI** pada `master` hijau dan staging sehat.
5. Untuk rilis kode segera ke production, jalankan workflow
   **Astro production release** dengan mode `activate`. Push ke `master` sendiri
   tidak langsung mengaktifkan production.

Perubahan konten publik di CMS dapat mengirim `repository_dispatch`. Event ini
membangun snapshot konten terbaru dari `master` dan mengaktifkannya ke
production. Karena itu, jangan meninggalkan kode yang belum siap production di
`master`.

Runbook lengkap tersedia di
[`docs/PRODUCTION-MIGRATION-RUNBOOK.md`](./docs/PRODUCTION-MIGRATION-RUNBOOK.md).

## Menjalankan lokal

```bash
npm ci
npm run dev
npm test
npm run build
```

Salin `.env.example` menjadi `.env` hanya untuk konfigurasi lokal. Jangan simpan
secret atau kredensial dalam repository ini.
