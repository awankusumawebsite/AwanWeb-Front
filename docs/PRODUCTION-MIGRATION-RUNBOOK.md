# Runbook Migrasi Astro ke DomaiNesia

Dokumen ini adalah panduan staging, cutover, dan rollback frontend Astro. Seluruh
langkah bersifat **manual sampai informasi hosting terverifikasi**. Menjalankan CI
di repository tidak mengunggah atau mengaktifkan website.

## 1. Keadaan Saat Ini

- `awankusuma.com` masih dilayani frontend Next.js dari Vercel.
- `cms.awankusuma.com` tetap Laravel di DomaiNesia dan tidak ikut dimigrasikan.
- `AwanWeb-Astro` menghasilkan file statis pada `dist/`; tidak memerlukan Node.js
  pada shared hosting.
- Next/Vercel harus tetap hidup sebagai rollback sampai Astro production stabil.
- CI Astro menguji, membangun artifact noindex, dan menyimpannya selama tujuh
  hari. Artifact menyertakan hidden file `.htaccess` secara eksplisit.
- Remote lokal mengarah ke repository GitHub Astro dan workflow atomic staging
  sudah aktif. Release staging terakhir yang tercatat adalah `458f558`.
- `staging.awankusuma.com` sudah dibuat dan merespons HTTPS dari document root
  `/home/ryuumeco/staging.awankusuma.com`.
- Smoke test dan acceptance staging telah dinyatakan selesai pada 5 Agustus 2026.
  Production tetap Next/Vercel sampai workflow production mode `activate`, smoke
  origin, dan perubahan DNS dijalankan pada window cutover.

## 2. Informasi Manual yang Wajib Diverifikasi

Jangan mengaktifkan deployment sebelum semua kotak berikut terisi.

- [x] Document root aktual domain `awankusuma.com` di cPanel:
      `/home/ryuumeco/awankusuma.com`.
- [x] Subdomain staging: `staging.awankusuma.com`.
- [x] Document root staging: `/home/ryuumeco/staging.awankusuma.com`.
- [x] Symlink didukung oleh akun hosting.
- [x] Repository GitHub tujuan:
      `awankusumawebsite/AwanWeb-FrontStaging`.
- [x] Metode transfer: SSH/SCP dengan key khusus deployment staging.
- [x] Nilai credential staging disimpan sebagai GitHub Environment secret, bukan file.
- [ ] GitHub Environment `production`, required reviewer, dan enam secret
      production pada bagian 8 sudah disiapkan.
- [x] Akses Cloudflare DNS tersedia untuk fase staging/cutover.
- [x] Origin DomaiNesia staging sudah diverifikasi melalui record DNS dan HTTPS.

Nilai secret, token, password, dan private key tidak boleh ditulis di dokumen ini.

## 3. Struktur Release yang Disarankan

Struktur berikut memisahkan artifact staging dan production secara eksplisit.

```text
/home/ryuumeco/
├── frontend-releases/
│   └── <release-id-staging>/
│       ├── index.html
│       ├── .htaccess
│       ├── _astro/
│       └── ...
├── frontend-production-releases/
│   └── <release-id-production>/
├── frontend-staging-current -> frontend-releases/<release-id-staging>
├── frontend-current         -> frontend-production-releases/<release-id-production>
└── frontend-shared/
    ├── deploy-control/
    └── logs/
```

Document root staging diarahkan ke symlink stabil yang menuju
`frontend-staging-current`. Artifact production memakai root terpisah karena
build staging dan production dari commit yang sama berbeda pada robots, metadata,
dan analytics. Document root production baru dihubungkan ke `frontend-current`
saat cutover; path aktualnya harus mengikuti hasil verifikasi cPanel, bukan
asumsi dari struktur lama.

Release ID memakai `<git-sha>-<github-run-id>-<run-attempt>`, bukan Git SHA saja.
Hal ini wajib karena event CMS dapat membangun ulang commit yang sama dengan
snapshot konten baru; memakai SHA saja akan salah mengaktifkan artifact lama.

Workflow `.github/workflows/ci.yml` membangun artifact sekali, lalu job staging
yang bergantung pada gate tersebut melakukan checksum, upload ke deploy-control,
ekstraksi immutable, validasi file wajib, pergantian pointer atomic, health check,
rollback pointer bila gagal, dan retensi sedikitnya lima release.

GitHub Environment `staging` wajib memiliki secret berikut sebelum push pertama:

```text
STAGING_SSH_HOST
STAGING_SSH_PORT
STAGING_SSH_USER
STAGING_SSH_PRIVATE_KEY
STAGING_SSH_KNOWN_HOSTS
```

Private key harus khusus GitHub Actions staging. `STAGING_SSH_KNOWN_HOSTS` harus
berasal dari host key yang fingerprint-nya telah diverifikasi, bukan hasil
`ssh-keyscan` yang dipercaya tanpa pembanding.

## 4. Kontrak Build

### Staging

```bash
PUBLIC_BACKEND_URL=https://cms.awankusuma.com \
CMS_BUILD_TIMEOUT_MS=30000 \
CMS_BUILD_CONCURRENCY=1 \
MIGRATION_NOINDEX=true \
PUBLIC_ANALYTICS_ENABLED=false \
npm run build

npm run validate:dist
```

Staging harus menghasilkan `noindex, nofollow`, `robots.txt` dengan
`Disallow: /`, dan analytics mati.

### Production

```bash
PUBLIC_BACKEND_URL=https://cms.awankusuma.com \
CMS_BUILD_TIMEOUT_MS=30000 \
CMS_BUILD_CONCURRENCY=1 \
MIGRATION_NOINDEX=false \
PUBLIC_ANALYTICS_ENABLED=true \
npm run build

npm run validate:dist
```

Production harus menghasilkan metadata indexable, tetapi route login, tracking,
dan portal tetap noindex serta tidak masuk sitemap.

Jangan mengubah kegagalan CMS menjadi data kosong. Build yang gagal harus
mempertahankan release aktif.

### Optimasi media CMS saat build

`npm run build` tidak berhenti pada `astro build`. Langkah
`optimize:remote-images` mengambil raster dari host persis
`cdn.awankusuma.com` dan avatar testimonial dari host persis
`lh3.googleusercontent.com`, mengubahnya menjadi WebP dengan nama berbasis
content hash, lalu mengganti referensi HTML dan serialized island props ke
artifact lokal `/_media/cms/`. Avatar Google dilokalkan karena pemuatan langsung
dari browser dapat ditolak oleh perlindungan ORB.

Kontrak operasionalnya:

- object asli R2 tidak ditulis, dihapus, atau dimigrasikan;
- maksimal tiga download paralel, timeout 15 detik, dan input maksimal 10 MB;
- kegagalan download/transform menggagalkan build sebelum release aktif;
- metadata Open Graph, Twitter, dan JSON-LD tetap memakai URL production absolut;
- validator menolak artifact bila raster CMS mentah masih tertinggal atau file
  optimized yang dirujuk tidak tersedia.

Karena output memakai content hash, media pada `/_media/cms/` aman diberi cache
panjang. Jangan memisahkan `astro build` dan optimizer ketika membuat artifact
release; selalu jalankan `npm run build` secara utuh.

## 5. Bootstrap Staging Manual Pertama

Tahap ini baru boleh dilakukan setelah document root staging terverifikasi.

1. Pertahankan halaman staging yang sekarang sebagai bootstrap release agar
   perubahan document root tidak menimbulkan jeda layanan:

   ```bash
   cd /home/ryuumeco
   mkdir -p /home/ryuumeco/frontend-releases
   mv /home/ryuumeco/staging.awankusuma.com \
     /home/ryuumeco/frontend-releases/bootstrap-20260805
   ln -s /home/ryuumeco/frontend-releases/bootstrap-20260805 \
     /home/ryuumeco/frontend-staging-current
   ln -s /home/ryuumeco/frontend-staging-current \
     /home/ryuumeco/staging.awankusuma.com
   ```

   Sebelum menjalankan blok tersebut, pastikan ketiga target tujuan belum ada.
   Sesudahnya, `curl -fsS https://staging.awankusuma.com/` harus tetap sukses.
2. Buat direktori release dan shared:

   ```bash
   mkdir -p /home/ryuumeco/frontend-releases
   mkdir -p /home/ryuumeco/frontend-shared/deploy-control
   mkdir -p /home/ryuumeco/frontend-shared/logs
   chmod 700 /home/ryuumeco/frontend-shared/deploy-control
   ```

3. Tambahkan public key deployment ke `~/.ssh/authorized_keys`, buat GitHub
   Environment `staging`, lalu isi kelima secret yang tercantum di atas.
4. Upload archive hasil build staging beserta SHA-256 ke lokasi non-public.
   Workflow melakukan tahap ini otomatis setelah gate build hijau.
5. Verifikasi checksum sebelum ekstraksi:

   ```bash
   cd /home/ryuumeco/frontend-shared/deploy-control
   sha256sum -c frontend.sha256
   ```

6. Ekstrak ke direktori baru bernama full Git SHA. Jangan menimpa release lama.
7. Verifikasi minimal:

   ```bash
   test -f /home/ryuumeco/frontend-releases/GIT_SHA/index.html
   test -f /home/ryuumeco/frontend-releases/GIT_SHA/.htaccess
   test -f /home/ryuumeco/frontend-releases/GIT_SHA/robots.txt
   test -d /home/ryuumeco/frontend-releases/GIT_SHA/_astro
   ```

8. Buat symlink sementara, lalu rename secara atomic:

   ```bash
   ln -s /home/ryuumeco/frontend-releases/GIT_SHA \
     /home/ryuumeco/frontend-staging-current.tmp
   mv -Tf /home/ryuumeco/frontend-staging-current.tmp \
     /home/ryuumeco/frontend-staging-current
   ```

9. Document root staging harus tetap berupa symlink absolut ke
   `/home/ryuumeco/frontend-staging-current`; remote deploy script akan gagal
   aman bila kontrak ini berubah.
10. Simpan sedikitnya lima release terakhir dan jangan hapus target symlink aktif.

Catatan: bila `mv -T` tidak tersedia pada shared hosting, gunakan temporary link
di parent yang sama dan `mv -f`; uji dahulu pada staging, bukan production.

## 6. Acceptance Staging — Selesai 5 Agustus 2026

Checklist berikut ditutup melalui smoke Apache, browser regression, audit SEO dan
performa, serta konfirmasi penyelesaian staging dari pemilik pada 5 Agustus 2026.

### HTTP dan keamanan

- [x] Home `id/en/zh` merespons 200.
- [x] `.htaccess` aktif: URL acak memberi branded 404.
- [x] Header `X-Frame-Options`, `X-Content-Type-Options`, HSTS, referrer policy,
      permissions policy, dan cache-control muncul.
- [x] `robots.txt` staging memuat `Disallow: /`.
- [x] Sitemap tidak memuat `/login`, `/lacak`, `/mitra`, `/faq`, atau `/404`.
- [x] Tidak ada asset, internal link, atau locale URL 404.

### Parity aplikasi

- [x] Home: preloader, hero poster/video, navbar, locale, dan seluruh section.
- [x] Tentang Kami, Layanan, detail layanan, Kontak, Info Bisnis, detail artikel.
- [x] Pagination/kategori artikel dan tombol Back tidak menghasilkan hash ganda.
- [x] Login guest/notaris/staf/admin menuju tujuan role yang benar.
- [x] Public tracking menerima kode dan menampilkan hasil tanpa portal customer
      atau verifikasi telepon, sesuai kontrak 4 Agustus 2026.
- [x] Mitra: filter/detail, stage/checklist, dokumen, assignment dan status staf.
- [x] Error 401/403/404/429/5xx/network memiliki state yang berbeda.

### SEO dan performa

- [x] Canonical dan hreflang `id/en/zh/x-default` benar.
- [x] JSON-LD valid pada Home, layanan, dan artikel.
- [x] Tidak ada regresi LCP/CLS/INP lebih dari 10% terhadap Next pada template utama.
- [x] Tidak ada browser GET ke CMS pada halaman konten statis.
- [x] Mobile nyata: preloader tidak menahan bot dan hero tidak hitam.

## 7. Redirect yang Harus Diuji

Artifact `.htaccess` membawa redirect untuk:

- URL legacy About, Tracking, Blog, Auth, numeric service ID, Cookie/Privacy.
- Typo slug artikel Migrasi KBLI.
- `/faq` menuju section FAQ di Kontak.
- URL query pagination Info Bisnis Next menuju path pagination Astro.
- `/mitra/orders/<code>` menuju `/mitra?order=<code>`.

Gunakan `curl -I` pada staging dengan host yang benar. Redirect permanen harus
301; redirect state portal detail sengaja 302 agar representasi dapat diubah di
masa depan tanpa cache permanen browser.

## 8. Persiapan Cutover Production

Cutover hanya boleh dijadwalkan setelah acceptance staging ditandatangani.

Workflow manual `.github/workflows/production.yml` menyediakan dua mode:

- `prepare`: build production, test, validasi, checksum, upload, lalu ekstrak ke
  release immutable tanpa mengubah pointer atau document root;
- `activate`: mengulangi semua gate, mengganti `frontend-current` secara atomic,
  lalu health check origin dengan `curl --resolve`. Kegagalan mengembalikan pointer
  sebelumnya otomatis.

GitHub Environment `production` wajib memakai required reviewer selama cutover
dan stabilisasi 24 jam, serta secrets:

```text
PRODUCTION_SSH_HOST
PRODUCTION_SSH_PORT
PRODUCTION_SSH_USER
PRODUCTION_SSH_PRIVATE_KEY
PRODUCTION_SSH_KNOWN_HOSTS
PRODUCTION_ORIGIN_IP
```

Input konfirmasi workflow harus persis `awankusuma.com`. `PRODUCTION_ORIGIN_IP`
memastikan health check menguji DomaiNesia secara langsung dan tidak memperoleh
halaman lama dari Cloudflare/Vercel.

Setelah stabilisasi ditandatangani, required reviewer dapat dilepas agar
`repository_dispatch` dari CMS melakukan build dan aktivasi otomatis. Batasi
deployment environment ke branch `master`; jangan melepas proteksi secret atau
menyalakan trigger CMS sebelum Astro sudah aktif di production.

1. Bekukan perubahan frontend selama window cutover.
2. Bangun ulang artifact production dengan `MIGRATION_NOINDEX=false` dan analytics
   aktif; jangan mempromosikan artifact staging noindex.
3. Jalankan test, build, dan `validate:dist` pada commit yang sama.
4. Jalankan workflow mode `prepare`; verifikasi checksum dan struktur release.
5. Verifikasi `robots.txt` production mengizinkan public site dan menunjuk sitemap.
6. Siapkan document root production sebagai symlink absolut ke
   `/home/ryuumeco/frontend-current` selama DNS publik masih menuju Vercel.
7. Jalankan workflow mode `activate`; pointer berubah atomic dan origin diuji
   langsung dengan override IP.
8. Ubah Cloudflare/DNS hanya setelah smoke origin lulus.
9. Pertahankan Vercel project dan deployment terakhir sebagai rollback.
10. Jalankan smoke test production dari jaringan Indonesia mobile dan desktop.

Jangan menghapus domain dari Vercel pada hari cutover. TTL DNS diturunkan sebelum
window perubahan, bukan sesudah masalah terjadi.

## 9. Rollback

### Aplikasi Astro rusak, origin tetap sehat

Kembalikan `frontend-current` ke release ID sebelumnya secara atomic, lalu ulangi health
check. Tidak ada rollback database atau media.

### Origin/shared hosting bermasalah

Kembalikan DNS/domain ke deployment Next/Vercel yang masih hidup. Karena backend,
database, dan R2 tidak berubah, rollback tidak memerlukan migrasi data.

### Kriteria rollback segera

- Error 5xx/404 route penting.
- Login/tracking/portal tidak dapat digunakan.
- Asset utama gagal dimuat secara luas.
- Canonical/robots production salah atau seluruh situs noindex.
- LCP/CLS/INP mengalami regresi berat dan konsisten.

## 10. Build Trigger dari CMS

Jangan memicu build pada setiap autosave atau perubahan draft. Trigger hanya boleh
berasal dari perubahan konten yang sudah disimpan dan memengaruhi public site.

Kontrak yang disarankan:

- Satu secret header; tidak memakai token query string.
- Payload hanya jenis resource, ID/slug, event, dan timestamp—tanpa konten sensitif.
- Debounce/coalesce 60–120 detik agar beberapa perubahan menjadi satu build.
- Hanya satu build aktif; event selama build ditandai sebagai satu rebuild susulan.
- Retry bounded dengan backoff; tidak ada loop tanpa batas.
- Release baru aktif hanya setelah checksum, validator, dan health check lulus.
- Kegagalan build tidak mengganti symlink aktif.

Source sekarang sudah menyiapkan kontrak ini tanpa mengaktifkan feature flag CMS:

- Model CMS public tetap mengirim revalidasi Next selama fase rollback.
- Perubahan yang sama hanya menandai pending build Astro bila feature flag aktif.
- Redis menggabungkan tag selama 120 detik, dengan batas tunggu maksimum 15 menit.
- Scheduler `frontend:dispatch-pending-build` berjalan tiap menit dan hanya
  menghapus pending state setelah GitHub merespons sukses.
- Workflow production menerima event `repository_dispatch` bertipe
  `cms-content-changed`, membangun artifact indexable, lalu mengaktifkannya secara
  atomic. Workflow staging tidak menerima event CMS agar artifact noindex tidak
  pernah dipromosikan ke production.
- Setiap build memakai release ID `<git-sha>-<github-run-id>-<run-attempt>` agar
  snapshot CMS baru pada commit yang sama tidak memakai ulang artifact lama.
- Concurrency tidak membatalkan build yang sedang aktif; event yang tiba selama
  build digabung menjadi satu run pending terbaru.

Aktivasi feature flag tetap dilarang sebelum Astro aktif di production dan smoke
cutover lulus. Setelah itu, buat fine-grained GitHub token yang hanya diarahkan ke
repository Astro dengan
permission **Contents: Read and write** (permission minimum endpoint repository
dispatch), lalu simpan hanya pada `/home/ryuumeco/backend-shared/.env`:

```dotenv
FRONTEND_BUILD_DISPATCH_ENABLED=true
FRONTEND_BUILD_DISPATCH_URL=https://api.github.com/repos/OWNER/REPOSITORY/dispatches
FRONTEND_BUILD_DISPATCH_TOKEN=<secret-dari-GitHub>
FRONTEND_BUILD_EVENT_TYPE=cms-content-changed
FRONTEND_BUILD_DEBOUNCE_SECONDS=120
FRONTEND_BUILD_MAX_DELAY_SECONDS=900
FRONTEND_BUILD_TIMEOUT_SECONDS=8
```

Jangan menghapus `NEXTJS_REVALIDATE_*` sebelum Astro production stabil dan masa
rollback Next berakhir. Token asli tidak boleh ditempel ke issue, chat, log,
repository, atau Obsidian.

## 11. Monitoring 24 Jam Pertama

- Status HTTP dan error log Apache.
- Broken asset/link dan branded 404 volume.
- Laravel 401/403/429/5xx serta response time CMS.
- Resource usage DomaiNesia: CPU, Entry Process, I/O, faults.
- Cloudflare cache status dan bandwidth.
- Analytics/Meta hanya pada production.
- Core Web Vitals per template; Search Console bukan sinyal real-time.

## 12. Batasan yang Tetap Berlaku

- Tidak ada load test agresif ke production.
- Tidak ada overwrite/migrasi media R2.
- Tidak ada perubahan backend authorization.
- Tools React (`pdf-liner`, `surat-kuasa`) belum boleh keluar dari maintenance
  sebelum parity dan browser test tersedia.
- Nilai secret tidak boleh masuk Git, artifact, log, atau Obsidian.
