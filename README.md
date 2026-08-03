# Awan Web Astro

Calon frontend statis Awan Kusuma yang dibangun paralel dengan frontend Next.js.

## Status

- Belum terhubung ke production.
- Belum memiliki remote Git.
- Next.js di Vercel tetap menjadi frontend production dan jalur rollback.
- Migrasi dilakukan per route dengan parity gate; tidak ada big-bang rewrite.

## Menjalankan lokal

```bash
npm install
npm run dev
npm test
npm run build
```

Salin `.env.example` menjadi `.env` hanya untuk konfigurasi lokal. Jangan simpan
secret atau kredensial dalam repository ini.
