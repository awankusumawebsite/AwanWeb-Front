# Panduan Lengkap Cutover Production Next.js ke Astro

Dokumen ini adalah checklist operator untuk memindahkan `awankusuma.com` dari
Next.js/Vercel ke Astro static di DomaiNesia. Ikuti urutan tanpa melompati gate.
Runbook teknis dan alasan desain tetap tersedia di
`docs/PRODUCTION-MIGRATION-RUNBOOK.md`.

## 1. Sasaran dan status awal

Sasaran akhir:

```text
Cloudflare
    -> awankusuma.com / www.awankusuma.com
    -> DomaiNesia Apache/LiteSpeed
    -> /home/ryuumeco/awankusuma.com
    -> /home/ryuumeco/frontend-current
    -> /home/ryuumeco/frontend-production-releases/<release-id>
```

Yang tidak berubah:

- `cms.awankusuma.com`, Laravel, database, Redis, R2/CDN, email, dan authorization;
- URL publik dan tiga locale: Indonesia tanpa prefix, `/en`, dan `/zh`;
- Vercel tetap hidup selama masa rollback;
- media R2 tidak dipindah, ditimpa, atau dihapus.

Status sebelum panduan ini dijalankan:

- production masih Next.js/Vercel;
- staging Astro sudah lulus smoke dan atomic deployment;
- repository Astro adalah `awankusumawebsite/AwanWeb-FrontStaging`, branch
  production/staging adalah `master`;
- document root production terverifikasi sebagai
  `/home/ryuumeco/awankusuma.com`;
- origin DomaiNesia yang terlihat melalui staging pada 5 Agustus 2026 adalah
  `36.50.77.59`, tetapi nilai ini wajib diverifikasi lagi sebelum cutover;
- trigger build Astro di backend masih harus tetap `false` sampai smoke
  production selesai.

## 2. Aturan keselamatan

1. Jangan menghapus project/domain Vercel pada hari cutover.
2. Jangan menghapus `NEXTJS_REVALIDATE_*` selama masa rollback.
3. Jangan mempromosikan artifact staging karena membawa `noindex` dan analytics
   mati. Production harus dibangun ulang oleh workflow production.
4. Jangan menulis private key, token GitHub, password, atau isi `.env` ke Git,
   issue, chat, screenshot, atau log.
5. Jangan mengubah `cms.awankusuma.com`, record email, database, atau media R2.
6. Setiap perubahan pointer harus atomic. Jangan menyalin file langsung ke
   document root aktif.
7. Bila salah satu gate gagal, hentikan langkah berikutnya. Release Next/Vercel
   tetap menjadi layanan publik sampai DNS benar-benar dialihkan.
8. Siapkan dua orang bila memungkinkan: satu operator dan satu verifier.

## 3. Urutan dan estimasi window

| Fase | Waktu perkiraan | Dampak publik |
| --- | ---: | --- |
| Persiapan akun, secrets, dan snapshot DNS | T-24 jam | Tidak ada |
| Workflow production `prepare` | 5–20 menit | Tidak ada |
| Bootstrap symlink origin | 5 menit | Tidak ada bila DNS masih Vercel |
| Workflow `activate` dan smoke origin | 10–25 menit | Tidak ada bila DNS masih Vercel |
| Perubahan DNS Cloudflare | 2–10 menit | Mulai menerima traffic Astro |
| Smoke publik | 15–30 menit | Dipantau ketat |
| Stabilisasi | 24 jam | Astro production, Next siap rollback |

Jadwalkan window ketika tidak ada editor yang memublikasikan konten. Bekukan
push frontend dan perubahan konten public sejak workflow `prepare` dimulai sampai
smoke publik selesai.

## 4. Data yang harus dicatat operator

Buat catatan privat di luar repository. Jangan menaruh secret di catatan ini.

```text
Waktu mulai (WIB):
Operator:
Verifier:
Commit master:
Origin IP terverifikasi:
Record apex sebelum cutover:
Record www sebelum cutover:
Proxy status apex/www sebelum cutover:
TTL sebelum cutover:
Target pointer sebelum activate:
Release ID hasil prepare:
Release ID hasil activate:
Waktu DNS diubah:
Waktu smoke selesai:
Keputusan akhir: GO / ROLLBACK
```

Release ID berbentuk:

```text
<40-karakter-git-sha>-<github-run-id>-<run-attempt>
```

Jangan mencatat hanya short SHA karena satu commit dapat mempunyai beberapa
snapshot konten CMS yang berbeda.

## 5. Gate T-24 jam

Semua item berikut harus selesai sebelum window:

- [ ] Branch `master` bersih dan commit target sudah disetujui.
- [ ] Workflow staging terakhir hijau dan staging tetap `Disallow: /`.
- [ ] Login, public tracking, dan portal mitra diuji dengan akun yang sesuai.
- [ ] Akses SSH DomaiNesia berhasil dengan key operator.
- [ ] Akses Cloudflare zone `awankusuma.com` tersedia.
- [ ] Akses GitHub Settings dan Actions tersedia.
- [ ] GitHub Environment `production` dan enam secret sudah dibuat.
- [ ] Fingerprint SSH diverifikasi dari sumber tepercaya.
- [ ] Record apex dan `www` lama disalin persis untuk rollback.
- [ ] Vercel deployment terakhir sehat dan tidak dihapus.
- [ ] Origin certificate mencakup `awankusuma.com` dan `www.awankusuma.com`.
- [ ] Cloudflare SSL/TLS bukan `Flexible`; gunakan `Full (strict)` bila origin
      certificate valid.
- [ ] Pemilik konten menyetujui freeze publish selama window.
- [ ] Kontak pengambil keputusan rollback tersedia.

Jika DNS record memakai proxy Cloudflare, TTL biasanya `Auto`. Jangan mematikan
proxy hanya untuk menurunkan TTL tanpa memahami dampaknya. Snapshot nilai record
di dashboard Cloudflare tetap menjadi sumber rollback, bukan hasil resolver
publik semata.

## 6. Membuat GitHub Environment production

Di repository GitHub:

1. Buka **Settings → Environments → New environment**.
2. Gunakan nama persis `production`.
3. Selama cutover dan stabilisasi 24 jam, aktifkan **Required reviewers**.
4. Batasi deployment branch ke `master`.
5. Tambahkan environment secrets berikut:

| Secret | Isi |
| --- | --- |
| `PRODUCTION_SSH_HOST` | Host SSH DomaiNesia yang sudah diverifikasi |
| `PRODUCTION_SSH_PORT` | Port SSH; lingkungan saat ini memakai `64000` |
| `PRODUCTION_SSH_USER` | User hosting; lingkungan saat ini memakai `ryuumeco` |
| `PRODUCTION_SSH_PRIVATE_KEY` | Private key deployment khusus production |
| `PRODUCTION_SSH_KNOWN_HOSTS` | Seluruh baris host key yang fingerprint-nya sudah diverifikasi |
| `PRODUCTION_ORIGIN_IP` | IP origin DomaiNesia yang diuji langsung |

Jangan memakai IP hasil tebakan. Pada 5 Agustus 2026 staging resolve ke
`36.50.77.59`; cocokkan dengan cPanel/DomaiNesia dan hasil origin test sebelum
menyimpannya sebagai secret.

### 6.1 Membuat key deployment khusus

Jalankan di workstation tepercaya, bukan di shared hosting:

```bash
ssh-keygen -t ed25519 \
  -C 'github-actions-astro-production-20260805' \
  -f ~/.ssh/awankusuma_production_deploy \
  -N ''

ssh-keygen -lf ~/.ssh/awankusuma_production_deploy.pub
```

Simpan private key ke `PRODUCTION_SSH_PRIVATE_KEY`. Hanya public key `.pub` yang
boleh ditambahkan ke `/home/ryuumeco/.ssh/authorized_keys`.

Di server, pastikan permission:

```bash
chmod 700 /home/ryuumeco/.ssh
chmod 600 /home/ryuumeco/.ssh/authorized_keys
```

Jangan menimpa `authorized_keys`; tambahkan satu baris public key production dan
pertahankan key operasional yang sudah ada.

### 6.2 Memverifikasi host key

Bandingkan fingerprint ED25519/RSA/ECDSA dengan cPanel atau konfirmasi provider.
`ssh-keyscan` boleh dipakai untuk mengambil baris, tetapi hasilnya tidak boleh
dipercaya sebelum fingerprint dibandingkan melalui kanal lain.

Setelah cocok, isi `PRODUCTION_SSH_KNOWN_HOSTS` dengan baris host key lengkap.
Workflow memakai `StrictHostKeyChecking=yes` dan akan gagal aman bila host key
berubah.

### 6.3 Uji environment tanpa aktivasi

Jangan memilih mode `activate` untuk tes awal. Mode `prepare` sudah cukup untuk
menguji secret, SSH, checksum, struktur artifact, dan permission server tanpa
mengubah pointer production.

## 7. Snapshot Cloudflare dan rollback DNS

Sebelum mengubah apa pun, buka **Cloudflare → DNS → Records** dan catat:

- type, name, content/target, proxy status, dan TTL untuk apex `@`;
- type, name, content/target, proxy status, dan TTL untuk `www`;
- setiap Redirect Rule/Page Rule yang menyentuh apex atau `www`;
- mode SSL/TLS;
- apakah cache rule meng-cache HTML.

Resolusi publik yang terlihat pada 5 Agustus 2026 adalah:

```text
awankusuma.com       -> 216.198.79.1
www.awankusuma.com   -> 64.29.17.1
staging.awankusuma.com -> 36.50.77.59
```

Angka tersebut hanya snapshot observasi. Untuk rollback, gunakan nilai persis
yang tersimpan di dashboard Cloudflare pada saat cutover.

Jangan mengubah record berikut:

- `cms.awankusuma.com`;
- `staging.awankusuma.com`;
- MX, SPF, DKIM, DMARC, atau record email lain;
- record CDN/R2.

Rencana DNS target:

- apex `@`: A ke IP origin DomaiNesia yang telah diverifikasi;
- `www`: CNAME ke `awankusuma.com`, atau record setara yang disetujui Cloudflare;
- pertahankan proxy status yang dipilih untuk production;
- origin juga mempunyai redirect 301 `www` ke apex untuk menjaga canonical tunggal.

## 8. Menjalankan workflow production mode prepare

1. Buka **Actions → Astro production release → Run workflow**.
2. Pilih branch `master`.
3. Pilih `deployment_mode: prepare`.
4. Isi konfirmasi persis `awankusuma.com`.
5. Jalankan dan setujui gate Environment `production`.

Workflow harus melakukan:

```text
npm ci
-> 81+ unit test
-> astro check
-> build production (indexable + analytics aktif)
-> optimasi media CMS
-> validator static
-> artifact + SHA-256
-> upload SSH
-> extract immutable production release
-> PRODUCTION_PREPARE_OK
```

Mode `prepare` tidak boleh membuat atau mengubah
`/home/ryuumeco/frontend-current`.

### 8.1 Verifikasi release hasil prepare via SSH

Ambil release ID dari log Actions, lalu jalankan dengan nilai eksplisit:

```bash
release_id='<RELEASE_ID_DARI_ACTIONS>'
release_dir="/home/ryuumeco/frontend-production-releases/$release_id"

test -d "$release_dir"
test -f "$release_dir/index.html"
test -f "$release_dir/.htaccess"
test -f "$release_dir/robots.txt"
test -d "$release_dir/_astro"
grep -F 'Allow: /' "$release_dir/robots.txt"
grep -F 'Sitemap: https://awankusuma.com/sitemap-index.xml' \
  "$release_dir/robots.txt"
! grep -Fx 'Disallow: /' "$release_dir/robots.txt"
grep -F 'content="index, follow"' "$release_dir/index.html"
tail -n 5 /home/ryuumeco/frontend-shared/logs/production-deploy.log
```

Gate GO:

- Actions hijau;
- log berakhir `PRODUCTION_PREPARE_OK`;
- semua command di atas sukses;
- `frontend-current` belum berubah.

## 9. Bootstrap document root production

Lakukan hanya ketika DNS publik masih menuju Vercel. Tujuannya mengubah document
root menjadi dua symlink stabil tanpa menghapus isi origin lama. Directory lama
dipindah sebagai bootstrap rollback.

### 9.1 Preflight wajib

```bash
cd /home/ryuumeco

pwd
test -d /home/ryuumeco/awankusuma.com
test ! -L /home/ryuumeco/awankusuma.com
test ! -e /home/ryuumeco/frontend-current
test ! -L /home/ryuumeco/frontend-current

du -sh /home/ryuumeco/awankusuma.com
find /home/ryuumeco/awankusuma.com -maxdepth 1 -mindepth 1 -print
```

Jika salah satu `test` gagal, berhenti. Jangan menimpa symlink/directory yang sudah
ada. Audit dengan `readlink` dan sesuaikan runbook berdasarkan keadaan nyata.

### 9.2 Konversi recoverable

```bash
cd /home/ryuumeco

cutover_stamp="$(date -u +'%Y%m%dT%H%M%SZ')"
backup_root='/home/ryuumeco/frontend-origin-backups'
old_docroot='/home/ryuumeco/awankusuma.com'
stable_pointer='/home/ryuumeco/frontend-current'
backup_dir="$backup_root/awankusuma.com-$cutover_stamp"

mkdir -p -- "$backup_root"
test ! -e "$backup_dir"
test ! -L "$backup_dir"
test ! -e "$stable_pointer"
test ! -L "$stable_pointer"

mv -- "$old_docroot" "$backup_dir"
ln -s -- "$backup_dir" "$stable_pointer"
ln -s -- "$stable_pointer" "$old_docroot"

test -L "$old_docroot"
test "$(readlink -- "$old_docroot")" = "$stable_pointer"
test -L "$stable_pointer"
test "$(readlink -- "$stable_pointer")" = "$backup_dir"
```

Simpan nilai `backup_dir` sebagai **target pointer sebelum activate**. Jangan
menghapus backup ini selama Vercel masih menjadi jalur rollback.

### 9.3 Uji bootstrap origin

Gunakan IP yang sama dengan `PRODUCTION_ORIGIN_IP`:

```bash
origin_ip='<IP_ORIGIN_TERVERIFIKASI>'

curl --fail --silent --show-error --location --max-time 30 \
  --resolve "awankusuma.com:443:$origin_ip" \
  https://awankusuma.com/ >/dev/null
```

Isi yang terlihat pada tahap ini boleh masih berupa halaman bootstrap origin.
Yang wajib adalah TLS dan virtual host origin bekerja sebelum Astro diaktifkan.

## 10. Menjalankan workflow mode activate

1. Pastikan freeze masih aktif dan DNS masih menuju Vercel.
2. Buka workflow **Astro production release**.
3. Pilih branch `master`.
4. Pilih `deployment_mode: activate`.
5. Isi `awankusuma.com`.
6. Jalankan dan minta verifier menyetujui Environment `production`.

Workflow membangun snapshot production baru, bukan mempromosikan artifact
staging. Setelah semua gate lulus, workflow:

1. mengganti `/home/ryuumeco/frontend-current` secara atomic;
2. menguji Home langsung ke origin dengan `curl --resolve`;
3. memeriksa metadata `index, follow`;
4. memeriksa sitemap pada robots;
5. menolak `Disallow: /`;
6. mengembalikan pointer lama otomatis bila health check gagal;
7. menyimpan sedikitnya lima production release.

Gate GO hanya bila log berakhir:

```text
PRODUCTION_ACTIVATE_OK <release-id>
```

Catat release ID dan hasil:

```bash
readlink /home/ryuumeco/frontend-current
readlink -f /home/ryuumeco/frontend-current
tail -n 10 /home/ryuumeco/frontend-shared/logs/production-deploy.log
```

## 11. Smoke test langsung ke origin sebelum DNS

Set variabel lokal:

```bash
origin_ip='<IP_ORIGIN_TERVERIFIKASI>'
origin_resolve="awankusuma.com:443:$origin_ip"
```

### 11.1 Status route utama

```bash
for path in \
  / \
  /en/ \
  /zh/ \
  /tentang-kami \
  /layanan \
  /kontak \
  /info-bisnis \
  /login \
  /lacak \
  /mitra \
  /robots.txt \
  /sitemap-index.xml
do
  curl --silent --show-error --output /dev/null \
    --write-out '%{http_code} %{url_effective}\n' \
    --max-time 30 \
    --resolve "$origin_resolve" \
    "https://awankusuma.com$path"
done
```

Semua route di atas harus 200. Uji satu artikel dan satu detail layanan dari
sitemap saat itu; jangan mengunci slug yang dapat berubah karena CMS.

### 11.2 Robots, canonical, sitemap, dan analytics

```bash
curl --fail --silent --show-error --max-time 30 \
  --resolve "$origin_resolve" \
  https://awankusuma.com/robots.txt

curl --fail --silent --show-error --max-time 30 \
  --resolve "$origin_resolve" \
  https://awankusuma.com/ \
  | grep -E 'content="index, follow"|rel="canonical"|hreflang=|googletagmanager'

curl --fail --silent --show-error --max-time 30 \
  --resolve "$origin_resolve" \
  https://awankusuma.com/sitemap-index.xml \
  | grep -F 'https://awankusuma.com/'
```

Wajib:

- tidak ada baris persis `Disallow: /`;
- robots menunjuk `https://awankusuma.com/sitemap-index.xml`;
- canonical memakai apex HTTPS;
- hreflang ID/EN/ZH/x-default tersedia sesuai locale yang dipublikasikan;
- `/login`, `/lacak`, `/mitra`, `/faq`, dan `/404` tidak masuk sitemap;
- production menyertakan loader analytics, tetapi route privat tetap noindex.

### 11.3 Header dan branded 404

```bash
curl --silent --show-error --head --max-time 30 \
  --resolve "$origin_resolve" \
  https://awankusuma.com/

curl --silent --show-error --output /dev/null \
  --write-out '%{http_code}\n' --max-time 30 \
  --resolve "$origin_resolve" \
  https://awankusuma.com/__cutover-404-test__
```

Wajib terlihat:

- 404 untuk URL acak dengan halaman branded;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- HSTS;
- referrer policy dan permissions policy;
- HTML `must-revalidate`;
- asset hashed mempunyai cache panjang.

### 11.4 Redirect wajib

```bash
for path in \
  /about-us \
  /tracking \
  /blogPost/123 \
  /auth/test \
  /layanan/123 \
  /privacy \
  /faq \
  '/info-bisnis?page=2' \
  /mitra/orders/TEST-CODE
do
  curl --silent --show-error --head --max-time 30 \
    --resolve "$origin_resolve" \
    "https://awankusuma.com$path" \
    | sed -n '1p;/^location:/Ip'
done
```

Redirect legacy harus 301. `/mitra/orders/<code>` sengaja 302. Uji juga host
`www` bila certificate telah tersedia:

```bash
curl --silent --show-error --head --max-time 30 \
  --resolve "www.awankusuma.com:443:$origin_ip" \
  https://www.awankusuma.com/kontak \
  | sed -n '1p;/^location:/Ip'
```

Target wajib `https://awankusuma.com/kontak` dengan 301.

### 11.5 Browser smoke origin

Karena browser biasa tidak mudah memakai `--resolve`, gunakan file hosts hanya
pada perangkat tester atau fitur local override yang setara. Jangan mengubah DNS
publik dulu.

Uji desktop dan mobile:

- Home ID/EN/ZH: preloader, hero poster/video, navbar, menu mobile, locale;
- katalog dan detail layanan;
- listing, kategori, pagination, dan detail artikel;
- Kontak dan WhatsApp submission;
- login guest, notaris/staf, dan admin;
- public tracking dengan kode valid dan tidak valid;
- Mitra: filter, detail, checklist/stage, dokumen, assignment staf;
- state 401/403/404/429/5xx/network;
- tidak ada broken image, console error, atau browser GET CMS pada halaman static;
- analytics hanya muncul pada production artifact;
- tools yang belum parity tetap maintenance/noindex.

Jika smoke origin gagal, jangan mengubah DNS. Jalankan rollback pointer pada
bagian 14 atau perbaiki source dan ulangi `prepare`/`activate`.

## 12. Cutover DNS Cloudflare

Lanjut hanya bila seluruh smoke origin lulus dan verifier memberi keputusan GO.

1. Buka Cloudflare DNS.
2. Ubah hanya apex `@` ke IP origin terverifikasi.
3. Ubah `www` menjadi CNAME ke `awankusuma.com` atau konfigurasi setara.
4. Pertahankan proxy status yang telah diputuskan.
5. Pastikan SSL/TLS `Full (strict)`.
6. Simpan perubahan dan catat waktu WIB.
7. Purge cache HTML lama. Bila tidak ada cache tag/rule granular yang pasti,
   gunakan purge zone dengan sadar bahwa asset akan cold-cache sementara.
8. Jangan mengubah record CMS, staging, email, atau R2.

Pantau resolver dan response publik:

```bash
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  date -u +'%Y-%m-%dT%H:%M:%SZ'
  getent ahostsv4 awankusuma.com | awk 'NR==1 {print $1}'
  curl --silent --show-error --head --max-time 30 \
    https://awankusuma.com/ \
    | sed -n '1p;/^server:/Ip;/^cf-cache-status:/Ip'
  sleep 30
done
```

Jangan memakai hasil resolver saja sebagai bukti. HTML, header, dan release
behavior harus menunjukkan Astro/DomaiNesia.

## 13. Smoke production publik

Ulangi checklist origin tanpa `--resolve` dari:

- desktop jaringan kantor/rumah;
- perangkat mobile jaringan seluler Indonesia;
- bila tersedia, jaringan/provider kedua.

Minimum command-line gate:

```bash
for url in \
  https://awankusuma.com/ \
  https://awankusuma.com/en/ \
  https://awankusuma.com/zh/ \
  https://awankusuma.com/layanan \
  https://awankusuma.com/info-bisnis \
  https://awankusuma.com/kontak \
  https://awankusuma.com/login \
  https://awankusuma.com/lacak \
  https://awankusuma.com/mitra \
  https://awankusuma.com/robots.txt \
  https://awankusuma.com/sitemap-index.xml
do
  curl --silent --show-error --location --output /dev/null \
    --write-out '%{http_code} %{time_total} %{url_effective}\n' \
    --max-time 30 "$url"
done
```

Periksa Cloudflare cache tanpa mengharuskan HTML menjadi cache HIT. HTML memang
memakai `must-revalidate`; asset hashed seharusnya mempunyai cache panjang.

Kriteria GO akhir:

- [ ] Semua route utama 200 dan branded 404 benar.
- [ ] Redirect lama benar tanpa loop atau dua-hop yang tidak perlu.
- [ ] `robots.txt` production indexable dan sitemap benar.
- [ ] Canonical/hreflang tetap apex HTTPS.
- [ ] Login, tracking, dan portal mitra dapat digunakan.
- [ ] Tidak ada lonjakan 401/403/429/5xx yang tidak dijelaskan.
- [ ] Tidak ada broken asset atau mixed content.
- [ ] Analytics Realtime menerima kunjungan tester.
- [ ] Cloudflare dan DomaiNesia tidak menunjukkan resource fault.
- [ ] Verifier memberi keputusan GO.

Setelah GO, cabut freeze push frontend. Freeze konten dapat dicabut setelah
trigger CMS pada bagian 15 siap atau ada prosedur build manual yang disepakati.

## 14. Rollback

### 14.1 Workflow activate gagal sebelum DNS

Tidak perlu mengubah DNS. Script otomatis mengembalikan
`frontend-current` ke target sebelumnya. Verifikasi:

```bash
readlink /home/ryuumeco/frontend-current
tail -n 20 /home/ryuumeco/frontend-shared/logs/production-deploy.log
```

Perbaiki penyebabnya, buat release baru, lalu ulangi. Jangan memakai release yang
gagal sebagai target manual.

### 14.2 Smoke origin gagal setelah workflow sukses

Gunakan target pointer lama yang dicatat pada bagian 4:

```bash
rollback_target='<TARGET_POINTER_SEBELUM_ACTIVATE>'
stable_pointer='/home/ryuumeco/frontend-current'
rollback_link="/home/ryuumeco/.frontend-current.rollback.$(date -u +%Y%m%dT%H%M%SZ)"

test -d "$rollback_target"
test -L "$stable_pointer"
test ! -e "$rollback_link"
test ! -L "$rollback_link"

ln -s -- "$rollback_target" "$rollback_link"
mv -Tf -- "$rollback_link" "$stable_pointer"
readlink "$stable_pointer"
```

Ulangi health check origin. DNS publik masih Vercel sehingga pengguna tidak
terdampak.

### 14.3 Masalah aplikasi Astro setelah DNS cutover

Jika origin sehat tetapi release terbaru rusak, arahkan pointer ke production
release sehat sebelumnya secara atomic dengan pola yang sama. Gunakan path penuh:

```text
/home/ryuumeco/frontend-production-releases/<release-id-sehat>
```

Setelah switch, purge HTML Cloudflare dan ulangi smoke publik.

### 14.4 Origin/shared hosting bermasalah

Segera pulihkan record apex dan `www` ke snapshot Vercel dari bagian 7, termasuk
proxy status dan TTL lama. Purge HTML cache Cloudflare lalu verifikasi bahwa
halaman Next kembali.

Rollback DNS dipilih segera bila:

- route penting menghasilkan 5xx/404 secara luas;
- login, tracking, atau portal tidak dapat digunakan;
- asset utama gagal dimuat secara luas;
- origin timeout/resource fault;
- production seluruhnya noindex atau canonical salah;
- tidak ada perbaikan/pointer rollback yang aman dalam window keputusan.

Backend, database, Redis, dan media tidak berubah, sehingga rollback frontend
tidak membutuhkan rollback database.

### 14.5 Menonaktifkan trigger CMS saat insiden

Di `/home/ryuumeco/backend-shared/.env`:

```dotenv
FRONTEND_BUILD_DISPATCH_ENABLED=false
```

Kemudian dari backend core aktif:

```bash
php artisan optimize:clear
php artisan optimize
```

Jangan menghapus pending state secara manual dan jangan menonaktifkan revalidasi
Next selama jalur rollback Vercel masih dipertahankan.

## 15. Mengaktifkan build trigger CMS

Lakukan setelah Astro aktif dan smoke production lulus. Selama 24 jam pertama,
pertahankan required reviewer agar setiap auto-deploy CMS masih membutuhkan
persetujuan manusia.

### 15.1 Membuat token GitHub

Buat fine-grained token yang:

- hanya memiliki akses ke `awankusumawebsite/AwanWeb-FrontStaging`;
- mempunyai permission minimum yang dibutuhkan endpoint repository dispatch,
  saat ini **Contents: Read and write**;
- memiliki expiry dan owner yang jelas;
- disimpan hanya pada backend shared `.env`.

Konfigurasi:

```dotenv
FRONTEND_BUILD_DISPATCH_ENABLED=true
FRONTEND_BUILD_DISPATCH_URL=https://api.github.com/repos/awankusumawebsite/AwanWeb-FrontStaging/dispatches
FRONTEND_BUILD_DISPATCH_TOKEN=<SECRET_GITHUB>
FRONTEND_BUILD_EVENT_TYPE=cms-content-changed
FRONTEND_BUILD_DEBOUNCE_SECONDS=120
FRONTEND_BUILD_MAX_DELAY_SECONDS=900
FRONTEND_BUILD_TIMEOUT_SECONDS=8
```

Jangan menempelkan token asli ke terminal command yang tersimpan di history.
Edit `/home/ryuumeco/backend-shared/.env` dengan editor server yang aman.

Muat ulang konfigurasi:

```bash
cd /home/ryuumeco/backend-core
php artisan optimize:clear
php artisan optimize
php artisan schedule:list | grep -F 'frontend:dispatch-pending-build'
```

### 15.2 Acceptance trigger

1. Publikasikan satu perubahan konten terkontrol.
2. Pastikan Save CMS tetap sukses tanpa menunggu GitHub.
3. Tunggu debounce 120 detik dan scheduler berikutnya.
4. Pastikan hanya satu workflow **Astro production release** dibuat.
5. Setujui Environment production selama masa stabilisasi.
6. Pastikan release ID baru aktif dan konten baru muncul.
7. Pastikan Next revalidation lama tetap tidak dihapus.

Event selama build aktif harus menjadi maksimal satu run pending terbaru. Build
gagal tidak boleh mengubah pointer aktif. Jika GitHub gagal, pending state harus
tetap tersedia untuk retry scheduler berikutnya.

Setelah stabilisasi 24 jam ditandatangani, required reviewer dapat dilepas agar
publish CMS benar-benar otomatis. Pertahankan branch restriction `master` dan
seluruh environment secrets.

## 16. Monitoring 24 jam

Gunakan interval berikut:

| Waktu | Pemeriksaan |
| --- | --- |
| 0–30 menit | Route utama, login/tracking/mitra, 404/5xx, broken asset, DNS |
| 1 jam | Cloudflare cache/bandwidth, Apache errors, Laravel errors, analytics |
| 4 jam | CPU, Entry Process, I/O, faults, CMS response time, build trigger |
| 12 jam | Mobile/desktop real traffic, top 404, canonical/robots, publish CMS |
| 24 jam | Review lengkap dan keputusan keluar dari stabilisasi |

Pantau:

- cPanel/DomaiNesia CPU, Entry Process, memory, I/O, dan faults;
- Apache/LiteSpeed error log dan volume branded 404;
- Laravel 401/403/429/5xx serta waktu response;
- Cloudflare bandwidth, cache status, origin errors, dan TLS;
- Analytics Realtime dan Meta Pixel hanya pada production;
- Core Web Vitals per template penting;
- status workflow CMS dan release log;
- Search Console untuk robots/canonical secara tertunda, bukan sinyal real-time.

Jangan melakukan load test agresif ke shared hosting. Gunakan traffic nyata dan
smoke bounded.

## 17. Penutupan migrasi

Setelah minimal 24 jam stabil:

- [ ] Pemilik dan verifier menandatangani stabilisasi.
- [ ] Trigger CMS berhasil sedikitnya satu kali end-to-end.
- [ ] Tidak ada error kritis atau resource fault.
- [ ] Analytics dan SEO production benar.
- [ ] Backup document root dan lima release terakhir tersedia.
- [ ] Prosedur rollback sudah tersimpan dan dapat diakses operator.

Pertahankan Vercel dan konfigurasi Next sedikitnya tujuh hari atau sesuai window
rollback bisnis. Setelah window tersebut, buat pekerjaan terpisah untuk:

- menonaktifkan deployment Next;
- menghapus domain dari Vercel;
- menghapus `NEXTJS_REVALIDATE_*` dari backend;
- mencabut credential lama;
- mengarsipkan snapshot DNS dan laporan cutover.

Jangan melakukan pekerjaan pensiun tersebut dalam window cutover yang sama.

## 18. Ringkasan keputusan cepat

```text
PREPARE gagal
  -> jangan ubah document root/DNS

ACTIVATE gagal
  -> pointer rollback otomatis; DNS tetap Vercel

ORIGIN smoke gagal
  -> rollback pointer; jangan ubah DNS

PUBLIC smoke gagal, origin sehat
  -> rollback release atau pulihkan DNS sesuai luas dampak

ORIGIN/shared hosting gagal
  -> pulihkan apex + www ke snapshot Vercel

CMS trigger gagal
  -> nonaktifkan flag; release aktif tetap melayani traffic
```
