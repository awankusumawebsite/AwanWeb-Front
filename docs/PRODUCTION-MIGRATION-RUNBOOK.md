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
- CI Astro hanya menguji dan menyimpan artifact noindex selama tujuh hari.
- Belum ada remote Git, credential hosting, subdomain staging, ataupun workflow
  deployment aktif untuk Astro.

## 2. Informasi Manual yang Wajib Diverifikasi

Jangan mengaktifkan deployment sebelum semua kotak berikut terisi.

- [ ] Document root aktual domain `awankusuma.com` di cPanel: `____________`
- [ ] Subdomain staging dibuat, disarankan `astro-preview.awankusuma.com`.
- [ ] Document root staging: `____________`
- [ ] Symlink di document root didukung untuk subdomain staging.
- [ ] Repository GitHub tujuan `AwanWeb-Astro`: `____________`
- [ ] Metode transfer dipilih: SFTP/SSH (utama) atau FTPS + HTTPS trigger.
- [ ] Nilai credential disimpan sebagai GitHub Environment secret, bukan file.
- [ ] Akses Cloudflare DNS tersedia untuk fase cutover.
- [ ] IP origin DomaiNesia untuk frontend sudah diverifikasi dari cPanel/provider.

Nilai secret, token, password, dan private key tidak boleh ditulis di dokumen ini.

## 3. Struktur Release yang Disarankan

Struktur berikut memisahkan staging dan production, tetapi dapat memakai release
artifact yang sama bila hasil build dan environment identik.

```text
/home/ryuumeco/
├── frontend-releases/
│   └── <git-sha>/
│       ├── index.html
│       ├── .htaccess
│       ├── _astro/
│       └── ...
├── frontend-staging-current -> frontend-releases/<git-sha>
├── frontend-current         -> frontend-releases/<git-sha>
└── frontend-shared/
    ├── deploy-control/
    └── logs/
```

Document root staging diarahkan ke symlink stabil yang menuju
`frontend-staging-current`. Document root production baru dihubungkan ke
`frontend-current` saat cutover; path aktualnya harus mengikuti hasil verifikasi
cPanel, bukan asumsi dari struktur lama.

## 4. Kontrak Build

### Staging

```bash
PUBLIC_BACKEND_URL=https://cms.awankusuma.com \
CMS_BUILD_TIMEOUT_MS=10000 \
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
CMS_BUILD_TIMEOUT_MS=10000 \
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

1. Buat backup/arsip document root staging bila folder sudah berisi file.
2. Buat direktori release dan shared:

   ```bash
   mkdir -p /home/ryuumeco/frontend-releases
   mkdir -p /home/ryuumeco/frontend-shared/deploy-control
   mkdir -p /home/ryuumeco/frontend-shared/logs
   chmod 700 /home/ryuumeco/frontend-shared/deploy-control
   ```

3. Upload archive hasil build staging beserta SHA-256 ke lokasi non-public.
4. Verifikasi checksum sebelum ekstraksi:

   ```bash
   cd /home/ryuumeco/frontend-shared/deploy-control
   sha256sum -c frontend.sha256
   ```

5. Ekstrak ke direktori baru bernama full Git SHA. Jangan menimpa release lama.
6. Verifikasi minimal:

   ```bash
   test -f /home/ryuumeco/frontend-releases/GIT_SHA/index.html
   test -f /home/ryuumeco/frontend-releases/GIT_SHA/.htaccess
   test -f /home/ryuumeco/frontend-releases/GIT_SHA/robots.txt
   test -d /home/ryuumeco/frontend-releases/GIT_SHA/_astro
   ```

7. Buat symlink sementara, lalu rename secara atomic:

   ```bash
   ln -s /home/ryuumeco/frontend-releases/GIT_SHA \
     /home/ryuumeco/frontend-staging-current.tmp
   mv -Tf /home/ryuumeco/frontend-staging-current.tmp \
     /home/ryuumeco/frontend-staging-current
   ```

8. Hubungkan document root staging yang sudah diverifikasi ke symlink tersebut.
   Jangan memakai command ini sebelum path document root diketahui.
9. Simpan sedikitnya lima release terakhir dan jangan hapus target symlink aktif.

Catatan: bila `mv -T` tidak tersedia pada shared hosting, gunakan temporary link
di parent yang sama dan `mv -f`; uji dahulu pada staging, bukan production.

## 6. Acceptance Staging

### HTTP dan keamanan

- [ ] Home `id/en/zh` merespons 200.
- [ ] `.htaccess` aktif: URL acak memberi branded 404.
- [ ] Header `X-Frame-Options`, `X-Content-Type-Options`, HSTS, referrer policy,
      permissions policy, dan cache-control muncul.
- [ ] `robots.txt` staging memuat `Disallow: /`.
- [ ] Sitemap tidak memuat `/login`, `/lacak`, `/mitra`, `/faq`, atau `/404`.
- [ ] Tidak ada asset, internal link, atau locale URL 404.

### Parity aplikasi

- [ ] Home: preloader, hero poster/video, navbar, locale, dan seluruh section.
- [ ] Tentang Kami, Layanan, detail layanan, Kontak, Info Bisnis, detail artikel.
- [ ] Pagination/kategori artikel dan tombol Back tidak menghasilkan hash ganda.
- [ ] Login guest/customer/notaris/admin menuju tujuan role yang benar.
- [ ] Public tracking dengan dan tanpa verifikasi telepon.
- [ ] Customer portal: order, invoice, dokumen, dan upload receipt.
- [ ] Mitra: filter/detail, stage/checklist, dokumen, assignment dan status staf.
- [ ] Error 401/403/404/429/5xx/network memiliki state yang berbeda.

### SEO dan performa

- [ ] Canonical dan hreflang `id/en/zh/x-default` benar.
- [ ] JSON-LD valid pada Home, layanan, dan artikel.
- [ ] Tidak ada regresi LCP/CLS/INP lebih dari 10% terhadap Next pada template utama.
- [ ] Tidak ada browser GET ke CMS pada halaman konten statis.
- [ ] Mobile nyata: preloader tidak menahan bot dan hero tidak hitam.

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

1. Bekukan perubahan frontend selama window cutover.
2. Bangun ulang artifact production dengan `MIGRATION_NOINDEX=false` dan analytics
   aktif; jangan mempromosikan artifact staging noindex.
3. Jalankan test, build, dan `validate:dist` pada commit yang sama.
4. Upload sebagai release baru, verifikasi checksum dan struktur.
5. Verifikasi `robots.txt` production mengizinkan public site dan menunjuk sitemap.
6. Aktifkan `frontend-current` secara atomic.
7. Arahkan document root production terverifikasi ke `frontend-current`.
8. Ubah Cloudflare/DNS hanya setelah origin dapat diuji memakai override host.
9. Pertahankan Vercel project dan deployment terakhir sebagai rollback.
10. Jalankan smoke test production dari jaringan Indonesia mobile dan desktop.

Jangan menghapus domain dari Vercel pada hari cutover. TTL DNS diturunkan sebelum
window perubahan, bukan sesudah masalah terjadi.

## 9. Rollback

### Aplikasi Astro rusak, origin tetap sehat

Kembalikan `frontend-current` ke SHA sebelumnya secara atomic, lalu ulangi health
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

Source lokal sekarang sudah menyiapkan kontrak ini tanpa mengaktifkannya:

- Model CMS public tetap mengirim revalidasi Next selama fase rollback.
- Perubahan yang sama hanya menandai pending build Astro bila feature flag aktif.
- Redis menggabungkan tag selama 120 detik, dengan batas tunggu maksimum 15 menit.
- Scheduler `frontend:dispatch-pending-build` berjalan tiap menit dan hanya
  menghapus pending state setelah GitHub merespons sukses.
- Workflow Astro menerima event `repository_dispatch` bertipe
  `cms-content-changed`; concurrency tidak membatalkan build yang sedang aktif.

Aktivasi tetap dilarang sebelum repository remote dan staging lulus. Setelah itu,
buat fine-grained GitHub token yang hanya diarahkan ke repository Astro dengan
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
